const acceptedKinds = new Set(["scene-entered", "scene-changed", "entity-focused", "entity-cleared"]);

export function createSceneObservationValidator(allowedEntityIds = []) {
  const allowedEntities = new Set(allowedEntityIds);
  let latestRevision = 0;

  return function validateSceneObservation(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    if (value.schema !== "hermit.scene-observation.v1" || value.source !== "host") return null;
    if (!Number.isSafeInteger(value.revision) || value.revision < 1 || value.revision <= latestRevision) return null;
    if (!acceptedKinds.has(value.kind)) return null;
    if (typeof value.observedAt !== "string" || !Number.isFinite(Date.parse(value.observedAt))) return null;
    if (value.kind === "entity-focused" && !allowedEntities.has(value.entityId)) return null;
    if (value.kind !== "entity-focused" && value.entityId !== undefined && value.entityId !== null) return null;

    latestRevision = value.revision;
    return Object.freeze({
      schema: value.schema,
      source: value.source,
      revision: value.revision,
      kind: value.kind,
      entityId: value.kind === "entity-focused" ? value.entityId : null,
      observedAt: value.observedAt
    });
  };
}
