import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("Pages lesson includes the animated Workshop moniker before the lesson heading", () => {
  const moniker = page.indexOf("TheSingularityWorkshop.Visualize/development/docs/assets/moniker.svg");
  const heading = page.indexOf("<h1>A neural network you can follow</h1>");
  assert.notEqual(moniker, -1);
  assert.ok(moniker < heading);
});

test("Pages lesson uses the canonical Workshop footer image", () => {
  assert.match(page, /https:\/\/raw\.githubusercontent\.com\/TrentBest\/FSM_API\/master\/Documentation\/Branding\/TheSingularityWorkshop\.png/);
});

test("Pages lesson exposes the live SVG and its deterministic module", () => {
  assert.match(page, /<svg id="network-visual"/);
  assert.match(page, /<script type="module" src="\.\/assets\/neural-network-demo\.js"><\/script>/);
});
