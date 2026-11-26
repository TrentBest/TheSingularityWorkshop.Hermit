import { validateWorldStateSnapshot } from "./world-state.js";

export const PHYSICAL_ACTION_SCHEMA_VERSION = 1;
const ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;

function invalid(message) {
  const error = new TypeError("Invalid physical-environment contract: " + message);
  error.code = "INVALID_PHYSICAL_ENVIRONMENT_CONTRACT";
  throw error;
}

function plainData(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    invalid(label + " must be a plain data object.");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some(key => typeof key !== "string" || !descriptors[key].enumerable ||
      !Object.hasOwn(descriptors[key], "value"))) {
    invalid(label + " must contain enumerable string data properties only.");
  }
  return Object.fromEntries(keys.map(key => [key, descriptors[key].value]));
}

function identifier(value, label) {
  if (typeof value !== "string" || !ID.test(value)) invalid(label + " must be a stable identifier.");
  return value;
}

function scalarParameters(value) {
  const source = plainData(value ?? {}, "parameters");
  const entries = Object.entries(source);
  if (entries.length > 32) invalid("parameters may contain at most 32 entries.");
  const result = {};
  for (const [key, item] of entries) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key) ||
        !(item === null || ["string", "boolean"].includes(typeof item) ||
          (typeof item === "number" && Number.isFinite(item))) ||
        (typeof item === "string" && item.length > 512)) {
      invalid("parameters must contain bounded scalar values with stable keys.");
    }
    result[key] = item;
  }
  return Object.freeze(result);
}

/** Validates an untrusted physical-action proposal; it grants no authority. */
export function createPhysicalActionRequest(value) {
  const source = plainData(value, "request");
  const allowed = [
    "schemaVersion", "requestId", "environmentId", "expectedRevision",
    "actorId", "actionId", "targetId", "parameters"
  ];
  if (Object.keys(source).some(key => !allowed.includes(key)) ||
      source.schemaVersion !== PHYSICAL_ACTION_SCHEMA_VERSION) {
    invalid("unsupported request schema or properties.");
  }
  if (!Number.isSafeInteger(source.expectedRevision) || source.expectedRevision < 0) {
    invalid("expectedRevision must be a non-negative safe integer.");
  }
  return Object.freeze({
    schemaVersion: PHYSICAL_ACTION_SCHEMA_VERSION,
    requestId: identifier(source.requestId, "requestId"),
    environmentId: identifier(source.environmentId, "environmentId"),
    expectedRevision: source.expectedRevision,
    actorId: identifier(source.actorId, "actorId"),
    actionId: identifier(source.actionId, "actionId"),
    targetId: identifier(source.targetId, "targetId"),
    parameters: scalarParameters(source.parameters)
  });
}

/**
 * Adapts an owner-supplied environment without implementing physics.
 * The trusted host must authorize a proposal before calling perform().
 */
export function createPhysicalEnvironmentAdapter({ observe, execute } = {}) {
  if (typeof observe !== "function" || typeof execute !== "function") {
    invalid("observe and execute callbacks are required.");
  }
  let highestRevision = -1;
  let environmentId = null;

  async function readObservation() {
    const snapshot = validateWorldStateSnapshot(await observe());
    if (environmentId !== null && snapshot.environmentId !== environmentId) {
      invalid("environment identity changed during this adapter session.");
    }
    if (snapshot.revision < highestRevision) {
      invalid("environment observation regressed behind a previously observed revision.");
    }
    environmentId ??= snapshot.environmentId;
    highestRevision = snapshot.revision;
    return snapshot;
  }

  return Object.freeze({
    observe: readObservation,
    async perform(value) {
      const request = createPhysicalActionRequest(value);
      const before = await readObservation();
      if (request.environmentId !== before.environmentId ||
          request.expectedRevision !== before.revision) {
        return Object.freeze({
          status: "stale-observation", verified: false,
          requestId: request.requestId, observation: before
        });
      }
      const raw = plainData(await execute(Object.freeze({ request, before })), "execution result");
      if (!["achieved", "rejected", "interrupted"].includes(raw.status)) {
        invalid("execution result status must be achieved, rejected, or interrupted.");
      }
      const after = validateWorldStateSnapshot(raw.observation);
      if (after.environmentId !== before.environmentId || after.revision < before.revision) {
        invalid("post-action observation must belong to the same environment and not regress.");
      }
      const verified = raw.status === "achieved" && after.revision > before.revision;
      return Object.freeze({
        status: raw.status === "achieved" && !verified ? "unverified" : raw.status,
        verified, requestId: request.requestId, observation: after,
        evidence: raw.evidence === undefined ? null : scalarParameters(raw.evidence)
      });
    }
  });
}
