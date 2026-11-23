import test from "node:test";
import assert from "node:assert/strict";
import { planGoap } from "../src/goap-planner.js";

const actions = [
  { id: "inspect-glass", preconditions: { glassVisible: true }, effects: { glassKnown: true }, cost: 1 },
  { id: "pick-up-glass", preconditions: { glassKnown: true, handFree: true }, effects: { glassHeld: true, handFree: false }, cost: 2 },
  { id: "wear-glass-hat", preconditions: { glassHeld: true }, effects: { glassWornAsHat: true, glassHeld: false, handFree: true }, cost: 1 },
  { id: "put-glass-down", preconditions: { glassHeld: true }, effects: { glassOnCounter: true, glassHeld: false, handFree: true }, cost: 1 }
];

test("GOAP finds a least-cost plan from current world facts", () => {
  const result = planGoap({ state: { glassVisible: true, handFree: true },
    goal: { glassWornAsHat: true }, actions });
  assert.equal(result.status, "planned");
  assert.deepEqual(result.plan, ["inspect-glass", "pick-up-glass", "wear-glass-hat"]);
  assert.equal(result.finalState.glassWornAsHat, true);
  assert.equal(result.cost, 4);
});
test("already-satisfied goals return an empty plan", () => {
  const result = planGoap({ state: { idle: true }, goal: { idle: true }, actions: [] });
  assert.equal(result.status, "already-satisfied");
  assert.deepEqual(result.plan, []);
});
test("planning never mutates caller-owned state", () => {
  const state = { glassVisible: true, handFree: true };
  const before = structuredClone(state);
  planGoap({ state, goal: { glassOnCounter: true }, actions });
  assert.deepEqual(state, before);
});
test("unreachable goals fail closed", () => {
  const result = planGoap({ state: { glassVisible: false },
    goal: { glassWornAsHat: true }, actions });
  assert.equal(result.status, "no-plan");
});
test("expansion and depth budgets are enforced", () => {
  const result = planGoap({ state: { glassVisible: true, handFree: true },
    goal: { glassWornAsHat: true }, actions, maxExpansions: 1 });
  assert.equal(result.status, "budget-exhausted");
  const shallow = planGoap({ state: { glassVisible: true, handFree: true },
    goal: { glassWornAsHat: true }, actions, maxPlanLength: 1 });
  assert.equal(shallow.status, "no-plan");
});
test("facts and action costs are validated", () => {
  assert.throws(() => planGoap({ state: { nested: {} }, goal: {}, actions: [] }), /scalar/);
  assert.throws(() => planGoap({ state: {}, goal: { done: true },
    actions: [{ id: "bad", effects: { done: true }, cost: 0 }] }), /positive/);
});
