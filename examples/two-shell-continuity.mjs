import { CapabilityRegistry, HermitRuntime } from "../src/hermit-runtime.js";
import { createCheckpointRepository } from "../src/checkpoint-repository.js";
import { createInMemoryContinuityStore } from "../src/continuity-store.js";

// One process-local authority shared by two distinct shell instances.
// Replace this fixture with an authenticated durable service in real hosts.
const continuity = createInMemoryContinuityStore({ ownerId: "demo-owner", hermitId: "hermit-primary" });
const phone = continuity.createShell({
  deviceId: "phone", hostType: "web", capabilities: ["inspect-item"]
});
const desktop = continuity.createShell({
  deviceId: "desktop", hostType: "anyapp", capabilities: ["inspect-item", "filesystem"]
});

const registry = new CapabilityRegistry();
registry.register({
  id: "inspect-item",
  version: "1.0.0",
  inputSchema: {
    type: "object",
    properties: { name: { type: "string", maxLength: 80 } },
    required: ["name"]
  },
  invoke: async ({ name }) => ({ inspected: true, name })
});
registry.register({
  id: "save-note",
  version: "1.0.0",
  inputSchema: {
    type: "object",
    properties: { note: { type: "string", maxLength: 120 } },
    required: ["note"]
  },
  risk: "write",
  invoke: async ({ note }) => ({ saved: true, note })
});

function runtimeFor(shell) {
  return new HermitRuntime({
    registry,
    // This is an illustrative host policy. Real policy must inspect the
    // authenticated principal, current host context and approval state.
    policy: ({ capability }) =>
      shell.hasCapability(capability.id) ? "allow" : "deny"
  });
}

const taskId = "shared-inspection";
const task = "Inspect the compass and continue on another device.";
const phoneRepository = createCheckpointRepository(phone.checkpointAdapter);
const desktopRepository = createCheckpointRepository(desktop.checkpointAdapter);

const interrupted = await runtimeFor(phone).executeLoop({
  taskId, task, checkpointRepository: phoneRepository, maxSteps: 1,
  observe: async () => ({ location: "phone-camera", inspected: false }),
  planner: async ({ step }) => step === 0
    ? { capabilityId: "inspect-item", arguments: { name: "compass" } }
    : { capabilityId: "inspect-item", arguments: { name: "compass" } },
  verify: async ({ result, observation }) => ({
    verified: result.inspected === true,
    observation: { ...observation, inspected: result.inspected, item: result.name }
  })
});

if (interrupted.error?.code !== "STEP_LIMIT_REACHED") {
  throw new Error(`Expected a resumable step limit, received ${interrupted.error?.code ?? interrupted.status}.`);
}

const resumed = await runtimeFor(desktop).executeLoop({
  taskId, task, checkpointRepository: desktopRepository, resume: true,
  observe: async () => { throw new Error("A resumed task must restore its checkpoint."); },
  maxSteps: 3,
  planner: async ({ step, observation }) => step === 1
    ? { capabilityId: "save-note", arguments: { note: "Compass inspected on phone; continued on desktop." } }
    : observation.saved
      ? { done: true, result: { message: "Hermit continued on desktop and saved its note." } }
      : { capabilityId: "inspect-item", arguments: { name: "compass" } },
  verify: async ({ proposal, result, observation }) => ({
    verified: result.saved === true || result.inspected === true,
    observation: proposal.capabilityId === "save-note"
      ? { ...observation, saved: result.saved, note: result.note }
      : { ...observation, inspected: result.inspected }
  })
});

if (resumed.status !== "completed") {
  throw new Error(`Desktop continuation failed: ${resumed.error?.code ?? resumed.status}`);
}

console.log(JSON.stringify({
  identity: desktop.identity(),
  phoneStatus: interrupted.status,
  phoneCheckpoint: (await phoneRepository.load(taskId)).checkpoint.phase,
  desktopStatus: resumed.status,
  finalRevision: (await desktopRepository.load(taskId)).checkpoint.revision,
  phoneCapabilities: phone.listLocalCapabilities(),
  desktopCapabilities: desktop.listLocalCapabilities(),
  verifiedOutcomes: (await desktopRepository.load(taskId)).checkpoint.outcomes
}, null, 2));
