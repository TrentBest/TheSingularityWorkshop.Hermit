const acceptedKinds = new Set(["scene-entered", "scene-changed", "entity-focused", "entity-cleared"]);
const allowedEntities = new Set(["workbench", "lamp", "book"]);
let latestRevision = 0;

function validateObservation(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (value.schema !== "hermit.scene-observation.v1" || value.source !== "host") return null;
  if (!Number.isSafeInteger(value.revision) || value.revision < 1 || value.revision <= latestRevision) return null;
  if (!acceptedKinds.has(value.kind)) return null;
  if (typeof value.observedAt !== "string" || !Number.isFinite(Date.parse(value.observedAt))) return null;
  if (value.kind === "entity-focused" && !allowedEntities.has(value.entityId)) return null;
  if (value.kind !== "entity-focused" && value.entityId !== undefined && value.entityId !== null) return null;
  return Object.freeze({
    schema: value.schema,
    source: value.source,
    revision: value.revision,
    kind: value.kind,
    entityId: value.kind === "entity-focused" ? value.entityId : null,
    observedAt: value.observedAt
  });
}

window.addEventListener("hermit:host-observation", event => {
  const observation = validateObservation(event.detail);
  if (!observation) {
    window.dispatchEvent(new CustomEvent("hermit:host-observation-rejected", {
      detail: Object.freeze({ reason: "invalid-or-stale-observation" })
    }));
    return;
  }
  latestRevision = observation.revision;
  window.dispatchEvent(new CustomEvent("hermit:host-observation-accepted", {
    detail: observation
  }));
});

export { validateObservation };
