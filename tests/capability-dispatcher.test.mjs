import test from "node:test";
import assert from "node:assert/strict";
import { createCapabilityDispatcher } from "../src/capability-dispatcher.js";

const catalog = () => ({
  version: 1,
  capabilities: [
    {
      id: "scene.inspect",
      shell: "browser",
      title: "Inspect an object",
      description: "Read an object's observed properties.",
      risk: "read-only",
      approvalRequired: false,
      examples: ["Inspect the vessel"],
      inputSchema: {
        type: "object",
        properties: { objectId: { type: "string", maxLength: 40 } },
        required: ["objectId"],
        additionalProperties: false
      }
    },
    {
      id: "scene.move",
      shell: "browser",
      title: "Move an object",
      description: "Move an object after explicit approval.",
      risk: "consequential",
      approvalRequired: true,
      examples: ["Move the vessel"],
      inputSchema: {
        type: "object",
        properties: { objectId: { type: "string", maxLength: 40 }, destination: { type: "string", enum: ["workbench"] } },
        required: ["objectId", "destination"],
        additionalProperties: false
      }
    }
  ]
});

test("read-only capability is authorized before the trusted host handler runs", async () => {
  const order = [];
  const dispatcher = createCapabilityDispatcher({
    catalog: catalog(),
    shell: "browser",
    handlers: {
      "scene.inspect": async ({ input, approvalGranted, context }) => {
        order.push("handler");
        assert.equal(context, undefined);
        assert.equal(approvalGranted, false);
        return { objectId: input.objectId, observed: true };
      }
    },
    authorize: async ({ capability, input }) => {
      order.push("authorize");
      assert.equal(capability.id, "scene.inspect");
      assert.equal(Object.isFrozen(input), true);
      return { allowed: true };
    }
  });

  const result = await dispatcher.invoke("scene.inspect", { objectId: "vessel-1" }, { allowed: true, admin: true });
  assert.deepEqual(order, ["authorize", "handler"]);
  assert.deepEqual(result, {
    status: "completed",
    capabilityId: "scene.inspect",
    result: { objectId: "vessel-1", observed: true }
  });
});

test("consequential capability requires explicit host approval before handler invocation", async () => {
  const order = [];
  const dispatcher = createCapabilityDispatcher({
    catalog: catalog(),
    shell: "browser",
    handlers: {
      "scene.move": async ({ approvalGranted }) => {
        order.push("handler");
        assert.equal(approvalGranted, true);
        return "moved";
      }
    },
    authorize: async () => {
      order.push("authorize");
      return { allowed: true, approvalRequired: false };
    },
    requestApproval: async () => {
      order.push("approval");
      return true;
    }
  });

  const result = await dispatcher.invoke("scene.move", { objectId: "vessel-1", destination: "workbench" });
  assert.deepEqual(order, ["authorize", "approval", "authorize", "handler"]);
  assert.equal(result.status, "completed");
});

test("catalog approval metadata cannot be weakened by host policy", async () => {
  let invoked = false;
  const dispatcher = createCapabilityDispatcher({
    catalog: catalog(),
    shell: "browser",
    handlers: { "scene.move": async () => { invoked = true; } },
    authorize: async () => ({ allowed: true, approvalRequired: false })
  });
  const result = await dispatcher.invoke("scene.move", { objectId: "vessel-1", destination: "workbench" });
  assert.equal(result.status, "approval-required");
  assert.equal(invoked, false);
});

test("host policy can require approval even for catalog read-only capabilities", async () => {
  let invoked = false;
  const dispatcher = createCapabilityDispatcher({
    catalog: catalog(),
    shell: "browser",
    handlers: { "scene.inspect": async () => { invoked = true; } },
    authorize: async () => ({ allowed: true, approvalRequired: true }),
    requestApproval: async () => false
  });
  const result = await dispatcher.invoke("scene.inspect", { objectId: "vessel-1" });
  assert.equal(result.status, "approval-denied");
  assert.equal(invoked, false);
});

test("denial, invalid policy decisions and policy exceptions fail closed", async t => {
  for (const [name, authorize, expected] of [
    ["denied", async () => ({ allowed: false, reason: "not-granted" }), "not-granted"],
    ["malformed", async () => ({ allowed: "yes" }), "invalid-host-policy-decision"],
    ["throws", async () => { throw new Error("private host detail"); }, "host-policy-error"]
  ]) {
    await t.test(name, async () => {
      let invoked = false;
      const dispatcher = createCapabilityDispatcher({
        catalog: catalog(),
        shell: "browser",
        handlers: { "scene.inspect": async () => { invoked = true; } },
        authorize
      });
      const result = await dispatcher.invoke("scene.inspect", { objectId: "vessel-1" });
      assert.equal(result.status, "denied");
      assert.equal(result.reason, expected);
      assert.equal(invoked, false);
    });
  }
});

test("unknown capability, invalid input and missing adapter never execute", async () => {
  let invoked = false;
  const dispatcher = createCapabilityDispatcher({
    catalog: catalog(),
    shell: "browser",
    handlers: { "scene.inspect": async () => { invoked = true; } },
    authorize: async () => ({ allowed: true })
  });
  assert.equal((await dispatcher.invoke("scene.unknown", {})).status, "unsupported");
  assert.equal((await dispatcher.invoke("scene.inspect", {})).status, "invalid-input");
  assert.equal((await dispatcher.invoke("scene.move", { objectId: "x", destination: "workbench" })).status, "unavailable");
  assert.equal(invoked, false);
});

test("approval must be explicitly granted with boolean true", async () => {
  let invoked = false;
  const dispatcher = createCapabilityDispatcher({
    catalog: catalog(),
    shell: "browser",
    handlers: { "scene.move": async () => { invoked = true; } },
    authorize: async () => ({ allowed: true }),
    requestApproval: async () => ({ approved: true })
  });
  const result = await dispatcher.invoke("scene.move", { objectId: "vessel-1", destination: "workbench" });
  assert.equal(result.status, "approval-denied");
  assert.equal(invoked, false);
});

test("dispatcher requires host authorization and validates trusted handler registry", () => {
  assert.throws(() => createCapabilityDispatcher({ catalog: catalog(), shell: "browser", handlers: {} }), /authorize callback/);
  const accessors = {};
  Object.defineProperty(accessors, "scene.inspect", { enumerable: true, get() { throw new Error("must not run"); } });
  assert.throws(() => createCapabilityDispatcher({
    catalog: catalog(), shell: "browser", handlers: accessors, authorize: async () => ({ allowed: true })
  }), /own function property/);
});

test("handler failures return a bounded failure status without leaking exception details", async () => {
  const dispatcher = createCapabilityDispatcher({
    catalog: catalog(),
    shell: "browser",
    handlers: { "scene.inspect": async () => { throw new Error("sensitive stack detail"); } },
    authorize: async () => ({ allowed: true })
  });
  const result = await dispatcher.invoke("scene.inspect", { objectId: "vessel-1" });
  assert.deepEqual(result, { status: "failed", capabilityId: "scene.inspect", reason: "host-handler-failed" });
});

test("host authorization is rechecked after approval and revocation stops dispatch", async () => {
  let authorizationCalls = 0;
  let invoked = false;
  const dispatcher = createCapabilityDispatcher({
    catalog: catalog(),
    shell: "browser",
    handlers: { "scene.move": async () => { invoked = true; } },
    authorize: async () => {
      authorizationCalls += 1;
      return authorizationCalls === 1
        ? { allowed: true }
        : { allowed: false, reason: "grant-revoked-during-approval" };
    },
    requestApproval: async () => true
  });

  const result = await dispatcher.invoke("scene.move", { objectId: "vessel-1", destination: "workbench" });
  assert.equal(authorizationCalls, 2);
  assert.equal(result.status, "denied");
  assert.equal(result.reason, "grant-revoked-during-approval");
  assert.equal(invoked, false);
});

test("a newly required host approval cannot appear after the approval checkpoint", async () => {
  let authorizationCalls = 0;
  let invoked = false;
  const dispatcher = createCapabilityDispatcher({
    catalog: catalog(),
    shell: "browser",
    handlers: { "scene.inspect": async () => { invoked = true; } },
    authorize: async () => {
      authorizationCalls += 1;
      return { allowed: true, approvalRequired: authorizationCalls > 1 };
    }
  });

  const result = await dispatcher.invoke("scene.inspect", { objectId: "vessel-1" });
  assert.equal(authorizationCalls, 1);
  assert.equal(result.status, "completed");
  assert.equal(invoked, true);
});
