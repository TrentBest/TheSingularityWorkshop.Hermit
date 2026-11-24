import { CapabilityRegistry, HermitRuntime } from "./hermit-runtime.js";

const DEFAULT_OBJECTS = [
  { id: "compass", name: "Brass compass", description: "A navigation instrument with a hinged lid and a freely moving needle.", location: "workshop" },
  { id: "glass", name: "Glass vessel", description: "A clear, empty glass vessel. Fragile objects are never moved without explicit host approval.", location: "workshop" },
  { id: "crate", name: "Parts crate", description: "A small wooden crate containing assorted workshop components.", location: "workshop" }
];

const objectSchema = {
  type: "object",
  properties: { objectId: { type: "string", maxLength: 64 } },
  required: ["objectId"]
};

export function createHermitPlayground({ objects = DEFAULT_OBJECTS, policy } = {}) {
  const world = new Map(objects.map(item => [item.id, structuredClone(item)]));
  const registry = new CapabilityRegistry();

  registry.register({
    id: "inspect-object",
    version: "1.0.0",
    risk: "read-only",
    inputSchema: objectSchema,
    invoke: async ({ objectId }) => {
      const item = world.get(objectId);
      if (!item) throw new Error("That object is not present in the environment.");
      return { objectId, name: item.name, description: item.description, location: item.location };
    }
  });

  registry.register({
    id: "move-object",
    version: "1.0.0",
    risk: "world-change",
    approvalRequired: true,
    inputSchema: {
      type: "object",
      properties: {
        objectId: { type: "string", maxLength: 64 },
        target: { type: "string", maxLength: 64 }
      },
      required: ["objectId", "target"]
    },
    invoke: async ({ objectId, target }) => {
      const item = world.get(objectId);
      if (!item) throw new Error("That object is not present in the environment.");
      if (target !== "workbench") throw new Error("The requested destination is not available.");
      item.location = target;
      return { objectId, name: item.name, location: item.location };
    }
  });

  const hostPolicy = policy ?? (async ({ capability }) =>
    capability.id === "inspect-object" ? "allow" : "approval-required");
  const runtime = new HermitRuntime({ registry, policy: hostPolicy });

  const observe = async () => ({
    objects: [...world.values()].map(item => ({ ...item }))
  });

  async function run({ objectId, capabilityId, arguments: args, approvalGranted = false }) {
    const capability = registry.resolve(capabilityId);
    if (!capability) throw new Error("Unknown playground capability.");
    const task = capabilityId === "inspect-object"
      ? `Inspect ${objectId} in the workshop.`
      : `Move ${objectId} to the workbench.`;

    return runtime.executeLoop({
      task,
      observe,
      planner: async ({ outcomes }) => outcomes.length > 0
        ? { done: true, result: { completed: true, action: capabilityId } }
        : { capabilityId, arguments: args },
      verify: async ({ result }) => {
        const current = world.get(result.objectId);
        const verified = Boolean(current) &&
          (capabilityId === "inspect-object"
            ? result.location === current.location
            : result.location === current.location && current.location === args.target);
        return { verified, observation: await observe() };
      },
      maxSteps: 2,
      approvalGranted
    });
  }

  return Object.freeze({
    capabilities: () => registry.list(),
    snapshot: observe,
    inspect: objectId => run({
      objectId, capabilityId: "inspect-object", arguments: { objectId }
    }),
    moveToWorkbench: (objectId, { approvalGranted = false } = {}) => run({
      objectId,
      capabilityId: "move-object",
      arguments: { objectId, target: "workbench" },
      approvalGranted
    })
  });
}
