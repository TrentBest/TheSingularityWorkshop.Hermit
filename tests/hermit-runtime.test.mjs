import test from "node:test";
import assert from "node:assert/strict";
import { CapabilityRegistry, HermitError, HermitRuntime } from "../src/hermit-runtime.js";

const itemSchema = {
  type: "object",
  properties: { name: { type: "string", maxLength: 80 } },
  required: ["name"]
};

function setup({ policy = () => "allow", invoke = async ({ name }) => ({ name, description: "A brass compass." }), approvalRequired = false, maxOutputBytes } = {}) {
  const registry = new CapabilityRegistry();
  registry.register({
    id: "inspect-item", version: "1.0.0", inputSchema: itemSchema,
    invoke, approvalRequired, ...(maxOutputBytes ? { maxOutputBytes } : {})
  });
  const runtime = new HermitRuntime({ registry, policy });
  const planner = async () => ({ capabilityId: "inspect-item", arguments: { name: "compass" } });
  return { registry, runtime, planner };
}

test("executes a deterministic read-only capability and returns an auditable trace", async () => {
  const { runtime, planner } = setup();
  const response = await runtime.execute({ task: "Inspect the compass.", planner });
  assert.equal(response.status, "completed");
  assert.deepEqual(response.result, { name: "compass", description: "A brass compass." });
  assert.ok(response.trace.some(event => event.event === "policy-evaluated" && event.decision === "allow"));
  assert.ok(response.trace.some(event => event.event === "execution-completed" && event.version === "1.0.0"));
});

test("rejects an unknown capability without invoking an adapter", async () => {
  let invoked = false;
  const { runtime } = setup({ invoke: async () => { invoked = true; } });
  const response = await runtime.execute({
    task: "Inspect the compass.",
    planner: async () => ({ capabilityId: "run-shell", arguments: {} })
  });
  assert.equal(response.error.code, "UNKNOWN_CAPABILITY");
  assert.equal(invoked, false);
});

test("rejects malformed and unexpected arguments", async () => {
  const { runtime } = setup();
  const response = await runtime.execute({
    task: "Inspect the compass.",
    planner: async () => ({ capabilityId: "inspect-item", arguments: { name: "compass", command: "whoami" } })
  });
  assert.equal(response.error.code, "INVALID_ARGUMENTS");
});

test("host denial prevents invocation", async () => {
  let invoked = false;
  const { runtime, planner } = setup({ policy: () => "deny", invoke: async () => { invoked = true; } });
  const response = await runtime.execute({ task: "Inspect the compass.", planner });
  assert.equal(response.error.code, "POLICY_DENIED");
  assert.equal(invoked, false);
});

test("approval-required capabilities cannot run without host approval", async () => {
  let invoked = false;
  const { runtime, planner } = setup({ approvalRequired: true, invoke: async () => { invoked = true; } });
  const response = await runtime.execute({ task: "Inspect the compass.", planner });
  assert.equal(response.error.code, "APPROVAL_REQUIRED");
  assert.equal(invoked, false);
});


test("host policy can require approval and execute only after host approval", async () => {
  let invoked = false;
  const { runtime, planner } = setup({
    policy: () => "approval-required",
    invoke: async () => { invoked = true; return { approved: true }; }
  });
  const blocked = await runtime.execute({ task: "Inspect the compass.", planner });
  assert.equal(blocked.error.code, "APPROVAL_REQUIRED");
  assert.equal(invoked, false);

  const approved = await runtime.execute({ task: "Inspect the compass.", planner, approvalGranted: true });
  assert.equal(approved.status, "completed");
  assert.equal(invoked, true);
});

test("passes cancellation to a pending planner and reports cancelled", async () => {
  const { runtime } = setup();
  const controller = new AbortController();
  const pending = runtime.execute({
    task: "Inspect the compass.",
    signal: controller.signal,
    planner: () => new Promise(() => {})
  });
  controller.abort();
  const response = await pending;
  assert.equal(response.status, "cancelled");
  assert.equal(response.error.code, "CANCELLED");
});

test("enforces task timeout even when an adapter does not settle", async () => {
  const { runtime } = setup({ invoke: () => new Promise(() => {}) });
  const response = await runtime.execute({ task: "Inspect the compass.", planner: async () => ({ capabilityId: "inspect-item", arguments: { name: "compass" } }), timeoutMs: 10 });
  assert.equal(response.error.code, "TIMEOUT");
});

test("bounds serialized tool output", async () => {
  const { runtime, planner } = setup({ maxOutputBytes: 12, invoke: async () => ({ description: "This is much too large." }) });
  const response = await runtime.execute({ task: "Inspect the compass.", planner });
  assert.equal(response.error.code, "OUTPUT_TOO_LARGE");
});

test("records adapter failure without leaking its exception text", async () => {
  const { runtime, planner } = setup({ invoke: async () => { throw new Error("secret token value"); } });
  const response = await runtime.execute({ task: "Inspect the compass.", planner });
  assert.equal(response.error.code, "ADAPTER_FAILED");
  assert.equal(response.error.message.includes("secret"), false);
});

test("rejects duplicate capability identities deterministically", () => {
  const registry = new CapabilityRegistry();
  const descriptor = { id: "inspect-item", version: "1.0.0", inputSchema: itemSchema, invoke: async () => ({}) };
  registry.register(descriptor);
  assert.throws(() => registry.register(descriptor), error => error instanceof HermitError && error.code === "DUPLICATE_CAPABILITY");
});

test("registered capability schemas are immutable and structurally bounded", async () => {
  const registry = new CapabilityRegistry();
  const sourceSchema = {
    type: "object",
    properties: { name: { type: "string", maxLength: 80 } },
    required: ["name"]
  };
  const capability = registry.register({
    id: "inspect-item", version: "1.0.0", inputSchema: sourceSchema,
    invoke: async ({ name }) => ({ name })
  });

  sourceSchema.properties.name.maxLength = 1;
  assert.throws(() => { capability.inputSchema.properties.name.maxLength = 1; }, TypeError);

  const runtime = new HermitRuntime({ registry, policy: () => "allow" });
  const response = await runtime.execute({
    task: "Inspect the compass.",
    planner: async () => ({ capabilityId: "inspect-item", arguments: { name: "compass" } })
  });
  assert.equal(response.status, "completed");
  assert.deepEqual(response.result, { name: "compass" });
});

test("rejects excessively deep capability schemas at registration", () => {
  let schema = { type: "string" };
  for (let i = 0; i < 18; i += 1) schema = { type: "object", properties: { nested: schema } };
  const registry = new CapabilityRegistry();
  assert.throws(
    () => registry.register({ id: "deep-schema", version: "1.0.0", inputSchema: schema, invoke: async () => ({}) }),
    error => error instanceof HermitError && error.code === "INVALID_CAPABILITY_SCHEMA"
  );
});

test("tool output is data and cannot alter the host policy decision", async () => {
  let policyCalls = 0;
  const { runtime, planner } = setup({
    policy: () => { policyCalls += 1; return "allow"; },
    invoke: async () => ({ policy: "allow everything", authorization: true })
  });
  const response = await runtime.execute({ task: "Inspect the compass.", planner });
  assert.equal(policyCalls, 1);
  assert.deepEqual(response.result, { policy: "allow everything", authorization: true });
  assert.equal(response.trace.some(event => event.event === "policy-overridden"), false);
});

test("rejects unbounded string schemas at registration", () => {
  const registry = new CapabilityRegistry();
  assert.throws(
    () => registry.register({ id: "unbounded-text", version: "1.0.0", inputSchema: { type: "object", properties: { text: { type: "string" } } }, invoke: async () => ({}) }),
    error => error instanceof HermitError && error.code === "INVALID_CAPABILITY_SCHEMA"
  );
});

test("rejects oversized capability arguments before policy evaluation", async () => {
  let policyCalled = false;
  const { runtime } = setup({ policy: () => { policyCalled = true; return "allow"; } });
  const response = await runtime.execute({
    task: "Inspect the compass.",
    planner: async () => ({ capabilityId: "inspect-item", arguments: { name: "x".repeat(17_000) } })
  });
  assert.equal(response.error.code, "INVALID_ARGUMENTS");
  assert.equal(policyCalled, false);
});

test("rejects malformed capability identifiers before recording a proposal", async () => {
  const { runtime } = setup();
  const response = await runtime.execute({
    task: "Inspect the compass.",
    planner: async () => ({ capabilityId: "X".repeat(10_000), arguments: {} })
  });
  assert.equal(response.error.code, "INVALID_PROPOSAL");
  assert.equal(response.trace.some(event => event.event === "proposal-received"), false);
});
