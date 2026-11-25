import { validateSurpsObservation } from "./surps-observation.js";

const MAX_ID = 128;
const MAX_TEXT = 1_024;
const MAX_ITEMS = 32;
const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/;
const MODES = new Set(["player-observer", "companion", "npc-portrayal"]);

function fail(message) {
  throw new TypeError(`Invalid SURPS role context: ${message}`);
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

function stringList(value, label) {
  if (!Array.isArray(value) || value.length > MAX_ITEMS) {
    fail(`${label} must contain at most ${MAX_ITEMS} entries.`);
  }
  const result = value.map((item, index) =>
    boundedString(item, MAX_TEXT, `${label}[${index}]`));
  if (new Set(result).size !== result.length) fail(`${label} entries must be unique.`);
  return result;
}

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

/**
 * Builds one Hermit portrayal context from a trusted, immutable SURPS
 * observation and a separately versioned Hermit-owned role profile.
 *
 * The same persistent agent identity can take different roles. The profile
 * selects one participant and an explicit subset of that participant's
 * knowledge; it cannot add facts or borrow another participant's knowledge.
 */
export function createSurpsRoleContext(observation, profileValue) {
  const snapshot = validateSurpsObservation(observation);
  const profile = readRecord(profileValue, [
    "schemaVersion", "id", "version", "agentId", "mode", "participantId",
    "source", "voiceGuidance", "motives", "goals", "relationships",
    "permittedKnowledgeIds", "exampleLine"
  ], [
    "schemaVersion", "id", "version", "agentId", "mode", "participantId",
    "source", "voiceGuidance", "motives", "goals", "relationships",
    "permittedKnowledgeIds"
  ], "profile");

  if (profile.schemaVersion !== 1) fail("unsupported profile schemaVersion.");
  const id = boundedString(profile.id, MAX_ID, "profile.id", ID_PATTERN);
  const version = boundedString(profile.version, 64, "profile.version");
  const agentId = boundedString(profile.agentId, MAX_ID, "profile.agentId", ID_PATTERN);
  if (!MODES.has(profile.mode)) fail("profile.mode is unsupported.");
  const participantId = boundedString(profile.participantId, MAX_ID, "profile.participantId", ID_PATTERN);
  const participant = snapshot.participants.find(item => item.id === participantId);
  if (!participant) fail("profile participant is not present in the observation.");

  const expectedRole = profile.mode === "player-observer" ? "player-character" :
    profile.mode === "companion" ? "companion" : "npc";
  if (participant.role !== expectedRole) fail("profile mode does not match the participant role.");

  const source = readRecord(profile.source, ["repository", "path", "version"],
    ["repository", "path", "version"], "profile.source");
  const sourceRepository = boundedString(source.repository, 200, "profile.source.repository");
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(sourceRepository)) {
    fail("profile.source.repository must use owner/repository form.");
  }
  const sourcePath = boundedString(source.path, 300, "profile.source.path");
  const sourceVersion = boundedString(source.version, 64, "profile.source.version");

  const voiceGuidance = boundedString(profile.voiceGuidance, MAX_TEXT, "profile.voiceGuidance");
  const motives = stringList(profile.motives, "profile.motives");
  const goals = stringList(profile.goals, "profile.goals");
  const permittedKnowledgeIds = stringList(profile.permittedKnowledgeIds, "profile.permittedKnowledgeIds");
  const availableFacts = new Map(participant.knownFacts.map(fact => [fact.id, fact]));
  for (const factId of permittedKnowledgeIds) {
    if (!availableFacts.has(factId)) {
      fail(`permitted knowledge ${factId} does not belong to the selected participant.`);
    }
  }

  if (!Array.isArray(profile.relationships) || profile.relationships.length > MAX_ITEMS) {
    fail(`profile.relationships must contain at most ${MAX_ITEMS} entries.`);
  }
  const relationships = profile.relationships.map((item, index) => {
    const relation = readRecord(item, ["participantId", "relationship", "context"],
      ["participantId", "relationship", "context"], `profile.relationships[${index}]`);
    const relatedId = boundedString(relation.participantId, MAX_ID, "relationship.participantId", ID_PATTERN);
    if (!snapshot.participants.some(candidate => candidate.id === relatedId)) {
      fail(`relationship references unknown participant ${relatedId}.`);
    }
    return {
      participantId: relatedId,
      relationship: boundedString(relation.relationship, 160, "relationship.relationship"),
      context: boundedString(relation.context, MAX_TEXT, "relationship.context")
    };
  });
  const relationshipIds = relationships.map(item => item.participantId);
  if (new Set(relationshipIds).size !== relationshipIds.length) {
    fail("profile relationships must not repeat participant identities.");
  }

  const exampleLine = profile.exampleLine === undefined ? null :
    boundedString(profile.exampleLine, MAX_TEXT, "profile.exampleLine");

  return freezeDeep({
    schemaVersion: 1,
    agent: { id: agentId },
    session: {
      id: snapshot.sessionId,
      revision: snapshot.revision,
      selectedContent: snapshot.source
    },
    profile: {
      id,
      version,
      source: {
        repository: sourceRepository,
        path: sourcePath,
        version: sourceVersion
      },
      mode: profile.mode,
      voiceGuidance,
      motives,
      goals,
      relationships,
      exampleLine
    },
    participant: {
      id: participant.id,
      name: participant.name,
      role: participant.role,
      condition: participant.condition,
      location: participant.location,
      knownFacts: permittedKnowledgeIds.map(factId => availableFacts.get(factId))
    }
  });
}
