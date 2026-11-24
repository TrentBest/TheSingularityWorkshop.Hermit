import test from "node:test";
import assert from "node:assert/strict";
import {
  TaskCheckpointError, createTaskCheckpoint, serializeTaskCheckpoint,
  parseTaskCheckpoint, classifyCheckpointRecovery
} from "../src/task-checkpoint.js";

const base = {
  taskId: "task-42",
  task: "Inspect the glass container.",
  revision: 1,
  observation: { environmentRevision: 8, objects: [{ id: "glass-1" }] }
};

test("creates immutable versioned checkpoints and round-trips through JSON", () => {
  const checkpoint = createTaskCheckpoint(base);
  assert.equal(checkpoint.schemaVersion, 1);
  assert.equal(Object.isFrozen(checkpoint), true);
  assert.equal(Object.isFrozen(checkpoint.observation.objects[0]), true);
  assert.deepEqual(parseTaskCheckpoint(serializeTaskCheckpoint(checkpoint)), checkpoint);
  assert.equal(classifyCheckpointRecovery(checkpoint), "resume");
});

test("requires reconciliation rather than replay after an interrupted invocation", () => {
  const checkpoint = createTaskCheckpoint({
    ...base,
    phase: "execution-started",
    pendingAction: {
      capabilityId: "inspect-item",
      arguments: { name: "glass-1" },
      idempotencyKey: "task-42:step-1"
    }
  });
  assert.equal(classifyCheckpointRecovery(checkpoint), "reconcile-required");
});

test("classifies completed, failed and cancelled checkpoints as terminal", () => {
  for (const phase of ["completed", "failed", "cancelled"]) {
    assert.equal(classifyCheckpointRecovery(createTaskCheckpoint({ ...base, phase })), "terminal");
  }
});

test("rejects invalid versions, missing fields and unsupported data", () => {
  const serialized = serializeTaskCheckpoint(createTaskCheckpoint(base));
  const unsupported = JSON.parse(serialized);
  unsupported.schemaVersion = 2;
  assert.throws(() => parseTaskCheckpoint(JSON.stringify(unsupported)), error =>
    error instanceof TaskCheckpointError && error.code === "UNSUPPORTED_CHECKPOINT_VERSION");
  assert.throws(() => createTaskCheckpoint({ ...base, revision: 0 }), TaskCheckpointError);
  assert.throws(() => createTaskCheckpoint({ ...base, observation: { value: undefined } }), TaskCheckpointError);
  assert.throws(() => createTaskCheckpoint({
    ...base, phase: "execution-started", pendingAction: { capabilityId: "inspect-item", arguments: {} }
  }), TaskCheckpointError);
});

test("rejects accessors, cycles and oversized checkpoints without executing hooks", () => {
  let getterCalled = false;
  const observation = {};
  Object.defineProperty(observation, "secret", {
    enumerable: true, get() { getterCalled = true; return "no"; }
  });
  assert.throws(() => createTaskCheckpoint({ ...base, observation }), TaskCheckpointError);
  assert.equal(getterCalled, false);
  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(() => createTaskCheckpoint({ ...base, observation: cyclic }), TaskCheckpointError);
  assert.throws(() => createTaskCheckpoint({ ...base, observation: { data: "x".repeat(66_000) } }), error =>
    error instanceof TaskCheckpointError && error.code === "CHECKPOINT_TOO_LARGE");
});
