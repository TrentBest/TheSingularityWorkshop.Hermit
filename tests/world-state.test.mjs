import test from "node:test";
import assert from "node:assert/strict";
import {
  WORLD_STATE_SCHEMA_VERSION,
  createWorldStateSnapshot,
  validateWorldStateSnapshot
} from "../src/world-state.js";

const sample = () => ({
  environmentId: "hermit-workshop",
  revision: 7,
  objects: [
    { id: "glass", name: "Glass vessel", description: "An empty vessel.", location: "workshop" },
    { id: "crate", name: "Parts crate", description: "A small crate.", location: "workbench" }
  ]
});

test("world snapshots are versioned, immutable, and detached from caller-owned objects", () => {
  const input = sample();
  const snapshot = createWorldStateSnapshot(input);
  input.objects[0].location = "changed-outside";
  assert.equal(snapshot.schemaVersion, WORLD_STATE_SCHEMA_VERSION);
  assert.equal(snapshot.revision, 7);
  assert.equal(snapshot.objects[0].location, "workshop");
  assert.ok(Object.isFrozen(snapshot));
  assert.ok(Object.isFrozen(snapshot.objects));
  assert.ok(Object.isFrozen(snapshot.objects[0]));
});

test("snapshot validation returns a fresh immutable copy", () => {
  const snapshot = createWorldStateSnapshot(sample());
  const validated = validateWorldStateSnapshot(snapshot);
  assert.notEqual(validated, snapshot);
  assert.deepEqual(validated, snapshot);
  assert.ok(Object.isFrozen(validated));
});

test("duplicate object identities are rejected", () => {
  const input = sample();
  input.objects.push({ ...input.objects[0] });
  assert.throws(() => createWorldStateSnapshot(input), /duplicate object identity/);
});

test("unknown properties and unsupported schema versions fail closed", () => {
  assert.throws(() => createWorldStateSnapshot({ ...sample(), extra: true }), /unsupported properties/);
  assert.throws(() => validateWorldStateSnapshot({ ...createWorldStateSnapshot(sample()), schemaVersion: 2 }), /unsupported schemaVersion/);
});

test("invalid revisions, identities, oversized collections, and executable properties are rejected", () => {
  assert.throws(() => createWorldStateSnapshot({ ...sample(), revision: -1 }), /revision/);
  assert.throws(() => createWorldStateSnapshot({ ...sample(), environmentId: "../outside" }), /environmentId/);
  assert.throws(() => createWorldStateSnapshot({ ...sample(), objects: Array(257).fill(sample().objects[0]) }), /at most 256/);

  const hostile = sample();
  Object.defineProperty(hostile.objects[0], "name", {
    enumerable: true,
    get() { throw new Error("getter must never execute"); }
  });
  assert.throws(() => createWorldStateSnapshot(hostile), /data properties only/);
});
