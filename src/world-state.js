const MAX_OBJECTS = 256;
const MAX_ID_LENGTH = 64;
const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 1_024;
const MAX_LOCATION_LENGTH = 128;

export const WORLD_STATE_SCHEMA_VERSION = 1;

function fail(message) {
  throw new TypeError(`Invalid world-state snapshot: ${message}`);
}

function isPlainRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    [Object.prototype, null].includes(Object.getPrototypeOf(value));
}

function readDataRecord(value, allowedKeys, requiredKeys, label) {
  if (!isPlainRecord(value)) fail(`${label} must be a plain object.`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some(key => typeof key !== "string" || !allowedKeys.includes(key))) {
    fail(`${label} contains unsupported properties.`);
  }
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      fail(`${label} must contain enumerable data properties only.`);
    }
  }
  for (const key of requiredKeys) {
    if (!Object.hasOwn(descriptors, key)) fail(`${label} is missing ${key}.`);
  }
  return Object.fromEntries(keys.map(key => [key, descriptors[key].value]));
}

function boundedString(value, max, label, pattern) {
  if (typeof value !== "string" || value.length === 0 || value.length > max ||
      (pattern && !pattern.test(value))) {
    fail(`${label} must be a non-empty string within its limit.`);
  }
  return value;
}

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

/**
 * Creates an immutable, versioned observation of one environment revision.
 * This is a data contract only: it does not infer affordances or grant actions.
 */
export function createWorldStateSnapshot(value = {}) {
  const root = readDataRecord(
    value,
    ["environmentId", "revision", "objects"],
    ["environmentId", "revision", "objects"],
    "snapshot"
  );

  boundedString(root.environmentId, 128, "environmentId", /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/);
  if (!Number.isSafeInteger(root.revision) || root.revision < 0) {
    fail("revision must be a non-negative safe integer.");
  }
  if (!Array.isArray(root.objects) || root.objects.length > MAX_OBJECTS) {
    fail(`objects must be an array containing at most ${MAX_OBJECTS} entries.`);
  }

  const ids = new Set();
  const stableObjects = root.objects.map((item, index) => {
    const record = readDataRecord(
      item,
      ["id", "name", "description", "location"],
      ["id", "name", "description", "location"],
      `objects[${index}]`
    );
    const id = boundedString(record.id, MAX_ID_LENGTH, `objects[${index}].id`, /^[a-z0-9][a-z0-9-]*$/);
    if (ids.has(id)) fail(`duplicate object identity: ${id}.`);
    ids.add(id);
    return {
      id,
      name: boundedString(record.name, MAX_NAME_LENGTH, `objects[${index}].name`),
      description: boundedString(record.description, MAX_DESCRIPTION_LENGTH, `objects[${index}].description`),
      location: boundedString(record.location, MAX_LOCATION_LENGTH, `objects[${index}].location`)
    };
  });

  return freezeDeep({
    schemaVersion: WORLD_STATE_SCHEMA_VERSION,
    environmentId: root.environmentId,
    revision: root.revision,
    objects: stableObjects
  });
}

/** Re-validates an untrusted snapshot and returns a fresh immutable copy. */
export function validateWorldStateSnapshot(value) {
  const root = readDataRecord(
    value,
    ["schemaVersion", "environmentId", "revision", "objects"],
    ["schemaVersion", "environmentId", "revision", "objects"],
    "snapshot"
  );
  if (root.schemaVersion !== WORLD_STATE_SCHEMA_VERSION) {
    fail(`unsupported schemaVersion: ${root.schemaVersion}.`);
  }
  return createWorldStateSnapshot({
    environmentId: root.environmentId,
    revision: root.revision,
    objects: root.objects
  });
}
