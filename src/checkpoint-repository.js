import {
  TaskCheckpointError,
  createTaskCheckpoint,
  parseTaskCheckpoint,
  serializeTaskCheckpoint
} from "./task-checkpoint.js";

function assertAdapter(adapter) {
  if (!adapter || typeof adapter.read !== "function" || typeof adapter.compareAndSwap !== "function") {
    throw new TypeError("Checkpoint adapter must implement read(taskId) and atomic compareAndSwap(taskId, expectedRevision, serialized).");
  }
}

/**
 * Creates a repository over host-owned durable storage.
 * compareAndSwap must be atomic across processes/instances and must persist
 * the replacement before reporting success.
 */
export function createCheckpointRepository(adapter) {
  assertAdapter(adapter);

  return Object.freeze({
    async load(taskId) {
      const serialized = await adapter.read(taskId);
      if (serialized === null || serialized === undefined) return null;
      const checkpoint = parseTaskCheckpoint(serialized);
      if (checkpoint.taskId !== taskId) {
        throw new TaskCheckpointError("CHECKPOINT_ID_MISMATCH", "Stored checkpoint identity does not match its storage key.");
      }
      return Object.freeze({
        checkpoint,
        recovery: classifyRecovery(checkpoint)
      });
    },

    async save(checkpoint, { expectedRevision = 0 } = {}) {
      const safe = createTaskCheckpoint(checkpoint);
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
        throw new TaskCheckpointError("INVALID_REVISION", "expectedRevision must be a non-negative safe integer.");
      }
      if (safe.revision !== expectedRevision + 1) {
        throw new TaskCheckpointError("INVALID_REVISION", "Checkpoint revision must advance exactly one step.");
      }
      const serialized = serializeTaskCheckpoint(safe);
      const saved = await adapter.compareAndSwap(safe.taskId, expectedRevision, serialized);
      if (saved !== true) {
        throw new TaskCheckpointError("CHECKPOINT_CONFLICT", "Checkpoint changed or was not durably committed; reload before retrying.");
      }
      return safe;
    },

    async remove(taskId, { expectedRevision } = {}) {
      if (typeof taskId !== "string" || !Number.isSafeInteger(expectedRevision) || expectedRevision < 1) {
        throw new TaskCheckpointError("INVALID_REVISION", "remove requires a task id and positive expected revision.");
      }
      if (typeof adapter.deleteIfRevision !== "function") {
        throw new TaskCheckpointError("UNSUPPORTED_OPERATION", "This adapter does not support revision-guarded deletion.");
      }
      const removed = await adapter.deleteIfRevision(taskId, expectedRevision);
      if (removed !== true) {
        throw new TaskCheckpointError("CHECKPOINT_CONFLICT", "Checkpoint changed or was not deleted; reload before retrying.");
      }
      return true;
    }
  });
}

function classifyRecovery(checkpoint) {
  if (checkpoint.phase === "ready") return "resume";
  if (checkpoint.phase === "execution-started") return "reconcile-required";
  return "terminal";
}
