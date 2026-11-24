const MAX_CHECKPOINT_BYTES = 65_536;
const MAX_TASK_LENGTH = 4_096;
const MAX_STEPS = 64;
const PHASES = new Set(["ready", "execution-started", "completed", "failed", "cancelled"]);

export class TaskCheckpointError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "TaskCheckpointError";
    this.code = code;
  }
}

function snapshotJson(value, path = "$", ancestors = new WeakSet(), budget = { nodes: 0 }) {
  budget.nodes += 1;
  if (budget.nodes > 8_192 || path.split(/[.[]/).length > 32) {
    throw new TaskCheckpointError("INVALID_CHECKPOINT", "Checkpoint data exceeds structural limits.");
  }
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (!value || typeof value !== "object" || ancestors.has(value)) {
    throw new TaskCheckpointError("INVALID_CHECKPOINT", "Checkpoint data must be acyclic JSON data.");
  }
  ancestors.add(value);
  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype || value.length > 4_096) {
      throw new TaskCheckpointError("INVALID_CHECKPOINT", "Checkpoint arrays are unsupported or too large.");
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some(key => key !== "length" && (typeof key !== "string" || !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length))) {
      throw new TaskCheckpointError("INVALID_CHECKPOINT", "Checkpoint arrays cannot contain extra properties.");
    }
    const result = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (!descriptor?.enumerable || !Object.hasOwn(descriptor, "value")) {
        throw new TaskCheckpointError("INVALID_CHECKPOINT", "Checkpoint arrays must be dense data arrays.");
      }
      result.push(snapshotJson(descriptor.value, `${path}[${index}]`, ancestors, budget));
    }
    ancestors.delete(value);
    return result;
  }
  if (![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new TaskCheckpointError("INVALID_CHECKPOINT", "Checkpoint objects must be plain data objects.");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some(key => typeof key !== "string")) {
    throw new TaskCheckpointError("INVALID_CHECKPOINT", "Checkpoint objects cannot contain symbol keys.");
  }
  const result = Object.create(null);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      throw new TaskCheckpointError("INVALID_CHECKPOINT", "Checkpoint objects must contain enumerable data properties only.");
    }
    result[key] = snapshotJson(descriptor.value, `${path}.${key}`, ancestors, budget);
  }
  ancestors.delete(value);
  return result;
}

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

function assertExactKeys(value, allowed, required) {
  const keys = Object.keys(value);
  if (keys.some(key => !allowed.includes(key)) || required.some(key => !Object.hasOwn(value, key))) {
    throw new TaskCheckpointError("INVALID_CHECKPOINT", "Checkpoint has missing or unsupported fields.");
  }
}

export function createTaskCheckpoint({
  taskId, task, revision, phase = "ready", nextStep = 0,
  observation, outcomes = [], pendingAction = null
} = {}) {
  if (typeof taskId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(taskId)) {
    throw new TaskCheckpointError("INVALID_CHECKPOINT", "taskId must be a stable bounded identifier.");
  }
  if (typeof task !== "string" || task.length < 1 || task.length > MAX_TASK_LENGTH) {
    throw new TaskCheckpointError("INVALID_CHECKPOINT", "task must be a non-empty bounded string.");
  }
  if (!Number.isSafeInteger(revision) || revision < 1) {
    throw new TaskCheckpointError("INVALID_CHECKPOINT", "revision must be a positive safe integer.");
  }
  if (!PHASES.has(phase)) throw new TaskCheckpointError("INVALID_CHECKPOINT", "Unsupported checkpoint phase.");
  if (!Number.isInteger(nextStep) || nextStep < 0 || nextStep > MAX_STEPS) {
    throw new TaskCheckpointError("INVALID_CHECKPOINT", "nextStep is outside the supported range.");
  }
  if (!Array.isArray(outcomes) || outcomes.length > MAX_STEPS) {
    throw new TaskCheckpointError("INVALID_CHECKPOINT", "outcomes must be a bounded array.");
  }
  const safeObservation = snapshotJson(observation);
  const safeOutcomes = snapshotJson(outcomes);
  const safePending = pendingAction === null ? null : snapshotJson(pendingAction);
  if (phase === "execution-started") {
    if (!safePending || typeof safePending !== "object" || Array.isArray(safePending)) {
      throw new TaskCheckpointError("INVALID_CHECKPOINT", "An execution-started checkpoint requires pendingAction.");
    }
    assertExactKeys(safePending, ["capabilityId", "arguments", "idempotencyKey"], ["capabilityId", "arguments", "idempotencyKey"]);
    if (typeof safePending.capabilityId !== "string" || !/^[a-z][a-z0-9-]{1,63}$/.test(safePending.capabilityId) ||
        typeof safePending.idempotencyKey !== "string" || safePending.idempotencyKey.length < 1 || safePending.idempotencyKey.length > 128) {
      throw new TaskCheckpointError("INVALID_CHECKPOINT", "pendingAction identity and idempotencyKey must be valid.");
    }
  } else if (safePending !== null) {
    throw new TaskCheckpointError("INVALID_CHECKPOINT", "pendingAction is only valid during execution-started.");
  }
  const checkpoint = {
    schemaVersion: 1, taskId, task, revision, phase, nextStep,
    observation: safeObservation, outcomes: safeOutcomes, pendingAction: safePending
  };
  const serialized = JSON.stringify(checkpoint);
  if (new TextEncoder().encode(serialized).length > MAX_CHECKPOINT_BYTES) {
    throw new TaskCheckpointError("CHECKPOINT_TOO_LARGE", "Checkpoint exceeds 65536 serialized bytes.");
  }
  return freezeDeep(checkpoint);
}

export function serializeTaskCheckpoint(checkpoint) {
  const validated = createTaskCheckpoint(checkpoint);
  return JSON.stringify(validated);
}

export function parseTaskCheckpoint(serialized) {
  if (typeof serialized !== "string" || new TextEncoder().encode(serialized).length > MAX_CHECKPOINT_BYTES) {
    throw new TaskCheckpointError("INVALID_CHECKPOINT", "Serialized checkpoint must be a bounded string.");
  }
  let value;
  try {
    value = JSON.parse(serialized);
  } catch {
    throw new TaskCheckpointError("INVALID_CHECKPOINT", "Serialized checkpoint is not valid JSON.");
  }
  const safe = snapshotJson(value);
  assertExactKeys(safe, ["schemaVersion", "taskId", "task", "revision", "phase", "nextStep", "observation", "outcomes", "pendingAction"],
    ["schemaVersion", "taskId", "task", "revision", "phase", "nextStep", "observation", "outcomes", "pendingAction"]);
  if (safe.schemaVersion !== 1) {
    throw new TaskCheckpointError("UNSUPPORTED_CHECKPOINT_VERSION", "Checkpoint schema version is not supported.");
  }
  return createTaskCheckpoint(safe);
}

export function classifyCheckpointRecovery(checkpoint) {
  const safe = createTaskCheckpoint(checkpoint);
  if (safe.phase === "ready") return "resume";
  if (safe.phase === "execution-started") return "reconcile-required";
  return "terminal";
}
