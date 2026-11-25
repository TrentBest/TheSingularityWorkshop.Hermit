import {
  ContinuityProtocolError,
  validateChangePage,
  validateEventAppend,
  validateStateWrite,
  validateSyncRequest
} from "./continuity-protocol.js";

export class ContinuityServiceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ContinuityServiceError";
    this.code = code;
  }
}

function requireFunction(value, name) {
  if (typeof value !== "function") throw new TypeError(`Continuity service requires ${name}().`);
}

function serviceFail(code, message) {
  throw new ContinuityServiceError(code, message);
}

function assertOwnerRecord(record, ownerId, label) {
  if (!record || typeof record !== "object" || record.ownerId !== ownerId) {
    serviceFail("OWNER_MISMATCH", `${label} did not return the authenticated owner scope.`);
  }
  return record;
}

/**
 * Creates provider-neutral request orchestration around host-owned trust and storage.
 *
 * authenticate(context) must return a trusted principal { ownerId } or null.
 * authorizeDevice({ principal, deviceId, hostType, operation }) must return true
 * only for an enrolled, active device authorized for this request.
 * store is an owner-scoped adapter; every read/write is passed the authenticated
 * owner ID. It must provide atomic CAS and idempotent append semantics.
 *
 * This is not authentication middleware, a network server, or durable storage.
 */
export function createContinuityService({ authenticate, authorizeDevice, store }) {
  requireFunction(authenticate, "authenticate");
  requireFunction(authorizeDevice, "authorizeDevice");
  if (!store || typeof store !== "object") throw new TypeError("Continuity service requires a store adapter.");
  for (const method of ["readState", "compareAndSwapState", "appendEvent", "readChanges"]) {
    requireFunction(store[method], `store.${method}`);
  }

  async function authorize(context, request, operation) {
    let principal;
    try {
      principal = await authenticate(context);
    } catch {
      serviceFail("UNAUTHENTICATED", "The host could not authenticate this request.");
    }
    if (!principal || typeof principal.ownerId !== "string" || principal.ownerId.length === 0) {
      serviceFail("UNAUTHENTICATED", "A trusted authenticated owner principal is required.");
    }
    let allowed;
    try {
      allowed = await authorizeDevice({
        principal,
        deviceId: request.deviceId,
        hostType: request.hostType,
        operation
      });
    } catch {
      serviceFail("DEVICE_UNAUTHORIZED", "The host could not authorize this device.");
    }
    if (allowed !== true) {
      serviceFail("DEVICE_UNAUTHORIZED", "The device is not enrolled, active, or authorized for this operation.");
    }
    return principal;
  }

  async function handleSync({ context, body }) {
    let request;
    try {
      // Owner validation happens after authentication, so the body cannot select identity.
      const principal = await authenticate(context);
      if (!principal || typeof principal.ownerId !== "string" || principal.ownerId.length === 0) {
        serviceFail("UNAUTHENTICATED", "A trusted authenticated owner principal is required.");
      }
      request = validateSyncRequest(body, principal);
      let allowed;
      try {
        allowed = await authorizeDevice({
          principal, deviceId: request.deviceId, hostType: request.hostType, operation: "sync"
        });
      } catch {
        serviceFail("DEVICE_UNAUTHORIZED", "The host could not authorize this device for sync.");
      }
      if (allowed !== true) serviceFail("DEVICE_UNAUTHORIZED", "The device is not enrolled, active, or authorized for sync.");
      const [state, rawPage] = await Promise.all([
        store.readState(principal.ownerId),
        store.readChanges(principal.ownerId, request.cursor, request.limit)
      ]);
      assertOwnerRecord(state, principal.ownerId, "State adapter");
      if (!Number.isSafeInteger(state.revision) || state.revision < 0 ||
          !state.values || typeof state.values !== "object" || Array.isArray(state.values)) {
        serviceFail("INVALID_STORE_RESPONSE", "State adapter returned an invalid shared-state record.");
      }
      const page = validateChangePage(rawPage, principal.ownerId);
      if (page.changes.length > request.limit) {
        serviceFail("INVALID_STORE_RESPONSE", "Change adapter returned more entries than requested.");
      }
      return Object.freeze({
        schemaVersion: 1,
        ownerId: principal.ownerId,
        state: Object.freeze({
          revision: state.revision,
          values: state.values
        }),
        changes: page.changes,
        nextCursor: page.nextCursor
      });
    } catch (error) {
      if (error instanceof ContinuityServiceError) throw error;
      if (error instanceof ContinuityProtocolError) {
        throw new ContinuityServiceError(error.code, error.message);
      }
      throw new ContinuityServiceError("STORE_FAILURE", "The continuity adapter could not complete sync.");
    }
  }

  async function handleStateWrite({ context, body }) {
    try {
      const principal = await authenticate(context);
      if (!principal || typeof principal.ownerId !== "string" || principal.ownerId.length === 0) {
        serviceFail("UNAUTHENTICATED", "A trusted authenticated owner principal is required.");
      }
      const request = validateStateWrite(body, principal);
      let allowed;
      try {
        allowed = await authorizeDevice({
          principal, deviceId: request.deviceId, hostType: request.hostType, operation: "state-write"
        });
      } catch {
        serviceFail("DEVICE_UNAUTHORIZED", "The host could not authorize this device to write shared state.");
      }
      if (allowed !== true) serviceFail("DEVICE_UNAUTHORIZED", "The device is not authorized to write shared state.");
      const result = await store.compareAndSwapState(
        principal.ownerId, request.baseRevision, request.values
      );
      if (result === false) serviceFail("STALE_REVISION", "Shared state changed; reload and reconcile before retrying.");
      assertOwnerRecord(result, principal.ownerId, "State write adapter");
      if (!Number.isSafeInteger(result.revision) || result.revision !== request.baseRevision + 1) {
        serviceFail("INVALID_STORE_RESPONSE", "State write adapter returned an invalid revision.");
      }
      return Object.freeze({ ownerId: principal.ownerId, revision: result.revision });
    } catch (error) {
      if (error instanceof ContinuityServiceError) throw error;
      if (error instanceof ContinuityProtocolError) {
        throw new ContinuityServiceError(error.code, error.message);
      }
      throw new ContinuityServiceError("STORE_FAILURE", "The continuity adapter could not commit shared state.");
    }
  }

  async function handleEventAppend({ context, body }) {
    try {
      const principal = await authenticate(context);
      if (!principal || typeof principal.ownerId !== "string" || principal.ownerId.length === 0) {
        serviceFail("UNAUTHENTICATED", "A trusted authenticated owner principal is required.");
      }
      const request = validateEventAppend(body, principal);
      let allowed;
      try {
        allowed = await authorizeDevice({
          principal, deviceId: request.deviceId, hostType: request.hostType, operation: "event-append"
        });
      } catch {
        serviceFail("DEVICE_UNAUTHORIZED", "The host could not authorize this device to append events.");
      }
      if (allowed !== true) serviceFail("DEVICE_UNAUTHORIZED", "The device is not authorized to append events.");
      const result = await store.appendEvent(principal.ownerId, {
        eventId: request.eventId,
        eventType: request.eventType,
        payload: request.payload
      });
      if (!result || result.ownerId !== principal.ownerId ||
          typeof result.appended !== "boolean") {
        serviceFail("INVALID_STORE_RESPONSE", "Event adapter returned an invalid owner-scoped result.");
      }
      return Object.freeze({
        ownerId: principal.ownerId,
        eventId: request.eventId,
        appended: result.appended
      });
    } catch (error) {
      if (error instanceof ContinuityServiceError) throw error;
      if (error instanceof ContinuityProtocolError) {
        throw new ContinuityServiceError(error.code, error.message);
      }
      throw new ContinuityServiceError("STORE_FAILURE", "The continuity adapter could not append the event.");
    }
  }

  return Object.freeze({ handleSync, handleStateWrite, handleEventAppend });
}
