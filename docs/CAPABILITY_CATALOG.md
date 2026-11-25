# Host capability catalog

Hermit needs to discover what the current shell can actually present and do. A browser, desktop app, server and VR shell may expose different capabilities. The catalog is a declarative description supplied by the host; it is not an executable plugin and it is not a permission grant.

## Contract

```js
{
  version: 1,
  capabilities: [
    {
      id: "scene.inspect",
      shell: "browser",
      title: "Inspect an object",
      description: "Read the selected object's observed properties.",
      risk: "read-only",
      approvalRequired: false,
      examples: ["Inspect the glass vessel"],
      inputSchema: {
        type: "object",
        properties: { objectId: { type: "string", maxLength: 80 } },
        required: ["objectId"],
        additionalProperties: false
      },
      presentation: { surface: "inspector", icon: "search" }
    }
  ]
}
```

`src/capability-catalog.js` provides:

- `validateCapabilityCatalog(catalog)` — validates version 1, stable unique IDs, bounded descriptions/examples, risk and approval metadata, optional scalar-only input schemas, and presentation hints. The returned snapshot is frozen.
- `discoverCapabilities(catalog, shell)` — returns only entries declared for the active shell.
- `findCapability(catalog, shell, id)` — resolves an ID only within that shell.
- `describeCapabilities(catalog, shell)` — produces a presentation-safe description for discovery UI.

The schema is intentionally a small supported subset, not a general JSON Schema engine. Unknown fields and schema keywords fail closed. Catalogs are bounded to 64 entries; examples to 8 per entry; input properties to 32. Capability descriptions contain no handler, callback, URL, script, or executable payload.

## Authority boundary

`available` means the shell advertises the capability, not that the current user or task is authorized to invoke it. The host must independently authenticate the principal, resolve current context, enforce grants and policy, obtain approval when required, validate action arguments, execute through a trusted adapter, and verify the resulting environment state. A catalog's `approvalRequired` and `risk` fields are useful disclosure metadata, not a substitute for host policy. Never execute a handler or trust a permission from catalog data.

The catalog module is a tested provider-neutral contract and is now wired to the Pages browser playground through its host-owned fixture catalog in `src/playground-capabilities.js`. Voice discovery reads that shell-provided catalog rather than maintaining a second hard-coded capability list. This is not yet a production shell registry or live Hermit planner integration. Next work should provide equivalent host-owned catalogs to AnyApp and VR shells, render the resulting capability descriptions through GUI, and route selected IDs through the existing policy/approval/execution boundary.

## Tests

Run `npm test`. Tests cover shell isolation, stable IDs, unsupported versions, duplicate IDs, bounds, executable/unknown fields, accessors, and the restricted input-schema vocabulary.