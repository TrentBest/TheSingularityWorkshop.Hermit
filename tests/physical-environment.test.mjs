import test from "node:test";
import assert from "node:assert/strict";
import {
  createPhysicalActionRequest,
  createPhysicalEnvironmentAdapter
} from "../src/physical-environment.js";

function snapshot(revision, x = 0) {
  return {
    schemaVersion: 2, environmentId: "physics-fixture", revision,
    objects: [{
      id: "crate", name: "Crate", description: "Fixture body",
      location: "floor", position: { x, y: 0, z: 0 }
    }]
  };
}
function request(expectedRevision = 0) {
  return {
    schemaVersion: 1, requestId: "request-1",
    environmentId: "physics-fixture", expectedRevision,
    actorId: "hermit", actionId: "push", targetId: "crate",
    parameters: { force: 2 }
  };
}

test("physical action proposals are versioned immutable intent, not authority", () => {
  const proposal = createPhysicalActionRequest(request());
  assert.equal(proposal.schemaVersion, 1);
  assert.equal(proposal.actionId, "push");
  assert.ok(Object.isFrozen(proposal));
  assert.ok(Object.isFrozen(proposal.parameters));
  assert.throws(() => createPhysicalActionRequest({ ...request(), privileged: true }), /properties/);
  assert.throws(() => createPhysicalActionRequest({ ...request(), expectedRevision: -1 }), /expectedRevision/);
});

test("stale observations are rejected before execute is called", async () => {
  let calls = 0;
  const adapter = createPhysicalEnvironmentAdapter({
    observe: async () => snapshot(2),
    execute: async () => { calls += 1; return { status: "achieved", observation: snapshot(3, 1) }; }
  });
  const result = await adapter.perform(request(1));
  assert.equal(result.status, "stale-observation");
  assert.equal(result.verified, false);
  assert.equal(calls, 0);
});

test("achievement is verified only against a newer owner-supplied observation", async () => {
  const adapter = createPhysicalEnvironmentAdapter({
    observe: async () => snapshot(0),
    execute: async () => ({ status: "achieved", observation: snapshot(1, 1), evidence: { contact: true } })
  });
  const result = await adapter.perform(request());
  assert.equal(result.status, "achieved");
  assert.equal(result.verified, true);
  assert.equal(result.observation.revision, 1);
  assert.equal(result.observation.objects[0].position.x, 1);
});

test("achievement without a newer observation is downgraded to unverified", async () => {
  const adapter = createPhysicalEnvironmentAdapter({
    observe: async () => snapshot(0),
    execute: async () => ({ status: "achieved", observation: snapshot(0) })
  });
  const result = await adapter.perform(request());
  assert.equal(result.status, "unverified");
  assert.equal(result.verified, false);
});

test("rejected and interrupted actions remain distinct from success", async () => {
  for (const status of ["rejected", "interrupted"]) {
    const adapter = createPhysicalEnvironmentAdapter({
      observe: async () => snapshot(0),
      execute: async () => ({ status, observation: snapshot(0) })
    });
    const result = await adapter.perform(request());
    assert.equal(result.status, status);
    assert.equal(result.verified, false);
  }
});

test("the adapter rejects regressing and cross-environment observations", async () => {
  let reads = 0;
  const regressing = createPhysicalEnvironmentAdapter({
    observe: async () => ++reads === 1 ? snapshot(2) : snapshot(1),
    execute: async () => ({ status: "rejected", observation: snapshot(2) })
  });
  await regressing.observe();
  await assert.rejects(regressing.observe(), /regressed/);

  const foreign = createPhysicalEnvironmentAdapter({
    observe: async () => snapshot(0),
    execute: async () => ({
      status: "achieved",
      observation: { ...snapshot(1), environmentId: "other-environment" }
    })
  });
  await assert.rejects(foreign.perform(request()), /same environment/);
});
