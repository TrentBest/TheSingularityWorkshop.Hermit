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


test("reconciles an interrupted action confirmed applied without replay", async () => {
  const repository = createCheckpointRepository(memoryAdapter());
  await repository.save(checkpoint(1, "execution-started"));
  let resolverCalls = 0;
  const recovered = await repository.reconcile("task-durable-1", async pending => {
    resolverCalls += 1;
    assert.equal(pending.pendingAction.idempotencyKey, "task-durable-1:0");
    return { actionApplied: true, result: { inspected: true }, observation: { environmentRevision: 4, inspected: true } };
  });
  assert.equal(resolverCalls, 1);
  assert.equal(recovered.recovery, "resume");
  assert.equal(recovered.changed, true);
  assert.equal(recovered.checkpoint.phase, "ready");
  assert.equal(recovered.checkpoint.nextStep, 1);
  assert.equal(recovered.checkpoint.outcomes[0].reconciled, true);
  assert.equal(recovered.checkpoint.revision, 2);
});

test("reconciles an interrupted action confirmed not applied without advancing the step", async () => {
  const repository = createCheckpointRepository(memoryAdapter());
  await repository.save(checkpoint(1, "execution-started"));
  const recovered = await repository.reconcile("task-durable-1", async () => ({
    actionApplied: false, observation: { environmentRevision: 4, inspected: false }
  }));
  assert.equal(recovered.checkpoint.phase, "ready");
  assert.equal(recovered.checkpoint.nextStep, 0);
  assert.equal(recovered.checkpoint.outcomes.length, 0);
  assert.equal(recovered.checkpoint.observation.inspected, false);
});

test("does not modify an already-ready checkpoint during recovery", async () => {
  const repository = createCheckpointRepository(memoryAdapter());
  await repository.save(checkpoint(1, "ready"));
  const recovered = await repository.reconcile("task-durable-1", async () => {
    assert.fail("Resolver must not run for a ready checkpoint.");
  });
  assert.equal(recovered.changed, false);
  assert.equal(recovered.checkpoint.revision, 1);
});

test("fails closed when reconciliation is missing or malformed", async () => {
  const repository = createCheckpointRepository(memoryAdapter());
  await repository.save(checkpoint(1, "execution-started"));
  await assert.rejects(repository.reconcile("task-durable-1"), { code: "RECONCILIATION_REQUIRED" });
  await assert.rejects(repository.reconcile("task-durable-1", async () => ({
    actionApplied: true, observation: {}
  })), { code: "INVALID_RECONCILIATION" });
  assert.equal((await repository.load("task-durable-1")).checkpoint.phase, "execution-started");
});

test("rejects terminal checkpoint reconciliation", async () => {
  const repository = createCheckpointRepository(memoryAdapter());
  await repository.save({ ...checkpoint(1), phase: "failed" });
  await assert.rejects(repository.reconcile("task-durable-1", async () => ({
    actionApplied: false, observation: {}
  })), { code: "CHECKPOINT_TERMINAL" });
});
