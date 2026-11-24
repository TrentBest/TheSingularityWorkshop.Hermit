import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../index.html", import.meta.url), "utf8");
const playground = await readFile(new URL("../assets/hermit-playground.js", import.meta.url), "utf8");

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
});

test("the Pages scene exposes keyboard-operable object selection and host approval", () => {
  assert.match(page, /id="world-objects"/);
  assert.match(page, /id="workbench-objects"/);
  assert.match(page, /id="approval-granted"/);
  assert.match(page, /id="activity-trace"/);
});
