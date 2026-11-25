import {
  createSurpsObservationAdapter,
  createParticipantRoleContext
} from "../src/surps-observation.js";

const sessionFixture = {
  sourceId: "surps.microbundle.core.spying",
  sourceVersion: "0.1.0",
  sessionId: "embassy-reception",
  revision: 12,
  activeCharacterId: "player",
  participants: [
    {
      id: "player", name: "Mara", role: "player-character",
      condition: "Ready", location: "Embassy reception",
      knownFacts: [
        { id: "player-observed-cufflink", state: "Observed", text: "A courier wears a silver cufflink.", source: "player-observation-1" }
      ]
    },
    {
      id: "companion", name: "Ivo", role: "companion",
      condition: "Uninjured", location: "Kitchen entrance",
      knownFacts: [
        { id: "companion-contact", state: "Reported", text: "The kitchen contact agreed to meet.", source: "companion-conversation-2" }
      ]
    },
    {
      id: "courier", name: "The courier", role: "npc",
      condition: "Alert", location: "West gallery",
      knownFacts: [
        { id: "courier-private-intent", state: "Claimed", text: "The courier intends to use the west service exit.", source: "courier-private-intent" }
      ]
    }
  ]
};

const host = createSurpsObservationAdapter({
  readSession: async requestedSessionId => {
    if (requestedSessionId !== sessionFixture.sessionId) throw new Error("Unknown session.");
    return structuredClone(sessionFixture);
  }
});

const $ = id => document.getElementById(id);
let selectedParticipantId = sessionFixture.activeCharacterId;
let observation;

function setSelected(id) {
  selectedParticipantId = id;
  document.querySelectorAll("[data-party-member]").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.partyMember === id));
  });
}

async function refreshObservation() {
  observation = await host.observe(sessionFixture.sessionId);
  $("hermit-party-provenance").textContent =
    `Selected content: ${observation.source.id} · ${observation.source.version} · Session revision ${observation.revision}`;
}

document.querySelectorAll("[data-party-member]").forEach(button => {
  button.addEventListener("click", () => setSelected(button.dataset.partyMember));
});

$("party-ask").addEventListener("click", async () => {
  const ask = $("party-ask");
  ask.disabled = true;
  $("hermit-party-response").textContent = "Let me check what this person actually knows…";
  try {
    await refreshObservation();
    const context = createParticipantRoleContext(observation, selectedParticipantId);
    const { participant } = context;
    const facts = participant.knownFacts;
    const detail = facts.length
      ? facts.map(fact => `${fact.state}: ${fact.text}`).join(" ")
      : "I don't have any recorded knowledge for them in this observation.";
    $("hermit-party-response").textContent =
      participant.role === "npc"
        ? `${participant.name} knows: ${detail}`
        : `${participant.name} can tell us: ${detail}`;
  } catch {
    $("hermit-party-response").textContent =
      "I couldn't verify this participant's context. I won't guess.";
  } finally {
    ask.disabled = false;
  }
});

refreshObservation().catch(() => {
  $("hermit-party-response").textContent =
    "I couldn't load the session observation. I won't invent what anyone knows.";
});
