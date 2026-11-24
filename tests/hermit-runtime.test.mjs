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


test("snapshots proposal data without invoking getters or toJSON hooks", async () => {
  let getterCalled = false;
  let toJsonCalled = false;
  const { runtime } = setup();
  const argumentsObject = {};
  Object.defineProperty(argumentsObject, "name", {
    enumerable: true,
    get() { getterCalled = true; return "compass"; }
  });
  const accessorResponse = await runtime.execute({
    task: "Inspect the compass.",
    planner: async () => ({ capabilityId: "inspect-item", arguments: argumentsObject })
  });
  assert.equal(accessorResponse.error.code, "INVALID_ARGUMENTS");
  assert.equal(getterCalled, false);

  const hookedArguments = { name: "compass" };
  Object.defineProperty(hookedArguments, "toJSON", {
    enumerable: false,
    value() { toJsonCalled = true; return { name: "compass" }; }
  });
  const hookResponse = await runtime.execute({
    task: "Inspect the compass.",
    planner: async () => ({ capabilityId: "inspect-item", arguments: hookedArguments })
  });
  assert.equal(hookResponse.error.code, "INVALID_ARGUMENTS");
  assert.equal(toJsonCalled, false);
});

test("rejects cyclic proposal arguments without invoking policy", async () => {
  let policyCalled = false;
  const { runtime } = setup({ policy: () => { policyCalled = true; return "allow"; } });
  const cyclic = {};
  cyclic.self = cyclic;
  const response = await runtime.execute({
    task: "Inspect the compass.",
    planner: async () => ({ capabilityId: "inspect-item", arguments: cyclic })
  });
  assert.equal(response.error.code, "INVALID_ARGUMENTS");
  assert.equal(policyCalled, false);
});


test("rejects planner proposal accessors without invoking them", async () => {
  let getterCalled = false;
  const proposal = { arguments: { name: "compass" } };
  Object.defineProperty(proposal, "capabilityId", {
    enumerable: true,
    get() { getterCalled = true; return "inspect-item"; }
  });
  const { runtime } = setup();
  const response = await runtime.execute({
    task: "Inspect the compass.",
    planner: async () => proposal
  });
  assert.equal(response.error.code, "INVALID_PROPOSAL");
  assert.equal(getterCalled, false);
});

test("snapshots capability output without invoking getters or toJSON hooks", async () => {
  let getterCalled = false;
  let toJsonCalled = false;
  const getterOutput = {};
  Object.defineProperty(getterOutput, "description", {
    enumerable: true,
    get() { getterCalled = true; return "A brass compass."; }
  });
  const getterCase = setup({ invoke: async () => getterOutput });
  const getterResponse = await getterCase.runtime.execute({
    task: "Inspect the compass.",
    planner: getterCase.planner
  });
  assert.equal(getterResponse.error.code, "INVALID_TOOL_OUTPUT");
  assert.equal(getterCalled, false);

  const hookedOutput = { description: "A brass compass." };
  Object.defineProperty(hookedOutput, "toJSON", {
    enumerable: false,
    value() { toJsonCalled = true; return { description: "forged" }; }
  });
  const hookCase = setup({ invoke: async () => hookedOutput });
  const hookResponse = await hookCase.runtime.execute({
    task: "Inspect the compass.",
    planner: hookCase.planner
  });
  assert.equal(hookResponse.error.code, "INVALID_TOOL_OUTPUT");
  assert.equal(toJsonCalled, false);
});

test("rejects cyclic, sparse, and non-finite capability output", async () => {
  const cyclic = {};
  cyclic.self = cyclic;
  for (const output of [cyclic, [, "sparse"], { value: Number.POSITIVE_INFINITY }]) {
    const { runtime, planner } = setup({ invoke: async () => output });
    const response = await runtime.execute({ task: "Inspect the compass.", planner });
    assert.equal(response.error.code, "INVALID_TOOL_OUTPUT");
  }
});


test("bounded assistant loop replans after each verified action and gates every step", async () => {
  const registry = new CapabilityRegistry();
  const calls = [];
  registry.register({
    id: "inspect-item", version: "1.0.0", inputSchema: itemSchema,
    invoke: async ({ name }) => { calls.push(name); return { name, inspected: true }; }
  });
  const runtime = new HermitRuntime({ registry, policy: async () => "allow" });
  const response = await runtime.executeLoop({
    task: "Inspect then report the compass.",
    observe: async () => ({ inspected: false }),
    planner: async ({ observation, step }) => observation.inspected
      ? { done: true, result: { summary: "Compass inspected." } }
      : { capabilityId: "inspect-item", arguments: { name: step === 0 ? "compass" : "unexpected" } },
    verify: async ({ result }) => ({ verified: true, observation: { inspected: result.inspected } })
  });
  assert.equal(response.status, "completed");
  assert.deepEqual(calls, ["compass"]);
  assert.equal(response.outcomes.length, 1);
  assert.ok(response.trace.some(event => event.event === "step-verified"));
});

test("assistant loop fails closed when environment does not verify an action", async () => {
  let invoked = false;
  const registry = new CapabilityRegistry();
  registry.register({
    id: "inspect-item", version: "1.0.0", inputSchema: itemSchema,
    invoke: async () => { invoked = true; return { inspected: true }; }
  });
  const runtime = new HermitRuntime({ registry, policy: () => "allow" });
  const response = await runtime.executeLoop({
    task: "Inspect the compass.",
    observe: async () => ({}),
    planner: async () => ({ capabilityId: "inspect-item", arguments: { name: "compass" } }),
    verify: async () => ({ verified: false, observation: {} })
  });
  assert.equal(invoked, true);
  assert.equal(response.status, "failed");
  assert.equal(response.error.code, "RESULT_NOT_VERIFIED");
  assert.equal(response.outcomes.length, 0);
});

test("assistant loop enforces its action-count budget", async () => {
  const registry = new CapabilityRegistry();
  registry.register({
    id: "inspect-item", version: "1.0.0", inputSchema: itemSchema,
    invoke: async () => ({ ok: true })
  });
  const runtime = new HermitRuntime({ registry, policy: () => "allow" });
  const response = await runtime.executeLoop({
    task: "Keep inspecting.",
    maxSteps: 2,
    observe: async () => ({}),
    planner: async () => ({ capabilityId: "inspect-item", arguments: { name: "compass" } }),
    verify: async ({ step }) => ({ verified: true, observation: { count: step } })
  });
  assert.equal(response.status, "failed");
  assert.equal(response.error.code, "STEP_LIMIT_REACHED");
  assert.equal(response.outcomes.length, 2);
});


test("checkpointed loop persists before invocation and only advances after verification", async () => {
  const { createCheckpointRepository } = await import("../src/checkpoint-repository.js");
  const values = new Map();
  const repository = createCheckpointRepository({
    async read(id) { return values.get(id) ?? null; },
    async compareAndSwap(id, expected, serialized) {
      const current = values.get(id);
      const revision = current ? JSON.parse(current).revision : 0;
      if (revision !== expected) return false;
      values.set(id, serialized);
      return true;
    }
  });
  const registry = new CapabilityRegistry();
  let checkpointAtInvoke;
  registry.register({
    id: "inspect-item", version: "1.0.0", inputSchema: itemSchema,
    invoke: async () => {
      checkpointAtInvoke = JSON.parse(values.get("checkpoint-loop-1"));
      return { inspected: true };
    }
  });
  const runtime = new HermitRuntime({ registry, policy: () => "allow" });
  const response = await runtime.executeLoop({
    taskId: "checkpoint-loop-1",
    checkpointRepository: repository,
    task: "Inspect the compass.",
    observe: async () => ({ inspected: false }),
    planner: async ({ observation }) => observation.inspected
      ? { done: true, result: { completed: true } }
      : { capabilityId: "inspect-item", arguments: { name: "compass" } },
    verify: async ({ result }) => ({ verified: true, observation: { inspected: result.inspected } })
  });
  assert.equal(response.status, "completed");
  assert.equal(checkpointAtInvoke.phase, "execution-started");
  assert.equal(checkpointAtInvoke.pendingAction.idempotencyKey, "checkpoint-loop-1:0");
  const final = await repository.load("checkpoint-loop-1");
  assert.equal(final.checkpoint.phase, "completed");
  assert.equal(final.checkpoint.revision, 4);
  assert.equal(final.checkpoint.outcomes.length, 1);
});

test("checkpointed loop refuses to overwrite an existing task checkpoint", async () => {
  const { createCheckpointRepository } = await import("../src/checkpoint-repository.js");
  const values = new Map();
  const repository = createCheckpointRepository({
    async read(id) { return values.get(id) ?? null; },
    async compareAndSwap(id, expected, serialized) {
      const current = values.get(id);
      const revision = current ? JSON.parse(current).revision : 0;
      if (revision !== expected) return false;
      values.set(id, serialized);
      return true;
    }
  });
  const registry = new CapabilityRegistry();
  const runtime = new HermitRuntime({ registry, policy: () => "allow" });
  const seed = { taskId: "checkpoint-existing", task: "Existing task", revision: 1, phase: "ready", nextStep: 0, observation: {}, outcomes: [], pendingAction: null };
  await repository.save(seed);
  const response = await runtime.executeLoop({
    taskId: seed.taskId, checkpointRepository: repository, task: seed.task,
    observe: async () => ({}), planner: async () => ({ done: true }),
    verify: async () => ({ verified: true, observation: {} })
  });
  assert.equal(response.status, "failed");
  assert.equal(response.error.code, "CHECKPOINT_EXISTS");
  assert.equal((await repository.load(seed.taskId)).checkpoint.revision, 1);
});


test("checkpointed loop persists terminal failure when no action is in flight", async () => {
  const { createCheckpointRepository } = await import("../src/checkpoint-repository.js");
  const values = new Map();
  const repository = createCheckpointRepository({
    async read(id) { return values.get(id) ?? null; },
    async compareAndSwap(id, expected, serialized) {
      const current = values.get(id);
      const revision = current ? JSON.parse(current).revision : 0;
      if (revision !== expected) return false;
      values.set(id, serialized);
      return true;
    }
  });
  const runtime = new HermitRuntime({ registry: new CapabilityRegistry(), policy: () => "allow" });
  const response = await runtime.executeLoop({
    taskId: "checkpoint-failure", checkpointRepository: repository,
    task: "Inspect the compass.", observe: async () => ({ ready: true }),
    planner: async () => { throw new Error("planner unavailable"); },
    verify: async () => ({ verified: true, observation: {} })
  });
  assert.equal(response.status, "failed");
  const stored = await repository.load("checkpoint-failure");
  assert.equal(stored.checkpoint.phase, "failed");
  assert.equal(stored.recovery, "terminal");
});

test("checkpointed loop preserves in-flight marker after verification failure", async () => {
  const { createCheckpointRepository } = await import("../src/checkpoint-repository.js");
  const values = new Map();
  const repository = createCheckpointRepository({
    async read(id) { return values.get(id) ?? null; },
    async compareAndSwap(id, expected, serialized) {
      const current = values.get(id);
      const revision = current ? JSON.parse(current).revision : 0;
      if (revision !== expected) return false;
      values.set(id, serialized);
      return true;
    }
  });
  const registry = new CapabilityRegistry();
  registry.register({
    id: "inspect-item", version: "1.0.0", inputSchema: itemSchema,
    invoke: async () => ({ inspected: true })
  });
  const runtime = new HermitRuntime({ registry, policy: () => "allow" });
  const response = await runtime.executeLoop({
    taskId: "checkpoint-uncertain", checkpointRepository: repository,
    task: "Inspect the compass.", observe: async () => ({}),
    planner: async () => ({ capabilityId: "inspect-item", arguments: { name: "compass" } }),
    verify: async () => { throw new Error("environment unavailable"); }
  });
  assert.equal(response.status, "failed");
  const stored = await repository.load("checkpoint-uncertain");
  assert.equal(stored.checkpoint.phase, "execution-started");
  assert.equal(stored.recovery, "reconcile-required");
});


test("resumes a ready checkpoint from its saved observation, outcomes and cursor", async () => {
  const { createCheckpointRepository } = await import("../src/checkpoint-repository.js");
  const values = new Map();
  const repository = createCheckpointRepository({
    async read(id) { return values.get(id) ?? null; },
    async compareAndSwap(id, expected, serialized) {
      const current = values.get(id);
      const revision = current ? JSON.parse(current).revision : 0;
      if (revision !== expected) return false;
      values.set(id, serialized);
      return true;
    }
  });
  const seed = {
    taskId: "resume-ready", task: "Inspect the compass.", revision: 4,
    phase: "ready", nextStep: 1,
    observation: { inspected: true, environmentRevision: 9 },
    outcomes: [{ step: 1, capabilityId: "inspect-item", result: { inspected: true }, verified: true }],
    pendingAction: null
  };
  await repository.save(seed, { expectedRevision: 3 });
  const runtime = new HermitRuntime({ registry: new CapabilityRegistry(), policy: () => "allow" });
  let observed = false;
  let planned;
  const response = await runtime.executeLoop({
    taskId: seed.taskId, checkpointRepository: repository, resume: true,
    task: seed.task, observe: async () => { observed = true; return {}; },
    planner: async context => { planned = context; return { done: true, result: { continued: true } }; },
    verify: async () => ({ verified: true, observation: {} })
  });
  assert.equal(response.status, "completed");
  assert.equal(observed, false);
  assert.deepEqual(planned.observation, seed.observation);
  assert.deepEqual(planned.outcomes, seed.outcomes);
  assert.equal(planned.step, 1);
  const final = await repository.load(seed.taskId);
  assert.equal(final.checkpoint.phase, "completed");
  assert.equal(final.checkpoint.revision, 5);
});

test("refuses interrupted checkpoint resume until the host reconciles it", async () => {
  const { createCheckpointRepository } = await import("../src/checkpoint-repository.js");
  const values = new Map();
  const repository = createCheckpointRepository({
    async read(id) { return values.get(id) ?? null; },
    async compareAndSwap(id, expected, serialized) {
      const current = values.get(id);
      const revision = current ? JSON.parse(current).revision : 0;
      if (revision !== expected) return false;
      values.set(id, serialized);
      return true;
    }
  });
  const seed = {
    taskId: "resume-interrupted", task: "Inspect the compass.", revision: 1,
    phase: "execution-started", nextStep: 0, observation: { inspected: false }, outcomes: [],
    pendingAction: { capabilityId: "inspect-item", arguments: { name: "compass" }, idempotencyKey: "resume-interrupted:0" }
  };
  await repository.save(seed);
  const runtime = new HermitRuntime({ registry: new CapabilityRegistry(), policy: () => "allow" });
  let observed = false;
  const base = {
    taskId: seed.taskId, checkpointRepository: repository, resume: true,
    task: seed.task, observe: async () => { observed = true; return {}; },
    planner: async () => ({ done: true }),
    verify: async () => ({ verified: true, observation: {} })
  };
  const blocked = await runtime.executeLoop(base);
  assert.equal(blocked.error.code, "RECONCILIATION_REQUIRED");
  assert.equal(observed, false);
  let reconciled = false;
  const resumed = await runtime.executeLoop({
    ...base,
    reconcile: async pending => {
      reconciled = true;
      assert.equal(pending.pendingAction.idempotencyKey, "resume-interrupted:0");
      return { actionApplied: false, observation: { inspected: false, reconciled: true } };
    }
  });
  assert.equal(reconciled, true);
  assert.equal(resumed.status, "completed");
  assert.equal(observed, false);
  const final = await repository.load(seed.taskId);
  assert.equal(final.checkpoint.phase, "completed");
  assert.equal(final.checkpoint.nextStep, 0);
});

test("rejects task mismatch and terminal checkpoints before observing or planning", async () => {
  const { createCheckpointRepository } = await import("../src/checkpoint-repository.js");
  const values = new Map();
  const repository = createCheckpointRepository({
    async read(id) { return values.get(id) ?? null; },
    async compareAndSwap(id, expected, serialized) {
      const current = values.get(id);
      const revision = current ? JSON.parse(current).revision : 0;
      if (revision !== expected) return false;
      values.set(id, serialized);
      return true;
    }
  });
  const runtime = new HermitRuntime({ registry: new CapabilityRegistry(), policy: () => "allow" });
  const seed = {
    taskId: "resume-guards", task: "Original task.", revision: 1,
    phase: "ready", nextStep: 0, observation: {}, outcomes: [], pendingAction: null
  };
  await repository.save(seed);
  let adapterCalls = 0;
  const common = {
    taskId: seed.taskId, checkpointRepository: repository, resume: true,
    observe: async () => { adapterCalls += 1; return {}; },
    planner: async () => { adapterCalls += 1; return { done: true }; },
    verify: async () => ({ verified: true, observation: {} })
  };
  const mismatch = await runtime.executeLoop({ ...common, task: "Different task." });
  assert.equal(mismatch.error.code, "CHECKPOINT_TASK_MISMATCH");
  assert.equal(adapterCalls, 0);
  const terminalSeed = { ...seed, taskId: "resume-terminal", phase: "completed" };
  await repository.save(terminalSeed);
  const terminal = await runtime.executeLoop({ ...common, taskId: terminalSeed.taskId, task: seed.task });
  assert.equal(terminal.error.code, "CHECKPOINT_TERMINAL");
  assert.equal(adapterCalls, 0);
});
