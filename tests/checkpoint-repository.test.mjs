import test from "node:test";
import assert from "node:assert/strict";
import { createCheckpointRepository } from "../src/checkpoint-repository.js";

const checkpoint = (revision, phase = "ready") => ({
  taskId: "task-durable-1",
  task: "Inspect the glass container.",
  revision,
  phase,
  nextStep: 0,
  observation: { environmentRevision: 3 },
  outcomes: [],
  pendingAction: phase === "execution-started"
    ? { capabilityId: "inspect-item", arguments: { id: "glass-1" }, idempotencyKey: "task-durable-1:0" }
    : null
});

function memoryAdapter() {
  const values = new Map();
  return {
    values,
    async read(id) { return values.get(id) ?? null; },
    async compareAndSwap(id, expected, serialized) {
      const current = values.get(id);
      const actual = current ? JSON.parse(current).revision : 0;
      if (actual !== expected) return false;
      values.set(id, serialized);
      return true;
    },
    async deleteIfRevision(id, expected) {
      const current = values.get(id);
      if (!current || JSON.parse(current).revision !== expected) return false;
      values.delete(id);
      return true;
    }
  };
}

test("persists and reloads a checkpoint through the host adapter", async () => {
  const adapter = memoryAdapter();
  const repository = createCheckpointRepository(adapter);
  await repository.save(checkpoint(1));
  const loaded = await repository.load("task-durable-1");
  assert.equal(loaded.checkpoint.revision, 1);
  assert.equal(loaded.recovery, "resume");
});

test("requires monotonic revisions and rejects stale concurrent writers", async () => {
  const repository = createCheckpointRepository(memoryAdapter());
  await repository.save(checkpoint(1));
  await assert.rejects(repository.save(checkpoint(2), { expectedRevision: 0 }), { code: "INVALID_REVISION" });
  await repository.save(checkpoint(2), { expectedRevision: 1 });
  await assert.rejects(repository.save(checkpoint(2), { expectedRevision: 1 }), { code: "CHECKPOINT_CONFLICT" });
});

test("interrupted execution is surfaced for reconciliation, never replayed", async () => {
  const repository = createCheckpointRepository(memoryAdapter());
  await repository.save(checkpoint(1, "execution-started"));
  const loaded = await repository.load("task-durable-1");
  assert.equal(loaded.recovery, "reconcile-required");
  assert.equal(loaded.checkpoint.pendingAction.idempotencyKey, "task-durable-1:0");
});

test("guards deletion by revision", async () => {
  const repository = createCheckpointRepository(memoryAdapter());
  await repository.save(checkpoint(1));
  await assert.rejects(repository.remove("task-durable-1", { expectedRevision: 2 }), { code: "CHECKPOINT_CONFLICT" });
  assert.equal(await repository.remove("task-durable-1", { expectedRevision: 1 }), true);
  assert.equal(await repository.load("task-durable-1"), null);
});

test("rejects storage key and serialized checkpoint identity mismatch", async () => {
  const adapter = memoryAdapter();
  const repository = createCheckpointRepository(adapter);
  await repository.save(checkpoint(1));
  adapter.values.set("another-task", adapter.values.get("task-durable-1"));
  await assert.rejects(repository.load("another-task"), { code: "CHECKPOINT_ID_MISMATCH" });
});
