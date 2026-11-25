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

test("shared records reject non-JSON and oversized payloads", async () => {
  const store = createInMemoryContinuityStore({ ownerId: "owner-1", hermitId: "hermit-1" });
  const shell = store.createShell({ deviceId: "phone-1", hostType: "web" });
  const cyclic = {};
  cyclic.self = cyclic;
  await assert.rejects(shell.compareAndSwapState(0, cyclic), TypeError);
  await assert.rejects(shell.compareAndSwapState(0, { value: "x".repeat(65_537) }), TypeError);
  assert.equal((await shell.readState()).revision, 0);
});

test("executeLoop hands a verified task from phone shell to desktop shell", async () => {
  const { HermitRuntime, CapabilityRegistry } = await import("../src/hermit-runtime.js");
  const store = createInMemoryContinuityStore({ ownerId: "owner-1", hermitId: "hermit-1" });
  const phone = store.createShell({ deviceId: "phone-1", hostType: "web", capabilities: ["inspect-item"] });
  const desktop = store.createShell({ deviceId: "desktop-1", hostType: "anyapp", capabilities: ["inspect-item", "filesystem"] });
  const phoneRepository = createCheckpointRepository(phone.checkpointAdapter);
  const desktopRepository = createCheckpointRepository(desktop.checkpointAdapter);
  const registry = new CapabilityRegistry();
  registry.register({
    id: "inspect-item", version: "1.0.0",
    inputSchema: { type: "object", properties: { name: { type: "string", maxLength: 80 } }, required: ["name"] },
    invoke: async ({ name }) => ({ inspected: true, name })
  });
  const makeRuntime = shell => new HermitRuntime({
    registry,
    policy: ({ capability }) => shell.hasCapability(capability.id) ? "allow" : "deny"
  });
  const task = "Inspect the compass.";
  const first = await makeRuntime(phone).executeLoop({
    taskId: "cross-shell-task", task, checkpointRepository: phoneRepository, maxSteps: 1,
    observe: async () => ({ inspected: false }),
    planner: async () => ({ capabilityId: "inspect-item", arguments: { name: "compass" } }),
    verify: async ({ result }) => ({ verified: true, observation: { inspected: result.inspected } })
  });
  assert.equal(first.status, "failed");
  assert.equal(first.error.code, "STEP_LIMIT_REACHED");
  assert.equal((await phoneRepository.load("cross-shell-task")).checkpoint.phase, "ready");

  let desktopObserved = false;
  const second = await makeRuntime(desktop).executeLoop({
    taskId: "cross-shell-task", task, checkpointRepository: desktopRepository, resume: true,
    observe: async () => { desktopObserved = true; return {}; },
    planner: async ({ observation }) => observation.inspected
      ? { done: true, result: { continued: true } }
      : { capabilityId: "inspect-item", arguments: { name: "compass" } },
    verify: async ({ result }) => ({ verified: true, observation: { inspected: result.inspected } })
  });
  assert.equal(second.status, "completed");
  assert.equal(desktopObserved, false);
  assert.equal((await desktopRepository.load("cross-shell-task")).checkpoint.phase, "completed");
  assert.deepEqual(phone.identity(), desktop.identity());
  assert.equal(phone.hasCapability("filesystem"), false);
  assert.equal(desktop.hasCapability("filesystem"), true);
});
