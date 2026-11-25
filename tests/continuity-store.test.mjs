import test from "node:test";
import assert from "node:assert/strict";
import { createCheckpointRepository } from "../src/checkpoint-repository.js";
import { createInMemoryContinuityStore } from "../src/continuity-store.js";

test("two shells share companion identity and versioned state", async () => {
  const store = createInMemoryContinuityStore({ ownerId: "owner-1", hermitId: "hermit-1" });
  const phone = store.createShell({ deviceId: "phone-1", hostType: "web", capabilities: ["camera"] });
  const desktop = store.createShell({ deviceId: "desktop-1", hostType: "anyapp", capabilities: ["filesystem"] });

  assert.deepEqual(phone.identity(), desktop.identity());
  assert.equal(await phone.compareAndSwapState(0, { currentProject: "Hermit" }), true);
  assert.deepEqual((await desktop.readState()).values, { currentProject: "Hermit" });
  assert.equal((await desktop.readState()).revision, 1);
});

test("shared identity never transfers device-local capabilities", () => {
  const store = createInMemoryContinuityStore({ ownerId: "owner-1", hermitId: "hermit-1" });
  const phone = store.createShell({ deviceId: "phone-1", hostType: "web", capabilities: ["camera"] });
  const desktop = store.createShell({ deviceId: "desktop-1", hostType: "anyapp", capabilities: ["filesystem"] });

  assert.equal(phone.hasCapability("camera"), true);
  assert.equal(phone.hasCapability("filesystem"), false);
  assert.equal(desktop.hasCapability("filesystem"), true);
  assert.equal(desktop.hasCapability("camera"), false);
  assert.deepEqual(phone.listLocalCapabilities(), ["camera"]);
  assert.deepEqual(desktop.listLocalCapabilities(), ["filesystem"]);
});

test("stale shared-state writers fail closed and event delivery is idempotent", async () => {
  const store = createInMemoryContinuityStore({ ownerId: "owner-1", hermitId: "hermit-1" });
  const phone = store.createShell({ deviceId: "phone-1", hostType: "web" });
  const desktop = store.createShell({ deviceId: "desktop-1", hostType: "anyapp" });

  assert.equal(await phone.compareAndSwapState(0, { status: "phone" }), true);
  assert.equal(await desktop.compareAndSwapState(0, { status: "stale desktop" }), false);
  assert.equal(await phone.appendEvent({ eventId: "evt-1", type: "task-started" }), true);
  assert.equal(await desktop.appendEvent({ eventId: "evt-1", type: "task-started" }), false);
  assert.equal((await desktop.readEvents()).length, 1);
});

test("task checkpoints are visible across shells through one shared repository adapter", async () => {
  const store = createInMemoryContinuityStore({ ownerId: "owner-1", hermitId: "hermit-1" });
  const phone = store.createShell({ deviceId: "phone-1", hostType: "web" });
  const desktop = store.createShell({ deviceId: "desktop-1", hostType: "anyapp" });
  const phoneRepository = createCheckpointRepository(phone.checkpointAdapter);
  const desktopRepository = createCheckpointRepository(desktop.checkpointAdapter);

  await phoneRepository.save({
    taskId: "task-1", task: "Inspect the glass container.", revision: 1,
    phase: "ready", nextStep: 1, observation: { inspected: true },
    outcomes: [{ step: 1, verified: true }], pendingAction: null
  });
  const resumed = await desktopRepository.load("task-1");
  assert.equal(resumed.checkpoint.nextStep, 1);
  assert.equal(resumed.checkpoint.observation.inspected, true);
  assert.equal(resumed.checkpoint.revision, 1);
});

test("shared state snapshots cannot mutate the continuity authority", async () => {
  const store = createInMemoryContinuityStore({ ownerId: "owner-1", hermitId: "hermit-1" });
  const shell = store.createShell({ deviceId: "phone-1", hostType: "web" });
  await shell.compareAndSwapState(0, { nested: { value: "authoritative" } });
  const snapshot = await shell.readState();
  assert.throws(() => { snapshot.values.nested.value = "tampered"; }, TypeError);
  assert.equal((await shell.readState()).values.nested.value, "authoritative");
});
