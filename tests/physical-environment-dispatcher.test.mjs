import test from "node:test";
import assert from "node:assert/strict";
import { createCapabilityDispatcher } from "../src/capability-dispatcher.js";
import { createPhysicalEnvironmentAdapter } from "../src/physical-environment.js";

function snapshot(revision, location = "floor") {
  return {
    schemaVersion: 2,
    environmentId: "host-physics",
    revision,
    objects: [{
      id: "crate",
      name: "Crate",
      description: "A test body",
      location
    }]
  };
}

function createFixture() {
  const order = [];
  let revision = 4;
  const adapter = createPhysicalEnvironmentAdapter({
    observe: async () => snapshot(revision),
    execute: async ({ request, before }) => {
      order.push("environment-execute");
      assert.equal(request.actionId, "move");
      assert.equal(before.revision, 4);
      revision += 1;
      return { status: "achieved", observation: snapshot(revision, "workbench") };
    }
  });
  const dispatcher = createCapabilityDispatcher({
    catalog: {
      version: 1,
      capabilities: [{
        id: "physical.perform",
        shell: "browser",
        title: "Perform a physical action",
        description: "Request a bounded action from the host environment.",
        risk: "consequential",
        approvalRequired: true,
        examples: ["Move the crate"],
        inputSchema: {
          type: "object",
          properties: {
            requestId: { type: "string", maxLength: 128 },
            environmentId: { type: "string", maxLength: 128 },
            expectedRevision: { type: "integer", minimum: 0 },
            actorId: { type: "string", maxLength: 128 },
            targetId: { type: "string", maxLength: 128 },
            actionId: { type: "string", maxLength: 128 }
          },
          required: ["requestId", "environmentId", "expectedRevision", "actorId", "targetId", "actionId"],
          additionalProperties: false
        }
      }]
    },
    shell: "browser",
    handlers: {
      "physical.perform": async ({ input }) => {
        order.push("trusted-handler");
        return adapter.perform({
          schemaVersion: 1,
          ...input,
          parameters: {}
        });
      }
    },
    authorize: async () => {
      order.push("host-authorize");
      return { allowed: true };
    },
    requestApproval: async () => {
      order.push("human-approval");
      return true;
    }
  });
  return { dispatcher, order };
}

const action = {
  requestId: "push-1",
  environmentId: "host-physics",
  expectedRevision: 4,
  actorId: "hermit",
  actionId: "move",
  targetId: "crate"
};

test("physical execution composes through host authorization and explicit approval", async () => {
  const { dispatcher, order } = createFixture();
  const result = await dispatcher.invoke("physical.perform", action);
  assert.equal(result.status, "completed");
  assert.equal(result.result.status, "achieved");
  assert.equal(result.result.verified, true);
  assert.equal(result.result.observation.revision, 5);
  assert.deepEqual(order, [
    "host-authorize",
    "human-approval",
    "host-authorize",
    "trusted-handler",
    "environment-execute"
  ]);
});

test("host denial and missing approval stop before the physical adapter", async () => {
  let executions = 0;
  const adapter = createPhysicalEnvironmentAdapter({
    observe: async () => snapshot(4),
    execute: async () => {
      executions += 1;
      return { status: "achieved", observation: snapshot(5, "workbench") };
    }
  });
  const catalog = {
    version: 1,
    capabilities: [{
      id: "physical.perform", shell: "browser", title: "Perform action",
      description: "Request a physical action.", risk: "consequential",
      approvalRequired: true, examples: ["Move crate"],
      inputSchema: {
        type: "object",
        properties: { targetId: { type: "string", maxLength: 128 } },
        required: ["targetId"], additionalProperties: false
      }
    }]
  };
  const makeDispatcher = (authorize, requestApproval) => createCapabilityDispatcher({
    catalog, shell: "browser",
    handlers: {
      "physical.perform": async ({ input }) => adapter.perform({
        schemaVersion: 1, requestId: "push-2", environmentId: "host-physics",
        expectedRevision: 4, actorId: "hermit", actionId: "move",
        targetId: input.targetId, parameters: {}
      })
    },
    authorize, requestApproval
  });

  const denied = await makeDispatcher(async () => ({ allowed: false }), async () => true)
    .invoke("physical.perform", { targetId: "crate" });
  assert.equal(denied.status, "denied");

  const approvalMissing = await makeDispatcher(async () => ({ allowed: true }))
    .invoke("physical.perform", { targetId: "crate" });
  assert.equal(approvalMissing.status, "approval-required");
  assert.equal(executions, 0);
});


test("host revocation after approval prevents the physical handler and environment execution", async () => {
  const order = [];
  let authorizationCalls = 0;
  let executions = 0;
  const adapter = createPhysicalEnvironmentAdapter({
    observe: async () => snapshot(4),
    execute: async () => {
      executions += 1;
      order.push("environment-execute");
      return { status: "achieved", observation: snapshot(5, "workbench") };
    }
  });
  const dispatcher = createCapabilityDispatcher({
    catalog: {
      version: 1,
      capabilities: [{
        id: "physical.perform",
        shell: "browser",
        title: "Perform a physical action",
        description: "Request a bounded action from the host environment.",
        risk: "consequential",
        approvalRequired: true,
        examples: ["Move the crate"],
        inputSchema: {
          type: "object",
          properties: {
            requestId: { type: "string", maxLength: 128 },
            environmentId: { type: "string", maxLength: 128 },
            expectedRevision: { type: "integer", minimum: 0 },
            actorId: { type: "string", maxLength: 128 },
            targetId: { type: "string", maxLength: 128 },
            actionId: { type: "string", maxLength: 128 }
          },
          required: ["requestId", "environmentId", "expectedRevision", "actorId", "targetId", "actionId"],
          additionalProperties: false
        }
      }]
    },
    shell: "browser",
    handlers: {
      "physical.perform": async ({ input }) => {
        order.push("trusted-handler");
        return adapter.perform({ schemaVersion: 1, ...input, parameters: {} });
      }
    },
    authorize: async () => {
      authorizationCalls += 1;
      order.push("host-authorize");
      return authorizationCalls === 1
        ? { allowed: true }
        : { allowed: false, reason: "grant-revoked-during-approval" };
    },
    requestApproval: async () => {
      order.push("human-approval");
      return true;
    }
  });

  const result = await dispatcher.invoke("physical.perform", action);
  assert.equal(authorizationCalls, 2);
  assert.equal(result.status, "denied");
  assert.equal(result.reason, "grant-revoked-during-approval");
  assert.deepEqual(order, ["host-authorize", "human-approval", "host-authorize"]);
  assert.equal(executions, 0);
});
