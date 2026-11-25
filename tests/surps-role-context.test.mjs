import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createSurpsObservation } from "../src/surps-observation.js";
import { createSurpsRoleContext } from "../src/surps-role-context.js";

const sessionFixture = JSON.parse(await readFile(
  new URL("../assets/embassy-reception-session.fixture.json", import.meta.url), "utf8"
));
const profileDocument = JSON.parse(await readFile(
  new URL("../assets/embassy-reception-role-profiles.json", import.meta.url), "utf8"
));
const profiles = new Map(profileDocument.profiles.map(profile => [profile.participantId, profile]));

function observation() {
  return createSurpsObservation({
    sourceId: sessionFixture.sourceId,
    sourceVersion: sessionFixture.sourceVersion,
    sessionId: sessionFixture.sessionId,
    revision: sessionFixture.revision,
    activeCharacterId: sessionFixture.activeCharacterId,
    participants: structuredClone(sessionFixture.participants)
  });
}

test("builds immutable player, companion, and NPC contexts from one session revision", () => {
  const snapshot = observation();
  const player = createSurpsRoleContext(snapshot, profiles.get("player"));
  const companion = createSurpsRoleContext(snapshot, profiles.get("companion"));
  const courier = createSurpsRoleContext(snapshot, profiles.get("courier"));

  assert.equal(player.session.revision, 12);
  assert.equal(companion.session.selectedContent.id, "surps.microbundle.core.spying");
  assert.equal(player.agent.id, "hermit");
  assert.equal(companion.agent.id, "hermit");
  assert.equal(courier.agent.id, "hermit");
  assert.notEqual(companion.profile.id, courier.profile.id);
  assert.ok(Object.isFrozen(companion));
  assert.ok(Object.isFrozen(companion.participant.knownFacts[0]));
});

test("two NPC personas have distinct guidance, motives, relationships, and scoped knowledge", () => {
  const snapshot = observation();
  const courier = createSurpsRoleContext(snapshot, profiles.get("courier"));
  const contact = createSurpsRoleContext(snapshot, profiles.get("kitchen-contact"));

  assert.equal(courier.participant.role, "npc");
  assert.equal(contact.participant.role, "npc");
  assert.notEqual(courier.profile.voiceGuidance, contact.profile.voiceGuidance);
  assert.notDeepEqual(courier.profile.motives, contact.profile.motives);
  assert.notDeepEqual(courier.profile.goals, contact.profile.goals);
  assert.deepEqual(courier.participant.knownFacts.map(fact => fact.id), ["courier-private-intent"]);
  assert.deepEqual(contact.participant.knownFacts.map(fact => fact.id), ["contact-observed-courier"]);
  assert.equal(JSON.stringify(courier).includes("contact-observed-courier"), false);
  assert.equal(JSON.stringify(contact).includes("courier-private-intent"), false);
});

test("a deterministic fake inference receives only the selected role context", async () => {
  const snapshot = observation();
  const profile = profiles.get("kitchen-contact");
  const context = createSurpsRoleContext(snapshot, profile);
  const fakeInference = async ({ roleContext }) => ({
    profileId: roleContext.profile.id,
    observedRevision: roleContext.session.revision,
    dialogue: roleContext.profile.exampleLine,
    citedKnowledgeIds: roleContext.participant.knownFacts.map(fact => fact.id)
  });

  const response = await fakeInference({ roleContext: context });
  assert.equal(response.profileId, profile.id);
  assert.equal(response.observedRevision, 12);
  assert.match(response.dialogue, /private meeting near the kitchen entrance/);
  assert.deepEqual(response.citedKnowledgeIds, ["contact-observed-courier"]);
  assert.equal(JSON.stringify(response).includes("courier-private-intent"), false);
});

test("rejects cross-participant knowledge, role mismatches, and unknown relationship identities", () => {
  const snapshot = observation();
  const courier = structuredClone(profiles.get("courier"));
  courier.permittedKnowledgeIds = ["contact-observed-courier"];
  assert.throws(() => createSurpsRoleContext(snapshot, courier), /does not belong to the selected participant/);

  const wrongMode = structuredClone(profiles.get("courier"));
  wrongMode.mode = "companion";
  assert.throws(() => createSurpsRoleContext(snapshot, wrongMode), /does not match the participant role/);

  const unknownRelationship = structuredClone(profiles.get("courier"));
  unknownRelationship.relationships = [{
    participantId: "unregistered-person",
    relationship: "secret ally",
    context: "This identity is not in the session."
  }];
  assert.throws(() => createSurpsRoleContext(snapshot, unknownRelationship), /unknown participant/);
});

test("rejects malformed or unsupported role profiles", () => {
  const snapshot = observation();
  assert.throws(() => createSurpsRoleContext(snapshot, {
    ...profiles.get("companion"), unexpected: "not allowed"
  }), /unsupported properties/);
  assert.throws(() => createSurpsRoleContext(snapshot, {
    ...profiles.get("companion"), schemaVersion: 2
  }), /unsupported profile schemaVersion/);
  assert.throws(() => createSurpsRoleContext(snapshot, {
    ...profiles.get("companion"), permittedKnowledgeIds: ["missing-fact"]
  }), /does not belong to the selected participant/);
});
