import test from "node:test";
import assert from "node:assert/strict";
import {
  CAPABILITY_CATALOG_VERSION,
  describeCapabilities,
  discoverCapabilities,
  findCapability,
  validateCapabilityCatalog,
  validateCapabilityInput
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
  const mismatchedEnum = catalog();
  mismatchedEnum.capabilities[0].inputSchema.properties.objectId.enum = [42];
  assert.throws(() => validateCapabilityCatalog(mismatchedEnum), /match the declared property type/);
  const wrongKeyword = catalog();
  wrongKeyword.capabilities[0].inputSchema.properties.count = { type: "boolean", minimum: 0 };
  assert.throws(() => validateCapabilityCatalog(wrongKeyword), /numeric bounds are supported only/);
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

test("capability arguments are validated, detached and frozen before host handoff", () => {
  const value = catalog();
  const input = { objectId: "vessel-1" };
  const validated = validateCapabilityInput(value, "browser", "scene.inspect", input);
  assert.deepEqual(validated, input);
  assert.notEqual(validated, input);
  assert.equal(Object.isFrozen(validated), true);
  assert.throws(() => validateCapabilityInput(value, "browser", "scene.inspect", {}), /missing required/);
  assert.throws(() => validateCapabilityInput(value, "browser", "scene.inspect", { objectId: "x".repeat(81) }), /maximum length/);
  assert.throws(() => validateCapabilityInput(value, "browser", "scene.inspect", { objectId: "vessel-1", extra: true }), /undeclared property/);
  assert.throws(() => validateCapabilityInput(value, "browser", "scene.move", { objectId: "vessel-1" }), /not advertised/);
});

test("capability arguments enforce scalar types, numeric bounds and enums", () => {
  const value = catalog();
  value.capabilities[0].inputSchema.properties.count = { type: "integer", minimum: 1, maximum: 3 };
  value.capabilities[0].inputSchema.properties.enabled = { type: "boolean" };
  value.capabilities[0].inputSchema.properties.mode = { type: "string", enum: ["safe", "preview"] };
  const input = { objectId: "vessel-1", count: 2, enabled: false, mode: "safe" };
  assert.deepEqual(validateCapabilityInput(value, "browser", "scene.inspect", input), input);
  assert.throws(() => validateCapabilityInput(value, "browser", "scene.inspect", { ...input, count: 4 }), /numeric bounds/);
  assert.throws(() => validateCapabilityInput(value, "browser", "scene.inspect", { ...input, count: 1.5 }), /wrong type/);
  assert.throws(() => validateCapabilityInput(value, "browser", "scene.inspect", { ...input, mode: "execute" }), /enum value/);
  assert.throws(() => validateCapabilityInput(value, "browser", "scene.inspect", { ...input, enabled: 0 }), /wrong type/);
});

test("capability arguments reject accessors and symbols without invoking them", () => {
  const value = catalog();
  const accessor = {};
  Object.defineProperty(accessor, "objectId", { get() { throw new Error("must not execute"); } });
  assert.throws(() => validateCapabilityInput(value, "browser", "scene.inspect", accessor), /accessors/);
  const symbolic = { objectId: "vessel-1", [Symbol("hidden")]: true };
  assert.throws(() => validateCapabilityInput(value, "browser", "scene.inspect", symbolic), /symbol keys/);
});

test("capability inputs reject hidden non-enumerable properties", () => {
  const hidden = { objectId: "vessel-1" };
  Object.defineProperty(hidden, "covert", { value: true, enumerable: false });
  assert.throws(() => validateCapabilityInput(catalog(), "browser", "scene.inspect", hidden), /hidden properties/);
});

test("validated catalog snapshots can be validated again without changing semantics", () => {
  const first = validateCapabilityCatalog(catalog());
  const second = validateCapabilityCatalog(first);
  assert.deepEqual(second, first);
  assert.equal(Object.isFrozen(second.capabilities[0].inputSchema), true);
  assert.deepEqual(
    validateCapabilityInput(second, "browser", "scene.inspect", { objectId: "vessel-1" }),
    { objectId: "vessel-1" }
  );
});
