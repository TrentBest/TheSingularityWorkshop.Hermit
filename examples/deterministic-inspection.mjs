import { CapabilityRegistry, HermitRuntime } from "../src/hermit-runtime.js";

const items = new Map([
  ["compass", { name: "compass", description: "A brass compass used for navigation." }]
]);

const registry = new CapabilityRegistry();
registry.register({
  id: "inspect-item",
  version: "1.0.0",
  risk: "read-only",
  inputSchema: {
    type: "object",
    properties: { name: { type: "string", maxLength: 80 } },
    required: ["name"]
  },
  invoke: async ({ name }) => items.get(name) ?? { name, found: false }
});

const planner = async ({ task }) => ({
  capabilityId: "inspect-item",
  arguments: { name: task.toLowerCase().includes("compass") ? "compass" : "unknown" }
});

const runtime = new HermitRuntime({
  registry,
  policy: async ({ capability }) => capability.risk === "read-only" ? "allow" : "deny"
});

const response = await runtime.execute({ task: "Inspect the compass.", planner });
console.log(JSON.stringify(response, null, 2));
