import test from "node:test";
import assert from "node:assert/strict";
import {
  SURPS_OBSERVATION_SCHEMA_VERSION,
  createSurpsObservation,
  validateSurpsObservation,
  createSurpsObservationAdapter,
  createParticipantRoleContext
} from "../src/surps-observation.js";

const sample = (revision = 4) => ({
  sourceId: "surps.microbundle.core.spying",
  sourceVersion: "0.1.0",
  sessionId: "campaign-one",
  revision,
  activeCharacterId: "player",
  participants: [
    { id: "player", name: "Player", role: "player-character", condition: "Ready", location: "Gate",
      knownFacts: [{ id: "rumor-1", text: "A bell rang beneath the hill.", source: "scene-observation-12" }] },
    { id: "companion", name: "Companion", role: "companion", condition: "Uninjured", location: "Gate", knownFacts: [] },
    { id: "guard", name: "Gate Guard", role: "npc", condition: "Alert", location: "Gate",
      knownFacts: [{ id: "guard-knowledge", text: "The gate closes at dusk.", source: "guard-briefing" }] }
  ]
});

test("creates detached immutable observations with explicit provider and schema versions", () => {
  const input = sample();
  const snapshot = createSurpsObservation(input);
  input.participants[0].knownFacts[0].text = "tampered";
  assert.equal(snapshot.schemaVersion, SURPS_OBSERVATION_SCHEMA_VERSION);
  assert.equal(snapshot.source.id, "surps.microbundle.core.spying");
  assert.equal(snapshot.participants[0].knownFacts[0].text, "A bell rang beneath the hill.");
  assert.ok(Object.isFrozen(snapshot));
  assert.ok(Object.isFrozen(snapshot.participants[0].knownFacts[0]));
});

test("validates and re-snapshots observations", () => {
  const snapshot = createSurpsObservation(sample());
  const copy = validateSurpsObservation(snapshot);
  assert.notEqual(copy, snapshot);
  assert.deepEqual(copy, snapshot);
  assert.ok(Object.isFrozen(copy));
});

test("rejects duplicate identities, invalid active character, unknown fields and unsupported versions", () => {
  const duplicate = sample();
  duplicate.participants.push({ ...duplicate.participants[1] });
  assert.throws(() => createSurpsObservation(duplicate), /duplicate participant/);
  assert.throws(() => createSurpsObservation({ ...sample(), activeCharacterId: "guard" }), /player-character/);
  assert.throws(() => createSurpsObservation({ ...sample(), invented: true }), /unsupported properties/);
  assert.throws(() => validateSurpsObservation({ ...createSurpsObservation(sample()), schemaVersion: 2 }), /unsupported schemaVersion/);
});

test("rejects unsafe data properties without invoking getters", () => {
  const input = sample();
  let invoked = false;
  Object.defineProperty(input.participants[0], "name", {
    enumerable: true, get() { invoked = true; return "forged"; }
  });
  assert.throws(() => createSurpsObservation(input), /data properties only/);
  assert.equal(invoked, false);
});

test("rejects duplicate or unbounded knowledge and missing participant data", () => {
  const input = sample();
  input.participants[0].knownFacts.push({ ...input.participants[0].knownFacts[0] });
  assert.throws(() => createSurpsObservation(input), /duplicate knowledge/);
  assert.throws(() => createSurpsObservation({ ...sample(), participants: [] }), /between 1 and/);
});

test("host adapter returns only validated read snapshots and rejects session substitution or rollback", async () => {
  let current = sample(8);
  const adapter = createSurpsObservationAdapter({ readSession: async () => current });
  const first = await adapter.observe("campaign-one");
  assert.equal(first.revision, 8);
  assert.ok(Object.isFrozen(first));
  current = sample(7);
  await assert.rejects(adapter.observe("campaign-one"), /revision moved backwards/);
  current = { ...sample(9), sessionId: "different-session" };
  await assert.rejects(adapter.observe("campaign-one"), /different session identity/);
});

test("requires a trusted host read function and validates requested session identities", async () => {
  assert.throws(() => createSurpsObservationAdapter(), /readSession function/);
  const adapter = createSurpsObservationAdapter({ readSession: async () => sample() });
  await assert.rejects(adapter.observe("../outside"), /sessionId/);
});

test("participant role context contains only that participant's knowledge", () => {
  const snapshot = createSurpsObservation(sample());
  const guardContext = createParticipantRoleContext(snapshot, "guard");
  assert.equal(guardContext.participant.role, "npc");
  assert.deepEqual(guardContext.participant.knownFacts.map(fact => fact.id), ["guard-knowledge"]);
  assert.equal(JSON.stringify(guardContext).includes("rumor-1"), false);
  assert.ok(Object.isFrozen(guardContext));
  assert.throws(() => createParticipantRoleContext(snapshot, "missing"), /not present/);
});

