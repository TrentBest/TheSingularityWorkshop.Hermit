import test from "node:test";
import assert from "node:assert/strict";
import {
  ContinuityServiceError,
  createContinuityService
} from "../src/continuity-service.js";

function fixture() {
  const states = new Map();
  const events = new Map();
  const feeds = new Map();
  const calls = [];
  const store = {
    async readState(ownerId) {
      calls.push(["readState", ownerId]);
      return { ownerId, revision: 0, values: {} };
    },
    async compareAndSwapState(ownerId, revision, values) {
      calls.push(["compareAndSwapState", ownerId, revision]);
      const current = states.get(ownerId) ?? 0;
      if (revision !== current) return false;
      states.set(ownerId, current + 1);
      return { ownerId, revision: current + 1 };
    },
    async appendEvent(ownerId, event) {
      calls.push(["appendEvent", ownerId, event.eventId]);
      const key = ownerId + ":" + event.eventId;
      if (events.has(key)) return { ownerId, appended: false };
      events.set(key, event);
      return { ownerId, appended: true };
    },
    async readChanges(ownerId, cursor, limit) {
      calls.push(["readChanges", ownerId, cursor, limit]);
      return feeds.get(ownerId) ?? {
        schemaVersion: 1, ownerId, changes: [], nextCursor: "cursor-1"
      };
    }
  };
  const service = createContinuityService({
    authenticate: async context => context?.principal ?? null,
    authorizeDevice: async ({ principal, deviceId, hostType, operation }) =>
      principal.ownerId === "owner-1" && deviceId === "phone-1" &&
      hostType === "web" && operation !== "revoked",
    store
  });
  return { service, store, states, events, feeds, calls };
}

const body = { schemaVersion: 1, deviceId: "phone-1", hostType: "web" };
const context = { principal: { ownerId: "owner-1" } };
function code(expected, action) {
  return assert.rejects(action, error =>
    error instanceof ContinuityServiceError && error.code === expected);
}

test("sync authenticates before validating owner scope and returns owner-scoped data", async () => {
  const { service, calls } = fixture();
  const result = await service.handleSync({ context, body: { ...body, cursor: null, limit: 10 } });
  assert.equal(result.ownerId, "owner-1");
  assert.equal(result.nextCursor, "cursor-1");
  assert.deepEqual(result.state, { revision: 0, values: {} });
  assert.deepEqual(calls.map(call => call[0]), ["readState", "readChanges"]);
  await code("UNAUTHENTICATED", () =>
    service.handleSync({ context: {}, body: { ...body, ownerId: "owner-1" } }));
  await code("OWNER_MISMATCH", () =>
    service.handleSync({ context, body: { ...body, ownerId: "owner-2" } }));
});

test("missing and revoked device authorization fail closed before storage access", async () => {
  const { service, calls } = fixture();
  await code("DEVICE_UNAUTHORIZED", () => service.handleSync({
    context, body: { ...body, deviceId: "revoked-device", cursor: null }
  }));
  assert.equal(calls.length, 0);
});

test("conditional state writes map stale revisions to explicit conflicts", async () => {
  const { service, states } = fixture();
  const written = await service.handleStateWrite({
    context, body: { ...body, baseRevision: 0, values: { theme: "dark" } }
  });
  assert.equal(written.revision, 1);
  await code("STALE_REVISION", () => service.handleStateWrite({
    context, body: { ...body, baseRevision: 0, values: { theme: "light" } }
  }));
  assert.equal(states.get("owner-1"), 1);
});

test("event append is idempotent and does not trust owner claims", async () => {
  const { service, events } = fixture();
  const request = { ...body, eventId: "evt-1", eventType: "task-progress", payload: { step: 1 } };
  assert.equal((await service.handleEventAppend({ context, body: request })).appended, true);
  assert.equal((await service.handleEventAppend({ context, body: request })).appended, false);
  assert.equal(events.size, 1);
  await code("OWNER_MISMATCH", () => service.handleEventAppend({
    context, body: { ...request, ownerId: "owner-2" }
  }));
});

test("change-feed owner leakage and oversized pages are rejected", async () => {
  const { service, feeds } = fixture();
  feeds.set("owner-1", {
    schemaVersion: 1, ownerId: "owner-2", changes: [], nextCursor: "cursor-2"
  });
  await code("OWNER_MISMATCH", () =>
    service.handleSync({ context, body: { ...body, cursor: null, limit: 10 } }));
  feeds.set("owner-1", {
    schemaVersion: 1, ownerId: "owner-1",
    changes: [{ changeId: "c1", sequence: 1 }, { changeId: "c2", sequence: 2 }],
    nextCursor: "cursor-3"
  });
  await code("INVALID_STORE_RESPONSE", () =>
    service.handleSync({ context, body: { ...body, cursor: null, limit: 1 } }));
});

test("state and event adapters cannot return another owner's records", async () => {
  const { service, store } = fixture();
  store.readState = async () => ({ ownerId: "owner-2", revision: 0, values: {} });
  await code("OWNER_MISMATCH", () =>
    service.handleSync({ context, body: { ...body, cursor: null } }));
  store.appendEvent = async () => ({ ownerId: "owner-2", appended: true });
  await code("INVALID_STORE_RESPONSE", () => service.handleEventAppend({
    context, body: { ...body, eventId: "evt-2", eventType: "note" }
  }));
});

test("adapter failures are normalized without exposing storage internals", async () => {
  const { service, store } = fixture();
  store.readState = async () => { throw new Error("database password=secret"); };
  await assert.rejects(
    service.handleSync({ context, body: { ...body, cursor: null } }),
    error => error.code === "STORE_FAILURE" && !error.message.includes("secret")
  );
});

test("host authorization failures are distinguished from storage failures", async () => {
  const { store } = fixture();
  const service = createContinuityService({
    authenticate: async () => ({ ownerId: "owner-1" }),
    authorizeDevice: async () => { throw new Error("revocation lookup unavailable"); },
    store
  });
  await code("DEVICE_UNAUTHORIZED", () => service.handleStateWrite({
    context, body: { ...body, baseRevision: 0, values: {} }
  }));
});
