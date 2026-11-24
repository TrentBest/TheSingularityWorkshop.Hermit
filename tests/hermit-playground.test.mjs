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
