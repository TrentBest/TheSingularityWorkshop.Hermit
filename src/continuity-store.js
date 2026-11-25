const MAX_SHARED_RECORD_BYTES = 65_536;
const DEFAULT_STATE = Object.freeze({ schemaVersion: 1, revision: 0, values: {} });

function cloneJson(value, label) {
  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new TypeError(`${label} must contain JSON-compatible data only.`);
  }
  if (typeof serialized !== "string" ||
      new TextEncoder().encode(serialized).length > MAX_SHARED_RECORD_BYTES) {
    throw new TypeError(`${label} must be JSON-compatible and at most 65536 bytes.`);
  }
  return JSON.parse(serialized);
}

function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function assertIdentifier(value, label) {
  if (typeof value !== "string" || value.length < 1 || value.length > 128) {
    throw new TypeError(`${label} must be a non-empty string of at most 128 characters.`);
  }
}

/**
 * Creates a process-local reference continuity authority for tests and demos.
 * It is deliberately not durable, authenticated, encrypted, or multi-process.
 * Device capabilities remain inside each shell closure and are never serialized.
 */
export function createInMemoryContinuityStore({ ownerId, hermitId }) {
  assertIdentifier(ownerId, "ownerId");
  assertIdentifier(hermitId, "hermitId");

  let state = cloneJson(DEFAULT_STATE, "Initial state");
  const events = new Map();
  const checkpoints = new Map();
  const enrolledDevices = new Map();

  const checkpointAdapter = Object.freeze({
    async read(taskId) {
      return checkpoints.get(taskId) ?? null;
    },
    async compareAndSwap(taskId, expectedRevision, serialized) {
      const current = checkpoints.get(taskId);
      const actualRevision = current === undefined ? 0 : JSON.parse(current).revision;
      if (actualRevision !== expectedRevision) return false;
      const next = JSON.parse(serialized);
      if (next.taskId !== taskId || next.revision !== expectedRevision + 1) return false;
      checkpoints.set(taskId, serialized);
      return true;
    },
    async deleteIfRevision(taskId, expectedRevision) {
      const current = checkpoints.get(taskId);
      if (current === undefined || JSON.parse(current).revision !== expectedRevision) return false;
      checkpoints.delete(taskId);
      return true;
    }
  });

  function createShell({ deviceId, hostType, capabilities = [] }) {
    assertIdentifier(deviceId, "deviceId");
    assertIdentifier(hostType, "hostType");
    if (!Array.isArray(capabilities) || capabilities.some(item => typeof item !== "string" || item.length === 0)) {
      throw new TypeError("capabilities must be an array of non-empty strings.");
    }
    const localCapabilities = new Set(capabilities);
    enrolledDevices.set(deviceId, Object.freeze({ hostType }));

    return Object.freeze({
      deviceId,
      hostType,
      identity() {
        return Object.freeze({ ownerId, hermitId });
      },
      async readState() {
        return freeze(cloneJson(state, "Shared state"));
      },
      async compareAndSwapState(expectedRevision, values) {
        if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
          throw new TypeError("expectedRevision must be a non-negative safe integer.");
        }
        if (!values || typeof values !== "object" || Array.isArray(values) ||
            ![Object.prototype, null].includes(Object.getPrototypeOf(values))) {
          throw new TypeError("Shared state values must be a plain object.");
        }
        if (state.revision !== expectedRevision) return false;
        state = { schemaVersion: 1, revision: expectedRevision + 1, values: cloneJson(values, "Shared state values") };
        return true;
      },
      async appendEvent(event) {
        if (!event || typeof event !== "object" || Array.isArray(event)) {
          throw new TypeError("event must be an object.");
        }
        assertIdentifier(event.eventId, "event.eventId");
        if (events.has(event.eventId)) return false;
        events.set(event.eventId, freeze(cloneJson(event, "Event")));
        return true;
      },
      async readEvents() {
        return [...events.values()].map(event => cloneJson(event, "Event"));
      },
      hasCapability(capabilityId) {
        return localCapabilities.has(capabilityId);
      },
      listLocalCapabilities() {
        return [...localCapabilities].sort();
      },
      checkpointAdapter
    });
  }

  return Object.freeze({
    createShell,
    checkpointAdapter,
    get enrolledDeviceIds() { return [...enrolledDevices.keys()]; }
  });
}
