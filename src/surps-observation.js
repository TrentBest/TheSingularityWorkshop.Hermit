const MAX_PARTICIPANTS = 64;
const MAX_FACTS_PER_PARTICIPANT = 128;
const MAX_ID_LENGTH = 128;
const MAX_NAME_LENGTH = 160;
const MAX_TEXT_LENGTH = 1_024;

export const SURPS_OBSERVATION_SCHEMA_VERSION = 1;

function fail(message) {
  throw new TypeError(`Invalid SURPS observation: ${message}`);
}

function readRecord(value, allowed, required, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    fail(`${label} must be a plain object.`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some(key => typeof key !== "string" || !allowed.includes(key))) {
    fail(`${label} contains unsupported properties.`);
  }
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      fail(`${label} must contain enumerable data properties only.`);
    }
  }
  for (const key of required) {
    if (!Object.hasOwn(descriptors, key)) fail(`${label} is missing ${key}.`);
  }
  return Object.fromEntries(keys.map(key => [key, descriptors[key].value]));
}

function boundedString(value, max, label, pattern) {
  if (typeof value !== "string" || value.length === 0 || value.length > max ||
      (pattern && !pattern.test(value))) {
    fail(`${label} must be a non-empty string within its limit.`);
  }
  return value;
}

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

/**
 * Creates a neutral, read-only projection of one SURPS session revision.
 * This deliberately excludes rules, derived statistics, and mutation APIs.
 */
export function createSurpsObservation(value = {}) {
  const root = readRecord(value,
    ["sourceId", "sourceVersion", "sessionId", "revision", "activeCharacterId", "participants"],
    ["sourceId", "sourceVersion", "sessionId", "revision", "activeCharacterId", "participants"],
    "root");

  const sourceId = boundedString(root.sourceId, MAX_ID_LENGTH, "sourceId", /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/);
  const sourceVersion = boundedString(root.sourceVersion, 64, "sourceVersion");
  const sessionId = boundedString(root.sessionId, MAX_ID_LENGTH, "sessionId", /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/);
  if (!Number.isSafeInteger(root.revision) || root.revision < 0) fail("revision must be a non-negative safe integer.");
  if (!Array.isArray(root.participants) || root.participants.length < 1 || root.participants.length > MAX_PARTICIPANTS) {
    fail(`participants must contain between 1 and ${MAX_PARTICIPANTS} entries.`);
  }

  const ids = new Set();
  const participants = root.participants.map((item, index) => {
    const record = readRecord(item,
      ["id", "name", "role", "condition", "location", "knownFacts"],
      ["id", "name", "role", "condition", "location", "knownFacts"],
      `participants[${index}]`);
    const id = boundedString(record.id, MAX_ID_LENGTH, `participants[${index}].id`, /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/);
    if (ids.has(id)) fail(`duplicate participant identity: ${id}.`);
    ids.add(id);
    if (!["player-character", "companion", "npc"].includes(record.role)) fail(`participants[${index}].role is unsupported.`);
    if (!Array.isArray(record.knownFacts) || record.knownFacts.length > MAX_FACTS_PER_PARTICIPANT) {
      fail(`participants[${index}].knownFacts exceeds its limit.`);
    }
    const factIds = new Set();
    const knownFacts = record.knownFacts.map((fact, factIndex) => {
      const entry = readRecord(fact, ["id", "text", "source"], ["id", "text", "source"],
        `participants[${index}].knownFacts[${factIndex}]`);
      const factId = boundedString(entry.id, MAX_ID_LENGTH, "fact.id", /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/);
      if (factIds.has(factId)) fail(`duplicate knowledge identity: ${factId}.`);
      factIds.add(factId);
      return {
        id: factId,
        text: boundedString(entry.text, MAX_TEXT_LENGTH, "fact.text"),
        source: boundedString(entry.source, MAX_ID_LENGTH, "fact.source")
      };
    });
    return {
      id,
      name: boundedString(record.name, MAX_NAME_LENGTH, "participant.name"),
      role: record.role,
      condition: boundedString(record.condition, MAX_TEXT_LENGTH, "participant.condition"),
      location: boundedString(record.location, MAX_NAME_LENGTH, "participant.location"),
      knownFacts
    };
  });

  const activeCharacterId = boundedString(root.activeCharacterId, MAX_ID_LENGTH, "activeCharacterId");
  const active = participants.find(item => item.id === activeCharacterId);
  if (!active || active.role !== "player-character") fail("activeCharacterId must identify a player-character participant.");

  return freezeDeep({
    schemaVersion: SURPS_OBSERVATION_SCHEMA_VERSION,
    provider: { id: sourceId, version: sourceVersion },
    sessionId,
    revision: root.revision,
    activeCharacterId,
    participants
  });
}

export function validateSurpsObservation(value) {
  const root = readRecord(value,
    ["schemaVersion", "source", "sessionId", "revision", "activeCharacterId", "participants"],
    ["schemaVersion", "provider", "sessionId", "revision", "activeCharacterId", "participants"],
    "snapshot");
  if (root.schemaVersion !== SURPS_OBSERVATION_SCHEMA_VERSION) {
    fail(`unsupported schemaVersion: ${root.schemaVersion}.`);
  }
  const provider = readRecord(root.provider, ["id", "version"], ["id", "version"], "source");
  return createSurpsObservation({
    sourceId: provider.id,
    sourceVersion: provider.version,
    sessionId: root.sessionId,
    revision: root.revision,
    activeCharacterId: root.activeCharacterId,
    participants: root.participants
  });
}

/**
 * Wraps a trusted host/SURPS read operation. The adapter never exposes a
 * write operation; it validates each result and rejects revision rollback.
 */
export function createSurpsObservationAdapter({ readSession } = {}) {
  if (typeof readSession !== "function") throw new TypeError("A host-owned readSession function is required.");
  const latestRevisionBySession = new Map();
  return Object.freeze({
    async observe(sessionId, { signal } = {}) {
      boundedString(sessionId, MAX_ID_LENGTH, "sessionId", /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/);
      if (signal?.aborted) throw signal.reason ?? new Error("Observation cancelled.");
      const raw = await readSession(sessionId, { signal });
      if (signal?.aborted) throw signal.reason ?? new Error("Observation cancelled.");
      const snapshot = createSurpsObservation(raw);
      if (snapshot.sessionId !== sessionId) fail("host returned a different session identity.");
      const previous = latestRevisionBySession.get(sessionId);
      if (previous !== undefined && snapshot.revision < previous) fail("session revision moved backwards.");
      latestRevisionBySession.set(sessionId, snapshot.revision);
      return snapshot;
    }
  });
}

/**
 * Returns only one participant's authorized portrayal context. This does not
 * merge other participants' knowledge or promote dialogue into world facts.
 */
export function createParticipantRoleContext(observation, participantId) {
  const snapshot = validateSurpsObservation(observation);
  boundedString(participantId, MAX_ID_LENGTH, "participantId");
  const participant = snapshot.participants.find(item => item.id === participantId);
  if (!participant) fail("participant identity is not present in this observation.");
  return freezeDeep({
    schemaVersion: 1,
    source: snapshot.source,
    sessionId: snapshot.sessionId,
    observedRevision: snapshot.revision,
    participant: structuredClone(participant)
  });
}
