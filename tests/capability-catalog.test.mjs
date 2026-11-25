import test from "node:test";
import assert from "node:assert/strict";
import {
  CAPABILITY_CATALOG_VERSION,
  describeCapabilities,
  discoverCapabilities,
  findCapability,
  validateCapabilityCatalog
} from "../src/capability-catalog.js";

const catalog = () => ({
  version: CAPABILITY_CATALOG_VERSION,
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
    },
    {
      id: "scene.move",
      shell: "desktop",
      title: "Move an object",
      description: "Propose moving an object to a selected destination.",
      risk: "consequential",
      approvalRequired: true,
      examples: ["Move the compass to the workbench"]
    }
  ]
});

test("catalog validates and freezes declarative capability descriptions", () => {
  const result = validateCapabilityCatalog(catalog());
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.capabilities[0].inputSchema.properties.objectId), true);
  assert.equal(Object.isFrozen(result.capabilities[0].examples), true);
  assert.equal(result.capabilities[0].approvalRequired, false);
});

test("discovery is scoped to the active shell and never implies permission", () => {
  const value = catalog();
  assert.deepEqual(discoverCapabilities(value, "browser").map(item => item.id), ["scene.inspect"]);
  assert.equal(findCapability(value, "browser", "scene.move"), null);
  const descriptions = describeCapabilities(value, "desktop");
  assert.equal(descriptions[0].approvalRequired, true);
  assert.equal(descriptions[0].risk, "consequential");
});

test("catalog rejects unsupported versions, duplicate IDs and excessive entries", () => {
  const wrongVersion = catalog();
  wrongVersion.version = 99;
  assert.throws(() => validateCapabilityCatalog(wrongVersion), /unsupported catalog version/);
  const duplicate = catalog();
  duplicate.capabilities.push({ ...duplicate.capabilities[0] });
  assert.throws(() => validateCapabilityCatalog(duplicate), /unique stable identifiers/);
  const excessive = { version: 1, capabilities: Array(65).fill(duplicate.capabilities[0]) };
  assert.throws(() => validateCapabilityCatalog(excessive), /at most 64/);
});

test("catalog rejects executable, accessor, prototype and unknown fields", () => {
  const executable = catalog();
  executable.capabilities[0].run = () => {};
  assert.throws(() => validateCapabilityCatalog(executable), /unsupported capability field/);
  const accessor = catalog();
  Object.defineProperty(accessor.capabilities[0], "title", { get() { throw new Error("must not run"); } });
  assert.throws(() => validateCapabilityCatalog(accessor), /must not contain accessors/);
  const polluted = JSON.parse('{"version":1,"capabilities":[],"__proto__":{"admin":true}}');
  assert.throws(() => validateCapabilityCatalog(polluted), /forbidden key/);
});

test("input schemas are deliberately bounded and reject unsupported schema features", () => {
  const badType = catalog();
  badType.capabilities[0].inputSchema.properties.objectId.type = "array";
  assert.throws(() => validateCapabilityCatalog(badType), /scalar/);
  const permissive = catalog();
  permissive.capabilities[0].inputSchema.additionalProperties = true;
  assert.throws(() => validateCapabilityCatalog(permissive), /additionalProperties=false/);
  const reversed = catalog();
  reversed.capabilities[0].inputSchema.properties.count = { type: "integer", minimum: 9, maximum: 2 };
  assert.throws(() => validateCapabilityCatalog(reversed), /bounds are reversed/);
});

test("catalog rejects unsafe arrays and invalid enum values", () => {
  const accessorArray = catalog();
  Object.defineProperty(accessorArray.capabilities[0].examples, "0", { get() { throw new Error("must not execute"); } });
  assert.throws(() => validateCapabilityCatalog(accessorArray), /accessors/);
  const sparse = catalog();
  sparse.capabilities[0].examples = Array(1);
  assert.throws(() => validateCapabilityCatalog(sparse), /sparse/);
  const invalidEnum = catalog();
  invalidEnum.capabilities[0].inputSchema.properties.objectId.enum = ["a", "a"];
  assert.throws(() => validateCapabilityCatalog(invalidEnum), /must be unique/);
});

test("catalog rejects invalid shell, risk, approval and oversized examples", () => {
  const invalid = catalog();
  invalid.capabilities[0].risk = "trusted";
  assert.throws(() => validateCapabilityCatalog(invalid), /capability risk/);
  const noApproval = catalog();
  noApproval.capabilities[0].approvalRequired = "yes";
  assert.throws(() => validateCapabilityCatalog(noApproval), /approvalRequired must be boolean/);
  const unsafeDisclosure = catalog();
  unsafeDisclosure.capabilities[0].risk = "external";
  unsafeDisclosure.capabilities[0].approvalRequired = false;
  assert.throws(() => validateCapabilityCatalog(unsafeDisclosure), /must declare approvalRequired=true/);
  const tooMany = catalog();
  tooMany.capabilities[0].examples = Array(9).fill("Do the thing");
  assert.throws(() => validateCapabilityCatalog(tooMany), /at most 8/);
});
