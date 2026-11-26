import { createHermitPlayground } from "../src/hermit-playground.js";

const playground = createHermitPlayground();
window.hermitCapabilityCatalog = playground.capabilityCatalog();
const $ = id => document.getElementById(id);
let selectedObjectId = "compass";
let busy = false;

const labels = {
  "task-created": "Task created",
  "observation-received": "Environment observed",
  "step-proposed": "Action proposed",
  "capability-resolved": "Capability resolved",
  "policy-evaluated": "Host policy evaluated",
  "approval-required": "Approval required",
  "execution-started": "Action started",
  "execution-completed": "Action completed",
  "step-verified": "Environment verified",
  "task-verified-complete": "Task complete",
  "task-failed": "Task stopped"
};

function setStatus(message, kind = "normal") {
  const status = $("scene-status");
  status.textContent = message;
  status.dataset.kind = kind;
}

function setBusy(value) {
  busy = value;
  $("inspect-button").disabled = value || !selectedObjectId;
  $("move-button").disabled = value || !selectedObjectId;
  $("approval-granted").disabled = value;
  $("object-creator").querySelector("button[type=submit]").disabled = value;
  document.querySelectorAll(".object-card").forEach(card => {
    card.disabled = value;
    card.draggable = !value;
  });
}

function selectObject(objectId) {
  selectedObjectId = objectId;
  const snapshot = window.hermitWorldSnapshot;
  const item = snapshot?.objects.find(candidate => candidate.id === objectId);
  if (!item) return;
  $("selected-object-name").textContent = item.name;
  $("selected-object-description").textContent = `${item.description} Shape: ${item.shape}; material: ${item.material}; dimensions ${item.dimensions.x} × ${item.dimensions.y} × ${item.dimensions.z}; position ${item.position.x}, ${item.position.y}, ${item.position.z}. Affordances: ${item.affordances.join(", ")}.`;
  document.querySelectorAll(".object-card").forEach(card => {
    card.classList.toggle("selected", card.dataset.objectId === objectId);
    card.setAttribute("aria-pressed", String(card.dataset.objectId === objectId));
  });
  $("approval-granted").checked = false;
  setStatus(`${item.name} selected. Choose an action for Hermit.`);
  renderScene(snapshot);
}

function renderObjects(snapshot) {
  window.hermitWorldSnapshot = snapshot;
  const world = $("world-objects");
  const bench = $("workbench-objects");
  world.replaceChildren();
  bench.replaceChildren();
  for (const item of snapshot.objects) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "object-card";
    card.draggable = !busy;
    card.dataset.objectId = item.id;
    card.setAttribute("aria-pressed", String(item.id === selectedObjectId));
    const glyph = document.createElement("span");
    glyph.className = "object-glyph";
    glyph.setAttribute("aria-hidden", "true");
    const shape = document.createElement("span");
    shape.className = `shape-preview shape-${item.shape}`;
    glyph.append(shape);
    const copy = document.createElement("span");
    const title = document.createElement("strong");
    const detail = document.createElement("small");
    title.textContent = item.name;
    detail.textContent = `${item.shape} · ${item.material} · ${item.dimensions.x}×${item.dimensions.y}×${item.dimensions.z}`;
    copy.append(title, detail);
    card.append(glyph, copy);
    card.addEventListener("click", () => selectObject(item.id));
    card.addEventListener("dragstart", event => { event.dataTransfer.setData("text/plain", item.id); event.dataTransfer.effectAllowed = "copy"; });
    (item.location === "workbench" ? bench : world).append(card);
  }
  if (!snapshot.objects.some(item => item.id === selectedObjectId)) selectedObjectId = snapshot.objects[0]?.id ?? null;
  const selected = snapshot.objects.find(item => item.id === selectedObjectId);
  if (selected) {
    $("selected-object-name").textContent = selected.name;
    $("selected-object-description").textContent = `${selected.description} Shape: ${selected.shape}; material: ${selected.material}; dimensions ${selected.dimensions.x} × ${selected.dimensions.y} × ${selected.dimensions.z}; position ${selected.position.x}, ${selected.position.y}, ${selected.position.z}. Affordances: ${selected.affordances.join(", ")}.`;
  }
  document.querySelectorAll(".object-card").forEach(card => { card.classList.toggle("selected", card.dataset.objectId === selectedObjectId); card.setAttribute("aria-pressed", String(card.dataset.objectId === selectedObjectId)); });
  renderScene(snapshot);
  setBusy(busy);
}

function renderScene(snapshot) {
  const svg = $("scene-map");
  if (!svg) return;
  const ns = "http://www.w3.org/2000/svg";
  const make = (tag, attrs = {}) => { const node = document.createElementNS(ns, tag); for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value)); return node; };
  const width = 640, height = 280, pad = 40;
  const bounds = snapshot.objects.reduce((b, item) => ({ minX: Math.min(b.minX, item.position.x - item.dimensions.x / 2), maxX: Math.max(b.maxX, item.position.x + item.dimensions.x / 2), minZ: Math.min(b.minZ, item.position.z - item.dimensions.z / 2), maxZ: Math.max(b.maxZ, item.position.z + item.dimensions.z / 2) }), { minX: -2, maxX: 2, minZ: -2, maxZ: 2 });
  const spanX = Math.max(1, bounds.maxX - bounds.minX), spanZ = Math.max(1, bounds.maxZ - bounds.minZ);
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanZ);
  const centerX = (bounds.minX + bounds.maxX) / 2, centerZ = (bounds.minZ + bounds.maxZ) / 2;
  const point = item => ({ x: width / 2 + (item.position.x - centerX) * scale, y: height / 2 - (item.position.z - centerZ) * scale });
  const colors = { wood: "#b98752", metal: "#9fb5c2", glass: "#75cbd0", stone: "#9b9aa8", fabric: "#b68cc9" };
  const children = [make("rect", { x: 1, y: 1, width: 638, height: 278, rx: 12, fill: "#0b151c", stroke: "#405766" })];
  for (let x = 80; x < width; x += 80) children.push(make("line", { x1: x, y1: 12, x2: x, y2: 268, stroke: "#263b49", "stroke-dasharray": "3 6" }));
  for (let y = 40; y < height; y += 40) children.push(make("line", { x1: 12, y1: y, x2: 628, y2: y, stroke: "#263b49", "stroke-dasharray": "3 6" }));
  for (const item of snapshot.objects) {
    const p = point(item), w = Math.max(10, Math.min(180, item.dimensions.x * scale)), h = Math.max(10, Math.min(180, item.dimensions.z * scale));
    const group = make("g", { class: "scene-object" + (item.id === selectedObjectId ? " selected" : ""), tabindex: 0, role: "button", "aria-label": `${item.name}, ${item.shape}, ${item.material}, at X ${item.position.x}, Z ${item.position.z}` });
    const shape = item.shape === "sphere" ? make("circle", { cx: p.x, cy: p.y, r: Math.max(6, Math.min(90, Math.max(w, h) / 2)) }) : make("rect", { x: p.x - w / 2, y: p.y - h / 2, width: w, height: h, rx: item.shape === "cylinder" ? Math.min(w, h) / 2 : 3 });
    shape.setAttribute("class", "scene-shape"); shape.setAttribute("transform", `rotate(${item.rotation.y} ${p.x} ${p.y})`); shape.setAttribute("fill", colors[item.material]); shape.setAttribute("stroke", item.id === selectedObjectId ? "#ffffff" : "#edf3f7"); shape.setAttribute("stroke-width", item.id === selectedObjectId ? "3" : "1.5");
    group.append(shape);
    const label = make("text", { x: p.x, y: p.y + h / 2 + 15, class: "scene-object-label" }); label.textContent = item.name; group.append(label);
    const activate = () => selectObject(item.id); group.addEventListener("click", activate);
    group.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); activate(); } });
    children.push(group);
  }
  svg.replaceChildren(...children);
  $("scene-map-description").textContent = `${snapshot.objects.length} objects shown in a top-down X/Z preview. Select a prop to inspect it. This view is schematic and does not simulate collisions or physics.`;
}
function renderTrace(trace) {
  const list = $("activity-trace");
  list.replaceChildren();
  for (const event of trace) {
    const row = document.createElement("li");
    const title = document.createElement("strong");
    const detail = document.createElement("span");
    title.textContent = labels[event.event] ?? event.event;
    detail.textContent = event.capabilityId ? ` · ${event.capabilityId}` :
      event.decision ? ` · ${event.decision}` :
      event.code ? ` · ${event.code}` : "";
    row.append(title, detail);
    list.append(row);
  }
}

async function refresh() {
  renderObjects(await playground.snapshot());
}

async function perform(action) {
  if (busy || !selectedObjectId) return;
  setBusy(true);
  setStatus(action === "inspect"
    ? "Hermit is inspecting the selected object…"
    : "Hermit is requesting a host-authorized move…");
  window.setHermitPresence?.("working", action === "inspect" ? "I am taking a closer look." : "I am preparing the move request for host review.");
  try {
    const response = action === "inspect"
      ? await playground.inspect(selectedObjectId)
      : await playground.moveToWorkbench(selectedObjectId, {
          approvalGranted: $("approval-granted").checked
        });
    renderTrace(response.trace);
    if (response.status === "completed") {
      if (action === "inspect") {
        const item = response.outcomes[0].result;
        setStatus(`Inspection verified: ${item.name} is at the ${item.location}. ${item.description}`, "success");
        window.setHermitPresence?.("speaking", `I had a look. ${item.name}: ${item.description}`);
      } else {
        const item = response.outcomes[0].result;
        setStatus(`Move verified: ${item.name} is now on the workbench.`, "success");
        window.setHermitPresence?.("speaking", `The host verified it: ${item.name} is now on the workbench.`);
      }
      await refresh();
    } else {
      const message = response.error?.message ?? "The action did not complete.";
      setStatus(`Hermit stopped safely: ${message}`, "warning");
    }
  } catch (error) {
    setStatus(`Playground error: ${error.message}`, "warning");
    window.setHermitPresence?.("concerned", `I stopped because something went wrong: ${error.message}`);
  } finally {
    setBusy(false);
  }
}

for (const zone of document.querySelectorAll("[data-drop-zone]")) {
  zone.addEventListener("dragover", event => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    zone.classList.add("drop-ready");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("drop-ready"));
  zone.addEventListener("drop", event => {
    event.preventDefault();
    zone.classList.remove("drop-ready");
    const objectId = event.dataTransfer.getData("text/plain");
    if (window.hermitWorldSnapshot?.objects.some(item => item.id === objectId)) {
      selectObject(objectId);
      setStatus("Object selected. Dropping only selects it; Hermit must perform and verify any move.");
    }
  });
}

$("object-creator").addEventListener("submit", async event => {
  event.preventDefault();
  if (busy) return;
  const name = $("new-object-name").value.trim();
  const description = $("new-object-description").value.trim();
  if (!name || !description) { setStatus("Give the new object both a name and a description.", "warning"); return; }
  setBusy(true);
  try {
    const number = id => Number($(id).value);
    const snapshot = await playground.addObject({
      name, description, shape: $("new-object-shape").value, material: $("new-object-material").value,
      dimensions: { x: number("new-object-width"), y: number("new-object-height"), z: number("new-object-depth") },
      position: { x: number("new-object-x"), y: number("new-object-y"), z: number("new-object-z") },
      affordances: ["inspect", "move"]
    });
    $("new-object-name").value = "";
    $("new-object-description").value = "";
    for (const id of ["new-object-width", "new-object-height", "new-object-depth"]) $(id).value = "1";
    for (const id of ["new-object-x", "new-object-y", "new-object-z"]) $(id).value = "0";
    selectedObjectId = snapshot.objects.at(-1).id;
    renderObjects(snapshot);
    setStatus(name + " is now part of the Workshop scene. Hermit can inspect its geometry and declared affordances.", "success");
    renderTrace([]);
  } catch (error) { setStatus("The object was not added: " + error.message, "warning"); }
  finally { setBusy(false); }
});

$("inspect-button").addEventListener("click", () => perform("inspect"));
$("move-button").addEventListener("click", () => perform("move"));
$("approval-granted").addEventListener("change", event => {
  $("approval-copy").textContent = event.target.checked
    ? "You approved this single move. Hermit will still ask host policy."
    : "A move changes the environment and requires your explicit approval.";
});
$("reset-scene").addEventListener("click", async () => {
  window.location.reload();
});

window.hermitWorldReady = refresh().then(() => {
  renderTrace([]);
  setStatus("Environment ready. Select or drag an object to the interaction pad.");
  return window.hermitWorldSnapshot;
});
