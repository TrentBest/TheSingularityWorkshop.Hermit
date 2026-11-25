import test from "node:test";
import assert from "node:assert/strict";
import {
  ContinuityProtocolError,
  continuityProtocol,
  validateChangePage,
  validateEventAppend,
  validateStateWrite,
  validateSyncRequest
} from "../src/continuity-protocol.js";

const principal = Object.freeze({ ownerId: "owner-1" });
const device = { schemaVersion: 1, deviceId: "phone-1", hostType: "web" };

function code(expected, action) {
  assert.throws(action, error =>
    error instanceof ContinuityProtocolError && error.code === expected);
}

test("sync requests bind owner scope to trusted authentication, not request claims", () => {
  assert.deepEqual(validateSyncRequest({ ...device, cursor: null, limit: 25 }, principal), {
    schemaVersion: 1, ownerId: "owner-1", deviceId: "phone-1",
    hostType: "web", cursor: null, limit: 25
  });
  code("UNAUTHENTICATED", () => validateSyncRequest(device, null));
  code("OWNER_MISMATCH", () => validateSyncRequest({ ...device, ownerId: "victim" }, principal));
  code("UNSUPPORTED_SCHEMA", () => validateSyncRequest({ ...device, schemaVersion: 2 }, principal));
});

test("sync cursors and page sizes are bounded and validated", () => {
  code("INVALID_CURSOR", () => validateSyncRequest({ ...device, cursor: "x".repeat(513) }, principal));
  code("INVALID_PAYLOAD", () => validateSyncRequest({ ...device, limit: 501 }, principal));
  assert.equal(validateSyncRequest({ ...device, limit: 500 }, principal).limit, 500);
});

test("state writes carry a base revision and a bounded portable payload", () => {
  const write = validateStateWrite({
    ...device, baseRevision: 4, values: { theme: "dark", flags: { compact: true } }
  }, principal);
  assert.equal(write.ownerId, "owner-1");
  assert.equal(write.baseRevision, 4);
  assert.deepEqual(write.values.flags, { compact: true });
  code("INVALID_PAYLOAD", () => validateStateWrite({
    ...device, baseRevision: -1, values: {}
  }, principal));
  code("PAYLOAD_TOO_LARGE", () => validateStateWrite({
    ...device, baseRevision: 0, values: { note: "x".repeat(65_537) }
  }, principal));
});

test("event append requires stable event identity and supports idempotent storage contracts", () => {
  const event = validateEventAppend({
    ...device, eventId: "evt-1", eventType: "task-progress", payload: { taskId: "task-1" }
  }, principal);
  assert.equal(event.eventId, "evt-1");
  assert.deepEqual(event.payload, { taskId: "task-1" });
  code("INVALID_PAYLOAD", () => validateEventAppend({
    ...device, eventId: "../bad", eventType: "task-progress"
  }, principal));
});

test("untrusted payloads reject accessors, cycles, sparse arrays and dangerous keys", () => {
  const accessor = {};
  Object.defineProperty(accessor, "secret", { enumerable: true, get() { throw new Error("executed"); } });
  code("INVALID_PAYLOAD", () => validateStateWrite({
    ...device, baseRevision: 0, values: accessor
  }, principal));

  const cyclic = {};
  cyclic.self = cyclic;
  code("INVALID_PAYLOAD", () => validateStateWrite({
    ...device, baseRevision: 0, values: cyclic
  }, principal));

  const sparse = [];
  sparse.length = 2;
  code("INVALID_PAYLOAD", () => validateEventAppend({
    ...device, eventId: "evt-2", eventType: "task-progress", payload: { sparse }
  }, principal));

  const dangerous = JSON.parse('{"__proto__":{"admin":true}}');
  code("INVALID_PAYLOAD", () => validateStateWrite({
    ...device, baseRevision: 0, values: dangerous
  }, principal));
});

test("change pages enforce owner scope, opaque cursor and monotonic sequence", () => {
  const page = validateChangePage({
    schemaVersion: 1, ownerId: "owner-1", nextCursor: "opaque:next",
    changes: [
      { changeId: "change-1", sequence: 10, kind: "state" },
      { changeId: "change-2", sequence: 11, kind: "event" }
    ]
  }, "owner-1");
  assert.equal(page.changes.length, 2);
  assert.equal(page.nextCursor, "opaque:next");
  code("OWNER_MISMATCH", () => validateChangePage({
    schemaVersion: 1, ownerId: "owner-2", nextCursor: "next", changes: []
  }, "owner-1"));
  code("INVALID_PAYLOAD", () => validateChangePage({
    schemaVersion: 1, ownerId: "owner-1", nextCursor: "next",
    changes: [{ changeId: "a", sequence: 2 }, { changeId: "b", sequence: 2 }]
  }, "owner-1"));
  code("INVALID_CURSOR", () => validateChangePage({
    schemaVersion: 1, ownerId: "owner-1", nextCursor: "", changes: []
  }, "owner-1"));
});

test("protocol limits are explicit and provider-neutral", () => {
  assert.deepEqual(continuityProtocol, {
    schemaVersion: 1, maxRecordBytes: 65_536, maxPageSize: 500
  });
});
