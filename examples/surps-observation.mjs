import {
  createSurpsObservationAdapter,
  createParticipantRoleContext
} from "../src/surps-observation.js";

// Synthetic host fixture: the host combines a selected SURPS content identity
// with participant records from their respective owning domains.
const session = {
  sourceId: "surps.microbundle.core.spying",
  sourceVersion: "0.1.0",
  sessionId: "embassy-reception",
  revision: 12,
  activeCharacterId: "player",
  participants: [
    {
      id: "player",
      name: "Mara",
      role: "player-character",
      condition: "Ready",
      location: "Embassy reception",
      knownFacts: [
        { id: "player-observed-cufflink", text: "A courier wears a silver cufflink.", source: "player-observation-1" }
      ]
    },
    {
      id: "companion",
      name: "Ivo",
      role: "companion",
      condition: "Uninjured",
      location: "Kitchen entrance",
      knownFacts: [
        { id: "companion-contact", text: "The kitchen contact agreed to meet.", source: "companion-conversation-2" }
      ]
    },
    {
      id: "courier",
      name: "The courier",
      role: "npc",
      condition: "Alert",
      location: "West gallery",
      knownFacts: [
        { id: "courier-secret", text: "The courier intends to use the west service exit.", source: "courier-private-intent" }
      ]
    }
  ]
};

const host = createSurpsObservationAdapter({
  readSession: async requestedSessionId => {
    if (requestedSessionId !== session.sessionId) throw new Error("Unknown session.");
    return structuredClone(session);
  }
});

const observation = await host.observe("embassy-reception");
const companionContext = createParticipantRoleContext(observation, "companion");
const courierContext = createParticipantRoleContext(observation, "courier");

console.log("Selected content:", observation.source.id, observation.source.version);
console.log("Session revision:", observation.revision);
console.log("Companion context:", JSON.stringify(companionContext.participant, null, 2));
console.log("NPC context:", JSON.stringify(courierContext.participant, null, 2));
console.log("Private courier fact leaked into companion context:",
  JSON.stringify(companionContext).includes("courier-private-intent"));
