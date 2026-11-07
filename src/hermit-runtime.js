const DEFAULT_MAX_TASK_LENGTH = 4_096;
const DEFAULT_MAX_OUTPUT_BYTES = 16_384;
const DEFAULT_MAX_ARGUMENT_BYTES = 16_384;

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
    if (!Number.isInteger(schema.maxLength) || schema.maxLength < 0 || schema.maxLength > DEFAULT_MAX_TASK_LENGTH) {
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

function snapshotArguments(value, schema, path = "$", ancestors = new WeakSet()) {
  if (schema.type === "object") {
    if (value === null || typeof value !== "object" || Array.isArray(value) ||
        ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
      throw new HermitError("INVALID_ARGUMENTS", `${path} must be a plain object.`);
    }
    if (ancestors.has(value)) throw new HermitError("INVALID_ARGUMENTS", "Capability arguments must not contain cycles.");
    ancestors.add(value);
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some(key => typeof key !== "string")) {
      throw new HermitError("INVALID_ARGUMENTS", "Capability arguments must not contain symbol properties.");
    }
    const properties = schema.properties ?? {};
    const allowed = new Set(Object.keys(properties));
    const snapshot = Object.create(null);
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
        throw new HermitError("INVALID_ARGUMENTS", "Capability arguments must contain enumerable data properties only.");
      }
      if (!allowed.has(key)) throw new HermitError("INVALID_ARGUMENTS", `Unexpected argument: ${path}.${key}`);
      snapshot[key] = snapshotArguments(descriptor.value, properties[key], `${path}.${key}`, ancestors);
    }
    for (const key of schema.required ?? []) {
      if (!Object.hasOwn(snapshot, key)) throw new HermitError("INVALID_ARGUMENTS", `Missing required argument: ${path}.${key}`);
    }
    ancestors.delete(value);
    return snapshot;
  }
  if (schema.type === "string") {
    if (typeof value !== "string" || value.length > schema.maxLength) {
      throw new HermitError("INVALID_ARGUMENTS", `${path} must be a string within its length limit.`);
    }
    return value;
  }
  if (schema.type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new HermitError("INVALID_ARGUMENTS", `${path} must be a finite number.`);
    }
    return value;
  }
  if (schema.type === "boolean") {
    if (typeof value !== "boolean") throw new HermitError("INVALID_ARGUMENTS", `${path} must be a boolean.`);
    return value;
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

function snapshotProposal(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new HermitError("INVALID_PROPOSAL", "Planner must return a plain data object.");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some(key => typeof key !== "string" || !["capabilityId", "arguments"].includes(key))) {
    throw new HermitError("INVALID_PROPOSAL", "Planner proposal contains unsupported properties.");
  }
  const snapshot = Object.create(null);
  for (const key of ["capabilityId", "arguments"]) {
    const descriptor = descriptors[key];
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      throw new HermitError("INVALID_PROPOSAL", "Planner proposal must contain enumerable data properties only.");
    }
    snapshot[key] = descriptor.value;
  }
  return snapshot;
}

function snapshotJsonOutput(value, path = "$", ancestors = new WeakSet(), budget = { nodes: 0 }) {
  budget.nodes += 1;
  if (budget.nodes > 4096 || path.split(".").length > 32) {
    throw new HermitError("INVALID_TOOL_OUTPUT", "Capability output exceeds its structural limits.");
  }
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "object") {
    throw new HermitError("INVALID_TOOL_OUTPUT", "Capability output must contain only JSON data.");
  }
  if (ancestors.has(value)) {
    throw new HermitError("INVALID_TOOL_OUTPUT", "Capability output must not contain cycles.");
  }
  ancestors.add(value);

  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype || value.length > 4096) {
      throw new HermitError("INVALID_TOOL_OUTPUT", "Capability output contains an unsupported array.");
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some(key => key !== "length" && (typeof key !== "string" || !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length))) {
      throw new HermitError("INVALID_TOOL_OUTPUT", "Capability output arrays must not contain extra properties.");
    }
    const result = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
        throw new HermitError("INVALID_TOOL_OUTPUT", "Capability output arrays must be dense data arrays.");
      }
      result.push(snapshotJsonOutput(descriptor.value, `${path}[${index}]`, ancestors, budget));
    }
    ancestors.delete(value);
    return result;
  }

  if (![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new HermitError("INVALID_TOOL_OUTPUT", "Capability output objects must be plain data objects.");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some(key => typeof key !== "string")) {
    throw new HermitError("INVALID_TOOL_OUTPUT", "Capability output must not contain symbol properties.");
  }
  const result = Object.create(null);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      throw new HermitError("INVALID_TOOL_OUTPUT", "Capability output must contain enumerable data properties only.");
    }
    result[key] = snapshotJsonOutput(descriptor.value, `${path}.${key}`, ancestors, budget);
  }
  ancestors.delete(value);
  return result;
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
      const plannerResult = await raceWithSignal(() => planner({ task, signal: executionSignal }), executionSignal);
      const proposal = snapshotProposal(plannerResult);
      if (typeof proposal.capabilityId !== "string" || !/^[a-z][a-z0-9-]{1,63}$/.test(proposal.capabilityId)) {
        throw new HermitError("INVALID_PROPOSAL", "Planner must return a valid capabilityId.");
      }
      record("proposal-received", { capabilityId: proposal.capabilityId });
      const capability = this.registry.resolve(proposal.capabilityId);
      if (!capability) throw new HermitError("UNKNOWN_CAPABILITY", "Proposed capability is not registered.", { capabilityId: proposal.capabilityId });
      const safeArguments = snapshotArguments(proposal.arguments, capability.inputSchema);
      const serializedArguments = JSON.stringify(safeArguments);
      if (byteLength(serializedArguments) > DEFAULT_MAX_ARGUMENT_BYTES) {
        throw new HermitError("INVALID_ARGUMENTS", "Capability arguments must not exceed 16384 serialized bytes.");
      }
      record("arguments-validated", { capabilityId: capability.id, version: capability.version });

      const decision = await raceWithSignal(
        () => this.policy({ task, capability: { id: capability.id, version: capability.version, risk: capability.risk }, arguments: structuredClone(safeArguments) }),
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
        () => capability.invoke(structuredClone(safeArguments), { signal: executionSignal }),
        executionSignal
      );
      const safeResult = snapshotJsonOutput(result);
      const serialized = JSON.stringify(safeResult);
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
