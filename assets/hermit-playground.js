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
  $("selected-object-description").textContent = item.description;
  document.querySelectorAll(".object-card").forEach(card => {
    card.classList.toggle("selected", card.dataset.objectId === objectId);
    card.setAttribute("aria-pressed", String(card.dataset.objectId === objectId));
  });
  $("approval-granted").checked = false;
  setStatus(`${item.name} selected. Choose an action for Hermit.`);
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
    card.innerHTML = `<span class="object-glyph" aria-hidden="true">${item.id === "glass" ? "◉" : item.id === "crate" ? "▣" : item.id.startsWith("player-object-") ? "✧" : "✥"}</span><span><strong></strong><small></small></span>`;
    card.querySelector("strong").textContent = item.name;
    card.querySelector("small").textContent = item.location === "workbench" ? "On workbench" : "In workshop";
    card.addEventListener("click", () => selectObject(item.id));
    card.addEventListener("dragstart", event => {
      event.dataTransfer.setData("text/plain", item.id);
      event.dataTransfer.effectAllowed = "copy";
    });
    (item.location === "workbench" ? bench : world).append(card);
  }

  if (!snapshot.objects.some(item => item.id === selectedObjectId)) {
    selectedObjectId = snapshot.objects[0]?.id ?? null;
  }
  const selected = snapshot.objects.find(item => item.id === selectedObjectId);
  if (selected) {
    $("selected-object-name").textContent = selected.name;
    $("selected-object-description").textContent = selected.description;
  }
  document.querySelectorAll(".object-card").forEach(card => {
    card.classList.toggle("selected", card.dataset.objectId === selectedObjectId);
    card.setAttribute("aria-pressed", String(card.dataset.objectId === selectedObjectId));
  });
  setBusy(busy);
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
      } else {
        const item = response.outcomes[0].result;
        setStatus(`Move verified: ${item.name} is now on the workbench.`, "success");
      }
      await refresh();
    } else {
      const message = response.error?.message ?? "The action did not complete.";
      setStatus(`Hermit stopped safely: ${message}`, "warning");
    }
  } catch (error) {
    setStatus(`Playground error: ${error.message}`, "warning");
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
  if (!name || !description) {
    setStatus("Give the new object both a name and a description.", "warning");
    return;
  }
  setBusy(true);
  try {
    const snapshot = await playground.addObject({ name, description });
    $("new-object-name").value = "";
    $("new-object-description").value = "";
    selectedObjectId = snapshot.objects.at(-1).id;
    renderObjects(snapshot);
    setStatus(name + " is now part of the Workshop scene. Hermit can inspect it.", "success");
    renderTrace([]);
  } catch (error) {
    setStatus("The object was not added: " + error.message, "warning");
  } finally {
    setBusy(false);
  }
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
