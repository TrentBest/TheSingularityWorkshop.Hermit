import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../index.html", import.meta.url), "utf8");
const playground = await readFile(new URL("../assets/hermit-playground.js", import.meta.url), "utf8");
const voice = await readFile(new URL("../assets/hermit-voice.js", import.meta.url), "utf8");
const playgroundCore = await readFile(new URL("../src/hermit-playground.js", import.meta.url), "utf8");
const catalog = await readFile(new URL("../src/playground-capabilities.js", import.meta.url), "utf8");
const party = await readFile(new URL("../assets/hermit-party.js", import.meta.url), "utf8");
const surpsObservation = await readFile(new URL("../src/surps-observation.js", import.meta.url), "utf8");
const surpsRoleContext = await readFile(new URL("../src/surps-role-context.js", import.meta.url), "utf8");
const roleProfiles = JSON.parse(await readFile(new URL("../assets/embassy-reception-role-profiles.json", import.meta.url), "utf8"));
const sessionFixture = JSON.parse(await readFile(new URL("../assets/embassy-reception-session.fixture.json", import.meta.url), "utf8"));

test("Pages experience introduces Hermit before the learning modules", () => {
  const moniker = page.indexOf("TheSingularityWorkshop.Visualize/development/docs/assets/moniker.svg");
  const heading = page.indexOf("<h1>Meet Hermit in the Workshop</h1>");
  const scene = page.indexOf('id="hermit-playground"');
  assert.notEqual(moniker, -1);
  assert.ok(moniker < heading);
  assert.ok(heading < scene);
});

test("Pages experience retains the canonical Workshop footer image and neural lesson", () => {
  assert.match(page, /https:\/\/raw\.githubusercontent\.com\/TrentBest\/FSM_API\/master\/Documentation\/Branding\/TheSingularityWorkshop\.png/);
  assert.match(page, /<svg id="network-visual"/);
  assert.match(page, /<script type="module" src="\.\/assets\/neural-network-demo\.js"><\/script>/);
});

test("Hermit playground is wired to the deterministic runtime module", () => {
  assert.match(page, /<script type="module" src="\.\/assets\/hermit-playground\.js"><\/script>/);
  assert.match(playground, /createHermitPlayground/);
  assert.match(playground, /approvalGranted/);
  assert.match(playground, /step-verified/);
  assert.match(voice, /createSpeechSynthesisAdapter/);
  assert.match(voice, /createSpeechRecognitionAdapter/);
  assert.match(voice, /window\.webkitSpeechRecognition/);
  assert.match(voice, /approval-required/);
});

test("the architecture map explains intent, trust, environment, and current integration limits", () => {
  assert.match(page, /id="domain-map"/);
  assert.match(page, /Intent and planning/);
  assert.match(page, /Capability and trust/);
  assert.match(page, /Environment and evidence/);
  assert.match(page, /Gestures\/Physics adapters/);
});

test("the page has unique IDs and one top-level heading", () => {
  const ids = [...page.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, "HTML id attributes must be unique");
  assert.equal((page.match(/<h1\b/g) ?? []).length, 1);
  assert.match(page, /aria-labelledby="neural-lesson-title"/);
});

test("the Pages scene exposes keyboard-operable object selection and host approval", () => {
  assert.match(page, /id="world-objects"/);
  assert.match(page, /id="workbench-objects"/);
  assert.match(page, /id="approval-granted"/);
  assert.match(page, /id="activity-trace"/);
});

test("Pages exposes speech output, optional recognition, and a typed intent fallback", () => {
  assert.match(page, /id="voice-interface"/);
  assert.match(page, /id="voice-speak"/);
  assert.match(page, /id="voice-listen"/);
  assert.match(page, /id="voice-request"/);
  assert.match(page, /id="voice-capabilities"/);
  assert.match(page, /id="voice-help-example"/);
  assert.match(voice, /status === "discovery"/);
  assert.match(page, /<script type="module" src="\.\/assets\/hermit-voice\.js"><\/script>/);
  assert.match(playground, /approvalGranted/);
});


test("the browser shell supplies its own validated capability catalog to voice discovery", () => {
  assert.match(playgroundCore, /PLAYGROUND_CAPABILITY_CATALOG/);
  assert.match(playgroundCore, /capabilityCatalog: \(\) => PLAYGROUND_CAPABILITY_CATALOG/);
  assert.match(catalog, /id: "inspect-object"/);
  assert.match(catalog, /id: "move-object"/);
  assert.match(playground, /window\.hermitCapabilityCatalog = playground\.capabilityCatalog\(\)/);
  assert.match(voice, /window\.hermitCapabilityCatalog/);
});

test("Hermit presents a diegetic party scene using versioned, participant-scoped context", () => {
  assert.match(page, /id="party-presence"/);
  assert.match(page, /id="party-roster"/);
  assert.match(page, /id="hermit-party-response"/);
  assert.match(page, /<script type="module" src="\.\/assets\/hermit-party\.js"><\/script>/);
  assert.match(party, /createSurpsObservationAdapter/);
  assert.match(party, /createSurpsRoleContext/);
  assert.match(surpsRoleContext, /permittedKnowledgeIds/);
  assert.match(page, /data-party-member="kitchen-contact"/);
  assert.equal(roleProfiles.profiles.filter(profile => profile.mode === "npc-portrayal").length, 2);
  assert.equal(new Set(roleProfiles.profiles.map(profile => profile.agentId)).size, 1);
  assert.equal(sessionFixture.sourceId, "surps.microbundle.core.spying");
  assert.match(surpsObservation, /session revision moved backwards/);
  assert.match(surpsObservation, /participant's authorized portrayal context/);
});
