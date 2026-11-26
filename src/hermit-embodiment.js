/**
 * Hermit's identity is stable; the shell, avatar, and rig are replaceable.
 * This module describes semantic expression requests, not physical execution.
 */
export const HERMIT_IDENTITY = Object.freeze({
  id: "hermit",
  embodiment: "adaptive-companion",
  shellPolicy: "replaceable",
  rigPolicy: "host-selected"
});

const expressions = new Set(["idle", "attend", "greet", "dance"]);

export function createRigExpressionRequest({ expression, intensity = 0.5, durationMs = 1500, reason = "interaction" } = {}) {
  if (!expressions.has(expression)) throw new TypeError("Unsupported Hermit expression.");
  if (!Number.isFinite(intensity) || intensity < 0 || intensity > 1) throw new RangeError("Intensity must be between 0 and 1.");
  if (!Number.isSafeInteger(durationMs) || durationMs < 0 || durationMs > 60000) throw new RangeError("Duration must be an integer from 0 to 60000 ms.");
  if (typeof reason !== "string" || reason.length > 160) throw new TypeError("Reason must be a short string.");
  return Object.freeze({
    schema: "hermit.rig-expression.v1",
    identityId: HERMIT_IDENTITY.id,
    target: "active-rig",
    expression,
    intensity,
    durationMs,
    reason
  });
}

/**
 * Host adapter: the host chooses the active rig and decides how/if a semantic
 * expression can be rendered. Hermit never assumes a particular skeleton.
 */
export function createHermitEmbodimentAdapter({ getActiveRig, requestExpression } = {}) {
  if (typeof getActiveRig !== "function" || typeof requestExpression !== "function") {
    throw new TypeError("An active-rig provider and expression requester are required.");
  }
  return Object.freeze({
    async express(request) {
      if (!request || request.schema !== "hermit.rig-expression.v1" || request.identityId !== HERMIT_IDENTITY.id) {
        return Object.freeze({ status: "rejected", reason: "invalid-request" });
      }
      const rig = await getActiveRig();
      if (!rig || typeof rig.id !== "string" || !Array.isArray(rig.expressions)) {
        return Object.freeze({ status: "unavailable", reason: "no-active-rig" });
      }
      if (!rig.expressions.includes(request.expression)) {
        return Object.freeze({ status: "unsupported", rigId: rig.id, expression: request.expression });
      }
      const result = await requestExpression(Object.freeze({ rigId: rig.id, request }));
      return Object.freeze({ status: "submitted", rigId: rig.id, result: result ?? null });
    }
  });
}
