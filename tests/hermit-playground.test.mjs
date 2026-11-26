import test from "node:test";
import assert from "node:assert/strict";
import { createHermitPlayground } from "../src/hermit-playground.js";

test("Hermit inspects an object through the registered runtime capability and verifies the observation", async () => {
  const playground = createHermitPlayground();
  const response = await playground.inspect("compass");

  assert.equal(response.status, "completed");
  assert.equal(response.outcomes.length, 1);
  assert.equal(response.outcomes[0].verified, true);
  assert.equal(response.outcomes[0].result.name, "Brass compass");
  assert.ok(response.trace.some(event => event.event === "policy-evaluated" && event.decision === "allow"));
  assert.ok(response.trace.some(event => event.event === "step-verified"));
});

test("Hermit cannot move an object without explicit host approval", async () => {
  const playground = createHermitPlayground();
  const response = await playground.moveToWorkbench("glass");
  const snapshot = await playground.snapshot();

  assert.equal(response.status, "failed");
  assert.equal(response.error.code, "APPROVAL_REQUIRED");
  assert.equal(snapshot.objects.find(item => item.id === "glass").location, "workshop");
  assert.ok(response.trace.some(event => event.event === "policy-evaluated" && event.decision === "approval-required"));
});

test("Hermit moves an object only after approval and verifies the changed world state", async () => {
  const playground = createHermitPlayground();
  const response = await playground.moveToWorkbench("glass", { approvalGranted: true });
  const snapshot = await playground.snapshot();

  assert.equal(response.status, "completed");
  assert.equal(response.outcomes[0].verified, true);
  assert.equal(snapshot.objects.find(item => item.id === "glass").location, "workbench");
  assert.ok(response.trace.some(event => event.event === "step-verified"));
});

test("host policy can deny even an explicitly approved world-changing action", async () => {
  const playground = createHermitPlayground({
    policy: async () => "deny"
  });
  const response = await playground.moveToWorkbench("crate", { approvalGranted: true });
  const snapshot = await playground.snapshot();

  assert.equal(response.status, "failed");
  assert.equal(response.error.code, "POLICY_DENIED");
  assert.equal(snapshot.objects.find(item => item.id === "crate").location, "workshop");
});

test("world snapshots carry a stable schema identity and advance only after a verified world mutation", async () => {
  const playground = createHermitPlayground();
  const before = await playground.snapshot();
  assert.equal(before.schemaVersion, 1);
  assert.equal(before.environmentId, "hermit-workshop");
  assert.equal(before.revision, 0);

  const moved = await playground.moveToWorkbench("glass", { approvalGranted: true });
  const after = await playground.snapshot();
  assert.equal(moved.status, "completed");
  assert.equal(after.revision, 1);
  assert.equal(after.objects.find(item => item.id === "glass").location, "workbench");
});

test("the player can author a bounded object and Hermit can inspect it", async () => {
  const playground = createHermitPlayground();
  const snapshot = await playground.addObject({
    name: "Moon key",
    description: "A tiny key with a crescent-shaped bow."
  });
  const created = snapshot.objects.find(item => item.id === "player-object-1");
  assert.equal(created.name, "Moon key");
  assert.equal(created.location, "workshop");
  assert.equal(snapshot.revision, 1);

  const response = await playground.inspect(created.id);
  assert.equal(response.status, "completed");
  assert.equal(response.outcomes[0].result.description, "A tiny key with a crescent-shaped bow.");
});

test("player-authored object insertion validates the proposed world before changing it", async () => {
  const playground = createHermitPlayground();
  await assert.rejects(
    playground.addObject({ name: "", description: "Invalid name." }),
    /name/
  );
  const snapshot = await playground.snapshot();
  assert.equal(snapshot.objects.length, 3);
  assert.equal(snapshot.revision, 0);
});

test("the player cannot exceed the world-state object bound", async () => {
  const objects = Array.from({ length: 256 }, (_, index) => ({
    id: "fixture-" + index,
    name: "Fixture " + index,
    description: "A bounded fixture object.",
    location: "workshop"
  }));
  const playground = createHermitPlayground({ objects });
  await assert.rejects(
    playground.addObject({ name: "Overflow", description: "Must not be inserted." }),
    /at most 256/
  );
  const snapshot = await playground.snapshot();
  assert.equal(snapshot.objects.length, 256);
  assert.equal(snapshot.revision, 0);
});
