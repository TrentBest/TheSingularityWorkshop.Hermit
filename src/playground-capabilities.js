import { validateCapabilityCatalog } from "./capability-catalog.js";

// Host-owned fixture catalog. It advertises browser-shell affordances only;
// the runtime registry and host policy remain authoritative for invocation.
export const PLAYGROUND_CAPABILITY_CATALOG = validateCapabilityCatalog({
  version: 1,
  capabilities: [
    {
      id: "inspect-object",
      shell: "browser",
      title: "Inspect an object",
      description: "Read the selected object's observed name, description, and location.",
      risk: "read-only",
      approvalRequired: false,
      examples: ["Inspect the glass vessel", "Examine the brass compass"],
      inputSchema: {
        type: "object",
        properties: { objectId: { type: "string", maxLength: 64 } },
        required: ["objectId"],
        additionalProperties: false
      },
      presentation: { surface: "object-inspector", icon: "search" }
    },
    {
      id: "move-object",
      shell: "browser",
      title: "Move an object to the workbench",
      description: "Propose moving a selected object. The host requires explicit approval before the world changes.",
      risk: "consequential",
      approvalRequired: true,
      examples: ["Move the brass compass to the workbench"],
      inputSchema: {
        type: "object",
        properties: {
          objectId: { type: "string", maxLength: 64 },
          target: { type: "string", maxLength: 64, enum: ["workbench"] }
        },
        required: ["objectId", "target"],
        additionalProperties: false
      },
      presentation: { surface: "approval-panel", icon: "move" }
    }
  ]
});
