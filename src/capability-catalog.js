const CATALOG_VERSION = 1;
const MAX_CAPABILITIES = 64;
const MAX_EXAMPLES = 8;
const MAX_TEXT = 500;
const ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const RISK_LEVELS = new Set(["read-only", "reversible", "consequential", "external"]);

function fail(message) {
  const error = new TypeError("Invalid capability catalog: " + message);
  error.code = "INVALID_CAPABILITY_CATALOG";
  throw error;
}

function ownDataObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) {
    fail(label + " must be a plain object.");
  }
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (key === "__proto__" || key === "prototype" || key === "constructor") fail(label + " contains a forbidden key.");
    if (!("value" in descriptor)) fail(label + " must not contain accessors.");
  }
  return value;
}

function text(value, label, maximum = MAX_TEXT) {
  if (typeof value !== "string" || !value.trim() || value.length > maximum) fail(label + " must be a non-empty string of at most " + maximum + " characters.");
  return value.trim();
}

function validateInputSchema(schema) {
  if (schema === undefined) return null;
  ownDataObject(schema, "inputSchema");
  if (schema.type !== "object" || schema.additionalProperties !== false) {
    fail("inputSchema must be an object schema with additionalProperties=false.");
  }
  const properties = schema.properties ?? {};
  ownDataObject(properties, "inputSchema.properties");
  const names = Object.keys(properties);
  if (names.length > 32) fail("inputSchema has too many properties.");
  for (const name of names) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(name)) fail("inputSchema has an invalid property name.");
    const definition = ownDataObject(properties[name], "inputSchema property");
    if (!["string", "number", "integer", "boolean"].includes(definition.type)) fail("inputSchema property types must be scalar.");
    if (definition.type === "string" && definition.maxLength !== undefined &&
        (!Number.isInteger(definition.maxLength) || definition.maxLength < 1 || definition.maxLength > 4000)) {
      fail("string maxLength must be between 1 and 4000.");
    }
    if (["number", "integer"].includes(definition.type)) {
      if (definition.minimum !== undefined && !Number.isFinite(definition.minimum)) fail("numeric minimum must be finite.");
      if (definition.maximum !== undefined && !Number.isFinite(definition.maximum)) fail("numeric maximum must be finite.");
      if (definition.minimum !== undefined && definition.maximum !== undefined && definition.minimum > definition.maximum) fail("numeric bounds are reversed.");
    }
    for (const key of Object.keys(definition)) {
      if (!["type", "maxLength", "minimum", "maximum", "description", "enum"].includes(key)) fail("unsupported inputSchema keyword: " + key);
    }
    if (definition.description !== undefined) text(definition.description, "property description");
    if (definition.enum !== undefined) {
      if (!Array.isArray(definition.enum) || definition.enum.length < 1 || definition.enum.length > 32 ||
          definition.enum.some(item => !["string", "number", "boolean"].includes(typeof item))) fail("property enum must contain 1–32 scalar values.");
    }
  }
  const required = schema.required ?? [];
  if (!Array.isArray(required) || required.length > names.length ||
      required.some(name => typeof name !== "string" || !names.includes(name)) ||
      new Set(required).size !== required.length) fail("required must contain unique declared property names.");
  for (const key of Object.keys(schema)) {
    if (!["type", "properties", "required", "additionalProperties"].includes(key)) fail("unsupported inputSchema keyword: " + key);
  }
  return Object.freeze({
    type: "object",
    properties: Object.freeze(Object.fromEntries(names.map(name => [name, Object.freeze({ ...properties[name] })]))),
    required: Object.freeze([...required]),
    additionalProperties: false
  });
}

/**
 * Validates a declarative host capability catalog. Catalog entries describe
 * affordances; they contain no executable code and confer no authorization.
 */
export function validateCapabilityCatalog(value) {
  ownDataObject(value, "catalog");
  if (value.version !== CATALOG_VERSION) fail("unsupported catalog version.");
  if (!Array.isArray(value.capabilities) || value.capabilities.length > MAX_CAPABILITIES) {
    fail("capabilities must be an array of at most " + MAX_CAPABILITIES + " entries.");
  }
  const ids = new Set();
  const capabilities = value.capabilities.map((entry, index) => {
    ownDataObject(entry, "capability " + index);
    const id = text(entry.id, "capability id", 96);
    if (!ID_PATTERN.test(id) || ids.has(id)) fail("capability ids must be unique stable identifiers.");
    ids.add(id);
    const shell = text(entry.shell, "capability shell", 64);
    const title = text(entry.title, "capability title", 120);
    const description = text(entry.description, "capability description");
    if (!RISK_LEVELS.has(entry.risk)) fail("capability risk must be read-only, reversible, consequential, or external.");
    if (typeof entry.approvalRequired !== "boolean") fail("approvalRequired must be boolean.");
    if (!Array.isArray(entry.examples) || entry.examples.length > MAX_EXAMPLES) fail("examples must be an array of at most " + MAX_EXAMPLES + " phrases.");
    const examples = entry.examples.map((example, i) => text(example, "example " + i, 160));
    const inputSchema = validateInputSchema(entry.inputSchema);
    for (const key of Object.keys(entry)) {
      if (!["id", "shell", "title", "description", "risk", "approvalRequired", "examples", "inputSchema", "presentation"].includes(key)) {
        fail("unsupported capability field: " + key);
      }
    }
    let presentation = null;
    if (entry.presentation !== undefined) {
      ownDataObject(entry.presentation, "presentation");
      presentation = Object.freeze({
        surface: text(entry.presentation.surface, "presentation surface", 64),
        icon: entry.presentation.icon === undefined ? null : text(entry.presentation.icon, "presentation icon", 48)
      });
      for (const key of Object.keys(entry.presentation)) if (!["surface", "icon"].includes(key)) fail("unsupported presentation field: " + key);
    }
    return Object.freeze({ id, shell, title, description, risk: entry.risk,
      approvalRequired: entry.approvalRequired, examples: Object.freeze(examples), inputSchema, presentation });
  });
  for (const key of Object.keys(value)) if (!["version", "capabilities"].includes(key)) fail("unsupported catalog field: " + key);
  return Object.freeze({ version: CATALOG_VERSION, capabilities: Object.freeze(capabilities) });
}

/** Returns only entries declared for the active shell; availability is not permission. */
export function discoverCapabilities(catalog, shell) {
  const validated = validateCapabilityCatalog(catalog);
  const activeShell = text(shell, "active shell", 64);
  return Object.freeze(validated.capabilities.filter(item => item.shell === activeShell));
}

export function findCapability(catalog, shell, capabilityId) {
  const id = text(capabilityId, "capability id", 96);
  return discoverCapabilities(catalog, shell).find(item => item.id === id) ?? null;
}

export function describeCapabilities(catalog, shell) {
  return discoverCapabilities(catalog, shell).map(item => Object.freeze({
    id: item.id,
    title: item.title,
    description: item.description,
    examples: item.examples,
    risk: item.risk,
    approvalRequired: item.approvalRequired,
    presentation: item.presentation
  }));
}

export const CAPABILITY_CATALOG_VERSION = CATALOG_VERSION;
