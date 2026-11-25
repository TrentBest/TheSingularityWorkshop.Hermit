import { createSurpsObservationAdapter } from "../src/surps-observation.js";
import { createSurpsRoleContext } from "../src/surps-role-context.js";

async function loadJson(path) {
  const response = await fetch(new URL(path, import.meta.url), { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load ${path}: ${response.status}`);
  return response.json();
}

const [sessionFixture, profileDocument] = await Promise.all([
  loadJson("./embassy-reception-session.fixture.json"),
  loadJson("./embassy-reception-role-profiles.json")
]);
const profiles = new Map(profileDocument.profiles.map(profile => [profile.participantId, profile]));
const host = createSurpsObservationAdapter({
  readSession: async requestedSessionId => {
    if (requestedSessionId !== sessionFixture.sessionId) throw new Error("Unknown session.");
    return {
      sourceId: sessionFixture.sourceId,
      sourceVersion: sessionFixture.sourceVersion,
      sessionId: sessionFixture.sessionId,
      revision: sessionFixture.revision,
      activeCharacterId: sessionFixture.activeCharacterId,
      participants: structuredClone(sessionFixture.participants)
    };
  }
});

const $ = id => document.getElementById(id);
let selectedParticipantId = sessionFixture.activeCharacterId;
let observation;

function setSelected(id) {
  if (!profiles.has(id)) return;
  selectedParticipantId = id;
  document.querySelectorAll("[data-party-member]").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.partyMember === id));
  });
}

async function refreshObservation() {
  observation = await host.observe(sessionFixture.sessionId);
}

document.querySelectorAll("[data-party-member]").forEach(button => {
  button.addEventListener("click", () => setSelected(button.dataset.partyMember));
});

$("party-ask").addEventListener("click", async () => {
  const ask = $("party-ask");
  ask.disabled = true;
  $("hermit-party-response").textContent = "Hermit is selecting a bounded role context…";
  try {
    await refreshObservation();
    const profile = profiles.get(selectedParticipantId);
    if (!profile) throw new Error("No role profile is registered for this participant.");
    const context = createSurpsRoleContext(observation, profile);
    const { participant } = context;
    const role = context.profile;
    const facts = participant.knownFacts;
    const knowledge = facts.length
      ? facts.map(fact => `${fact.state}: ${fact.text}`).join("\n")
      : "No knowledge has been admitted to this role context.";

    const sections = [
      `Hermit · ${role.mode} · ${participant.name}`,
      `Voice: ${role.voiceGuidance}`,
      `Motives: ${role.motives.join("; ") || "None declared"}`,
      `Goals: ${role.goals.join("; ") || "None declared"}`,
      `Scoped knowledge:\n${knowledge}`
    ];
    if (role.exampleLine) {
      sections.push(`Deterministic sample portrayal (not LLM-generated): “${role.exampleLine}”`);
    }
    $("hermit-party-response").textContent = sections.join("\n\n");
    $("hermit-party-provenance").textContent =
      `Agent ${context.agent.id} · Profile ${role.id}@${role.version} · ` +
      `${role.source.repository}/${role.source.path} · ` +
      `Content ${context.session.selectedContent.id}@${context.session.selectedContent.version} · ` +
      `Session ${context.session.id} revision ${context.session.revision}`;
  } catch {
    $("hermit-party-response").textContent =
      "I couldn't verify this participant's role context. I won't guess or blend another participant's knowledge.";
  } finally {
    ask.disabled = false;
  }
});

refreshObservation().then(() => {
  $("hermit-party-provenance").textContent =
    `Synthetic host fixture · ${observation.source.id}@${observation.source.version} · ` +
    `Session ${observation.sessionId} revision ${observation.revision}`;
}).catch(() => {
  $("hermit-party-response").textContent =
    "I couldn't load the session observation. I won't invent what anyone knows.";
});
