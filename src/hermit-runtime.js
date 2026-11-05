const DEFAULT_MAX_TASK_LENGTH = 4_096;
const DEFAULT_MAX_OUTPUT_BYTES = 16_384;

export class HermitError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "HermitError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function byteLength(value) {
  return new TextEncoder().encode(value).length;
}

function assertInputSchema(schema, path = "$", depth = 0, budget = { nodes: 0 }) {
  budget.nodes += 1;
  if (depth > 16 || budget.nodes > 256) {
    throw new HermitError("INVALID_CAPABILITY_SCHEMA", "Capability schema exceeds its structural limits.");
  }
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    throw new HermitError("INVALID_CAPABILITY_SCHEMA", "Capability input schema must be an object.");
  }
  if (schema.type === "object") {
    const properties = schema.properties ?? {};
    if (typeof properties !== "object" || Array.isArray(properties) || Object.keys(properties).length > 64) {
      throw new HermitError("INVALID_CAPABILITY_SCHEMA", `Invalid or excessive properties at ${path}.`);
    }
    const required = schema.required ?? [];
    if (!Array.isArray(required) || new Set(required).size !== required.length || required.some(key => typeof key !== "string" || !Object.hasOwn(properties, key))) {
      throw new HermitError("INVALID_CAPABILITY_SCHEMA", `Invalid required fields at ${path}.`);
    }
    for (const [key, child] of Object.entries(properties)) assertInputSchema(child, `${path}.${key}`, depth + 1, budget);
    return;
  }
  if (schema.type === "string") {
    if (schema.maxLength !== undefined && (!Number.isInteger(schema.maxLength) || schema.maxLength < 0)) {
      throw new HermitError("INVALID_CAPABILITY_SCHEMA", `Invalid maxLength at ${path}.`);
    }
    return;
  }
  if (schema.type === "number" || schema.type === "boolean") return;
  throw new HermitError("INVALID_CAPABILITY_SCHEMA", `Unsupported schema type at ${path}.`);
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function validateSchema(value, schema, path = "$") {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    throw new HermitError("INVALID_CAPABILITY_SCHEMA", "Capability input schema must be an object.");
  }

  if (schema.type === "object") {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new HermitError("INVALID_ARGUMENTS", `${path} must be an object.`);
    }
    const properties = schema.properties ?? {};
    const allowed = new Set(Object.keys(properties));
    for (const key of Object.keys(value)) {
      if (!allowed.has(key)) {
        throw new HermitError("INVALID_ARGUMENTS", `Unexpected argument: ${path}.${key}`);
      }
    }
    for (const key of schema.required ?? []) {
      if (!Object.hasOwn(value, key)) {
        throw new HermitError("INVALID_ARGUMENTS", `Missing required argument: ${path}.${key}`);
      }
    }
    for (const [key, childSchema] of Object.entries(properties)) {
      if (Object.hasOwn(value, key)) validateSchema(value[key], childSchema, `${path}.${key}`);
    }
    return;
  }

  if (schema.type === "string") {
    if (typeof value !== "string" || (schema.maxLength !== undefined && value.length > schema.maxLength)) {
      throw new HermitError("INVALID_ARGUMENTS", `${path} must be a string within its length limit.`);
    }
    return;
  }
  if (schema.type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new HermitError("INVALID_ARGUMENTS", `${path} must be a finite number.`);
    }
    return;
  }
  if (schema.type === "boolean") {
    if (typeof value !== "boolean") throw new HermitError("INVALID_ARGUMENTS", `${path} must be a boolean.`);
    return;
  }
  throw new HermitError("INVALID_CAPABILITY_SCHEMA", `Unsupported schema type at ${path}.`);
}

export class CapabilityRegistry {
  #capabilities = new Map();

  register(descriptor) {
    const { id, version, inputSchema, invoke, maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES } = descriptor ?? {};
    if (typeof id !== "string" || !/^[a-z][a-z0-9-]{1,63}$/.test(id)) {
      throw new HermitError("INVALID_CAPABILITY_ID", "Capability id must be a stable lowercase identifier.");
    }
    if (typeof version !== "string" || version.length === 0 || version.length > 32) {
      throw new HermitError("INVALID_CAPABILITY_VERSION", "Capability version is required and bounded.");
    }
    if (typeof invoke !== "function") {
      throw new HermitError("INVALID_CAPABILITY_ADAPTER", "Capability requires a registered invocation adapter.");
    }
    if (!Number.isInteger(maxOutputBytes) || maxOutputBytes < 1 || maxOutputBytes > DEFAULT_MAX_OUTPUT_BYTES) {
      throw new HermitError("INVALID_OUTPUT_LIMIT", "Capability output limit must be between 1 and 16384 bytes.");
    }
    const stableSchema = structuredClone(inputSchema);
    assertInputSchema(stableSchema);
    if (this.#capabilities.has(id)) {
      throw new HermitError("DUPLICATE_CAPABILITY", `Capability identity is already registered: ${id}.`, { id });
    }
    const capability = Object.freeze({
      id, version, inputSchema: deepFreeze(stableSchema),
      risk: descriptor.risk ?? "read-only",
      approvalRequired: descriptor.approvalRequired === true,
      maxOutputBytes, invoke
    });
    this.#capabilities.set(id, capability);
    return capability;
  }

  resolve(id) {
    return this.#capabilities.get(id);
  }

  list() {
    return [...this.#capabilities.values()].map(({ id, version, risk, approvalRequired }) =>
      Object.freeze({ id, version, risk, approvalRequired }));
  }
}

function raceWithSignal(operation, signal) {
  if (signal.aborted) return Promise.reject(signal.reason ?? new HermitError("CANCELLED", "Task cancelled."));
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(signal.reason ?? new HermitError("CANCELLED", "Task cancelled."));
    signal.addEventListener("abort", onAbort, { once: true });
    Promise.resolve().then(operation).then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

export class HermitRuntime {
  constructor({ registry, policy, maxTaskLength = DEFAULT_MAX_TASK_LENGTH } = {}) {
    if (!(registry instanceof CapabilityRegistry)) throw new TypeError("A CapabilityRegistry is required.");
    if (typeof policy !== "function") throw new TypeError("A host policy function is required.");
    if (!Number.isInteger(maxTaskLength) || maxTaskLength < 1 || maxTaskLength > DEFAULT_MAX_TASK_LENGTH) {
      throw new TypeError("maxTaskLength must be between 1 and 4096.");
    }
    this.registry = registry;
    this.policy = policy;
    this.maxTaskLength = maxTaskLength;
  }

  async execute({ task, planner, signal, timeoutMs = 5_000, approvalGranted = false } = {}) {
    const trace = [];
    const record = (event, details = {}) => trace.push(Object.freeze({ event, at: new Date().toISOString(), ...details }));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new HermitError("TIMEOUT", "Task exceeded its execution time limit.")), timeoutMs);
    const onCallerAbort = () => controller.abort(new HermitError("CANCELLED", "Task cancelled."));
    if (signal) {
      if (signal.aborted) onCallerAbort();
      else signal.addEventListener("abort", onCallerAbort, { once: true });
    }
    const executionSignal = controller.signal;

    try {
      if (typeof task !== "string" || task.length === 0 || task.length > this.maxTaskLength) {
        throw new HermitError("INVALID_TASK", "Task must be a non-empty bounded string.");
      }
      if (typeof planner !== "function") throw new HermitError("INVALID_PLANNER", "A planner function is required.");
      if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) {
        throw new HermitError("INVALID_TIMEOUT", "timeoutMs must be between 1 and 30000.");
      }
      record("task-created");
      record("planning-started");
      const proposal = await raceWithSignal(() => planner({ task, signal: executionSignal }), executionSignal);
      if (!proposal || typeof proposal !== "object" || typeof proposal.capabilityId !== "string") {
        throw new HermitError("INVALID_PROPOSAL", "Planner must return a capabilityId and structured arguments.");
      }
      record("proposal-received", { capabilityId: proposal.capabilityId });
      const capability = this.registry.resolve(proposal.capabilityId);
      if (!capability) throw new HermitError("UNKNOWN_CAPABILITY", "Proposed capability is not registered.", { capabilityId: proposal.capabilityId });
      validateSchema(proposal.arguments, capability.inputSchema);
      record("arguments-validated", { capabilityId: capability.id, version: capability.version });

      const decision = await raceWithSignal(
        () => this.policy({ task, capability: { id: capability.id, version: capability.version, risk: capability.risk }, arguments: structuredClone(proposal.arguments) }),
        executionSignal
      );
      if (!["allow", "deny", "approval-required"].includes(decision)) {
        throw new HermitError("INVALID_POLICY_DECISION", "Host policy returned an unsupported decision.");
      }
      record("policy-evaluated", { capabilityId: capability.id, decision });
      if (decision === "deny") throw new HermitError("POLICY_DENIED", "Host policy denied this capability.");
      if ((decision === "approval-required" || capability.approvalRequired) && approvalGranted !== true) {
        throw new HermitError("APPROVAL_REQUIRED", "Host approval is required before this capability can execute.");
      }

      record("execution-started", { capabilityId: capability.id, version: capability.version });
      const result = await raceWithSignal(
        () => capability.invoke(structuredClone(proposal.arguments), { signal: executionSignal }),
        executionSignal
      );
      let serialized;
      try {
        serialized = JSON.stringify(result);
      } catch {
        throw new HermitError("INVALID_TOOL_OUTPUT", "Capability output must be JSON-serializable.");
      }
      if (serialized === undefined) throw new HermitError("INVALID_TOOL_OUTPUT", "Capability output must be JSON-serializable.");
      if (byteLength(serialized) > capability.maxOutputBytes) {
        throw new HermitError("OUTPUT_TOO_LARGE", "Capability output exceeded its registered size limit.");
      }
      record("execution-completed", { capabilityId: capability.id, version: capability.version });
      return Object.freeze({
        status: "completed",
        result: JSON.parse(serialized),
        trace: Object.freeze(trace),
      });
    } catch (error) {
      const normalized = error instanceof HermitError
        ? error
        : executionSignal.aborted && executionSignal.reason instanceof HermitError
          ? executionSignal.reason
          : new HermitError("ADAPTER_FAILED", "Capability or planner execution failed.");
      record("task-failed", { code: normalized.code });
      return Object.freeze({
        status: normalized.code === "CANCELLED" ? "cancelled" : "failed",
        error: Object.freeze({ code: normalized.code, message: normalized.message }),
        trace: Object.freeze(trace),
      });
    } finally {
      clearTimeout(timeout);
      if (signal) signal.removeEventListener("abort", onCallerAbort);
    }
  }
}
