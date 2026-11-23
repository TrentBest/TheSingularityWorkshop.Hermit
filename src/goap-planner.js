/**
 * Deterministic, bounded GOAP planning primitive for Hermit's local behavior.
 * Planning only: this module does not execute actions or grant permissions.
 */
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    [Object.prototype, null].includes(Object.getPrototypeOf(value));
}
function factsOf(value, label) {
  if (!isRecord(value)) throw new TypeError(label + " must be a plain object.");
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const result = Object.create(null);
  for (const key of Reflect.ownKeys(descriptors)) {
    const d = descriptors[key];
    if (typeof key !== "string" || !d.enumerable || !Object.hasOwn(d, "value"))
      throw new TypeError(label + " must contain enumerable data properties only.");
    const v = d.value;
    if (v !== null && !["string", "number", "boolean"].includes(typeof v))
      throw new TypeError(label + " facts must be scalar JSON values.");
    if (typeof v === "number" && !Number.isFinite(v))
      throw new TypeError(label + " facts must be finite.");
    result[key] = v;
  }
  return result;
}
function matches(state, conditions) {
  return Object.entries(conditions).every(([key, value]) =>
    Object.hasOwn(state, key) && Object.is(state[key], value));
}
function keyOf(state) {
  return JSON.stringify(Object.keys(state).sort().map(key => [key, state[key]]));
}
function compare(a, b) {
  return a.cost - b.cost || a.depth - b.depth || a.order - b.order;
}

/** Find a least-cost action sequence that makes every goal fact true. */
export function planGoap({ state, goal, actions, maxExpansions = 2000, maxPlanLength = 32 }) {
  const initial = factsOf(state, "state");
  const target = factsOf(goal, "goal");
  if (!Array.isArray(actions)) throw new TypeError("actions must be an array.");
  if (!Number.isInteger(maxExpansions) || maxExpansions < 1 ||
      !Number.isInteger(maxPlanLength) || maxPlanLength < 0)
    throw new RangeError("Planner bounds are invalid.");

  const normalized = actions.map(action => {
    if (!isRecord(action) || typeof action.id !== "string" || action.id.length === 0)
      throw new TypeError("Every action requires a stable non-empty id.");
    const preconditions = factsOf(action.preconditions ?? {}, "preconditions");
    const effects = factsOf(action.effects ?? {}, "effects");
    const cost = action.cost ?? 1;
    if (!Number.isFinite(cost) || cost <= 0)
      throw new RangeError("Action cost must be positive and finite.");
    return Object.freeze({ id: action.id, preconditions, effects, cost });
  }).sort((a, b) => a.id.localeCompare(b.id));

  if (matches(initial, target))
    return Object.freeze({ status: "already-satisfied", plan: Object.freeze([]),
      finalState: Object.freeze(initial), expansions: 0, cost: 0 });

  const frontier = [{ state: initial, plan: [], cost: 0, depth: 0, order: 0 }];
  const bestCost = new Map([[keyOf(initial), 0]]);
  let expansions = 0;
  let order = 1;
  while (frontier.length && expansions < maxExpansions) {
    frontier.sort(compare);
    const current = frontier.shift();
    if (matches(current.state, target))
      return Object.freeze({ status: "planned", plan: Object.freeze(current.plan),
        finalState: Object.freeze(current.state), expansions, cost: current.cost });
    if (current.depth >= maxPlanLength) continue;
    expansions++;
    for (const action of normalized) {
      if (!matches(current.state, action.preconditions)) continue;
      const next = { ...current.state, ...action.effects };
      const key = keyOf(next);
      const cost = current.cost + action.cost;
      if (bestCost.has(key) && bestCost.get(key) <= cost) continue;
      bestCost.set(key, cost);
      frontier.push({ state: next, plan: [...current.plan, action.id],
        cost, depth: current.depth + 1, order: order++ });
    }
  }
  return Object.freeze({ status: frontier.length ? "budget-exhausted" : "no-plan",
    plan: Object.freeze([]), finalState: Object.freeze(initial), expansions, cost: null });
}
