const SCHEMA_VERSION = 1;
const MAX_RECORD_BYTES = 65_536;
const MAX_CURSOR_LENGTH = 512;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export class ContinuityProtocolError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ContinuityProtocolError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new ContinuityProtocolError(code, message);
}

function assertPlainRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    fail("INVALID_PAYLOAD", `${label} must be a plain object.`);
  }
}

function cloneSafe(value, label, seen = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "object") fail("INVALID_PAYLOAD", `${label} contains unsupported data.`);
  if (seen.has(value)) fail("INVALID_PAYLOAD", `${label} cannot contain cycles.`);
  seen.add(value);
  let result;
  if (Array.isArray(value)) {
    result = [];
    for (let i = 0; i < value.length; i += 1) {
      if (!Object.hasOwn(value, i)) fail("INVALID_PAYLOAD", `${label} cannot contain sparse arrays.`);
      const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
      if (!descriptor || !("value" in descriptor)) fail("INVALID_PAYLOAD", `${label} cannot contain accessors.`);
      result.push(cloneSafe(descriptor.value, label, seen));
    }
    if (Reflect.ownKeys(value).some(key => key !== "length" &&
        !(typeof key === "string" && /^(0|[1-9][0-9]*)$/.test(key) && Number(key) < value.length))) {
      fail("INVALID_PAYLOAD", `${label} arrays cannot contain extra properties.`);
    }
  } else {
    assertPlainRecord(value, label);
    result = Object.create(null);
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string" || FORBIDDEN_KEYS.has(key)) {
        fail("INVALID_PAYLOAD", `${label} contains an unsupported property name.`);
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor)) fail("INVALID_PAYLOAD", `${label} cannot contain accessors.`);
      result[key] = cloneSafe(descriptor.value, label, seen);
    }
  }
  seen.delete(value);
  return result;
}

function boundedRecord(value, label) {
  const copy = cloneSafe(value, label);
  if (new TextEncoder().encode(JSON.stringify(copy)).length > MAX_RECORD_BYTES) {
    fail("PAYLOAD_TOO_LARGE", `${label} exceeds ${MAX_RECORD_BYTES} bytes.`);
  }
  return copy;
}

function identifier(value, label) {
  if (typeof value !== "string" || !IDENTIFIER.test(value)) {
    fail("INVALID_PAYLOAD", `${label} must be a 1-128 character identifier.`);
  }
  return value;
}

function revision(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail("INVALID_PAYLOAD", `${label} must be a non-negative safe integer.`);
  }
  return value;
}

function principalOwner(principal) {
  if (!principal || typeof principal !== "object" ||
      typeof principal.ownerId !== "string" || principal.ownerId.length === 0) {
    fail("UNAUTHENTICATED", "A trusted authenticated owner principal is required.");
  }
  return principal.ownerId;
}

function validateBase(input, principal) {
  input = boundedRecord(input, "Request");
  if (input.schemaVersion !== SCHEMA_VERSION) {
    fail("UNSUPPORTED_SCHEMA", `Only continuity schema version ${SCHEMA_VERSION} is supported.`);
  }
  const ownerId = principalOwner(principal);
  if (input.ownerId !== undefined && input.ownerId !== ownerId) {
    fail("OWNER_MISMATCH", "The claimed owner does not match the authenticated principal.");
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    ownerId,
    deviceId: identifier(input.deviceId, "deviceId"),
    hostType: identifier(input.hostType, "hostType")
  };
}

/**
 * Validates a sync request using an owner principal supplied by trusted host
 * authentication middleware. Request-body owner claims never establish identity.
 */
export function validateSyncRequest(input, principal) {
  const base = validateBase(input, principal);
  if (input.cursor !== null && input.cursor !== undefined &&
      (typeof input.cursor !== "string" || input.cursor.length > MAX_CURSOR_LENGTH)) {
    fail("INVALID_CURSOR", "cursor must be null or an opaque string of at most 512 characters.");
  }
  const limit = input.limit ?? 100;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500) {
    fail("INVALID_PAYLOAD", "limit must be an integer from 1 through 500.");
  }
  return Object.freeze({ ...base, cursor: input.cursor ?? null, limit });
}

/** Validates a conditional state write; storage must enforce the revision atomically. */
export function validateStateWrite(input, principal) {
  const base = validateBase(input, principal);
  const baseRevision = revision(input.baseRevision, "baseRevision");
  const values = boundedRecord(input.values, "values");
  return Object.freeze({ ...base, baseRevision, values });
}

/** Validates an append-only event envelope with a stable idempotency identity. */
export function validateEventAppend(input, principal) {
  const base = validateBase(input, principal);
  const eventId = identifier(input.eventId, "eventId");
  const eventType = identifier(input.eventType, "eventType");
  const payload = boundedRecord(input.payload ?? Object.create(null), "payload");
  return Object.freeze({ ...base, eventId, eventType, payload });
}

/** Validates and defensively clones an owner-scoped state record returned by storage. */
export function validateStateRecord(input, expectedOwnerId) {
  input = boundedRecord(input, "State record");
  if (typeof expectedOwnerId !== "string" || expectedOwnerId.length === 0 ||
      input.ownerId !== expectedOwnerId) {
    fail("OWNER_MISMATCH", "State record owner does not match the authenticated account.");
  }
  revision(input.revision, "state.revision");
  assertPlainRecord(input.values, "state.values");
  return Object.freeze({
    ownerId: expectedOwnerId,
    revision: input.revision,
    values: Object.freeze(boundedRecord(input.values, "state.values"))
  });
}

/** Validates a server change page before a client applies it and advances its cursor. */
export function validateChangePage(input, expectedOwnerId) {
  input = boundedRecord(input, "Change page");
  if (input.schemaVersion !== SCHEMA_VERSION) {
    fail("UNSUPPORTED_SCHEMA", `Only continuity schema version ${SCHEMA_VERSION} is supported.`);
  }
  if (typeof expectedOwnerId !== "string" || expectedOwnerId.length === 0 ||
      input.ownerId !== expectedOwnerId) {
    fail("OWNER_MISMATCH", "Change page owner does not match the active account.");
  }
  if (!Array.isArray(input.changes) || input.changes.length > 500) {
    fail("INVALID_PAYLOAD", "changes must be an array containing at most 500 entries.");
  }
  const changes = input.changes.map((change, index) => {
    const copy = boundedRecord(change, `changes[${index}]`);
    identifier(copy.changeId, `changes[${index}].changeId`);
    revision(copy.sequence, `changes[${index}].sequence`);
    return copy;
  });
  for (let i = 1; i < changes.length; i += 1) {
    if (changes[i].sequence <= changes[i - 1].sequence) {
      fail("INVALID_PAYLOAD", "Change sequences must be strictly increasing.");
    }
  }
  if (typeof input.nextCursor !== "string" || input.nextCursor.length === 0 ||
      input.nextCursor.length > MAX_CURSOR_LENGTH) {
    fail("INVALID_CURSOR", "nextCursor must be a non-empty opaque string of at most 512 characters.");
  }
  return Object.freeze({
    schemaVersion: SCHEMA_VERSION,
    ownerId: expectedOwnerId,
    changes: Object.freeze(changes),
    nextCursor: input.nextCursor
  });
}

export const continuityProtocol = Object.freeze({
  schemaVersion: SCHEMA_VERSION,
  maxRecordBytes: MAX_RECORD_BYTES,
  maxPageSize: 500
});
