import { CapabilityRegistry, HermitRuntime } from "./hermit-runtime.js";
import { createWorldStateSnapshot } from "./world-state.js";
import { PLAYGROUND_CAPABILITY_CATALOG } from "./playground-capabilities.js";

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
  const initialSnapshot = createWorldStateSnapshot({ environmentId: "hermit-workshop", revision: 0, objects });
  const world = new Map(initialSnapshot.objects.map(item => [item.id, { ...item }]));
  let worldRevision = initialSnapshot.revision;
  let nextCustomObject = 1;
  const registry = new CapabilityRegistry();

  registry.register({
    id: "inspect-object",
    version: "1.0.0",
    risk: "read-only",
    inputSchema: objectSchema,
    invoke: async ({ objectId }) => {
      const item = world.get(objectId);
      if (!item) throw new Error("That object is not present in the environment.");
      return { objectId, name: item.name, description: item.description, location: item.location, shape: item.shape, dimensions: item.dimensions, position: item.position, rotation: item.rotation, material: item.material, affordances: item.affordances };
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
      worldRevision += 1;
      return { objectId, name: item.name, location: item.location, revision: worldRevision };
    }
  });

  const hostPolicy = policy ?? (async ({ capability }) =>
    capability.id === "inspect-object" ? "allow" : "approval-required");
  const runtime = new HermitRuntime({ registry, policy: hostPolicy });

  const observe = async () => createWorldStateSnapshot({
    environmentId: "hermit-workshop",
    revision: worldRevision,
    objects: [...world.values()].map(item => ({ ...item }))
  });

  async function run({ objectId, capabilityId, arguments: args, approvalGranted = false, onEvent }) {
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
      approvalGranted,
      onEvent
    });
  }

  return Object.freeze({
    capabilities: () => registry.list(),
    addObject: async ({ name, description, shape = "box", dimensions, position, rotation, material = "wood", affordances = ["inspect", "move"] }) => {
      const id = "player-object-" + nextCustomObject;
      const candidate = {
        id, name, description, location: "workshop", shape,
        dimensions: dimensions ?? { x: 1, y: 1, z: 1 },
        position: position ?? { x: 0, y: 0, z: 0 },
        rotation: rotation ?? { x: 0, y: 0, z: 0 },
        material, affordances
      };
      const nextSnapshot = createWorldStateSnapshot({
        environmentId: "hermit-workshop",
        revision: worldRevision + 1,
        objects: [...world.values()].map(item => ({ ...item })).concat(candidate)
      });
      nextCustomObject += 1;
      world.set(id, { ...nextSnapshot.objects.at(-1) });
      worldRevision = nextSnapshot.revision;
      return nextSnapshot;
    },
    capabilityCatalog: () => PLAYGROUND_CAPABILITY_CATALOG,
    snapshot: observe,
    inspect: (objectId, { onEvent } = {}) => run({
      objectId, capabilityId: "inspect-object", arguments: { objectId }, onEvent
    }),
    moveToWorkbench: (objectId, { approvalGranted = false, onEvent } = {}) => run({
      objectId,
      capabilityId: "move-object",
      arguments: { objectId, target: "workbench" },
      approvalGranted,
      onEvent
    })
  });
}
