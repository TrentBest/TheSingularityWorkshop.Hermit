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
  if (Object.getOwnPropertySymbols(value).length) fail(label + " must not contain symbol keys.");
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== "string") fail(label + " must not contain symbol keys.");
    const descriptor = descriptors[key];
    if (key === "__proto__" || key === "prototype" || key === "constructor") fail(label + " contains a forbidden key.");
    if (!("value" in descriptor)) fail(label + " must not contain accessors.");
    if (!descriptor.enumerable) fail(label + " must not contain hidden properties.");
  }
  return value;
}

function safeArray(value, label, maximum) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > maximum) {
    fail(label + " must be a standard array of at most " + maximum + " entries.");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of Reflect.ownKeys(descriptors)) {
    if (key === "length") continue;
    if (typeof key !== "string" || !/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length || !("value" in descriptors[key])) {
      fail(label + " must not contain accessors, sparse slots, symbols, or extra properties.");
    }
  }
  for (let i = 0; i < value.length; i += 1) if (!Object.hasOwn(value, i)) fail(label + " must not be sparse.");
  return value;
}

function text(value, label, maximum = MAX_TEXT) {
  if (typeof value !== "string" || !value.trim() || value.length > maximum) fail(label + " must be a non-empty string of at most " + maximum + " characters.");
  return value.trim();
}

function validateInputSchema(schema) {
  if (schema === undefined || schema === null) return null;
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
    if (definition.type !== "string" && definition.maxLength !== undefined) fail("maxLength is supported only for string properties.");
    if (definition.type === "string" && definition.maxLength !== undefined &&
        (!Number.isInteger(definition.maxLength) || definition.maxLength < 1 || definition.maxLength > 4000)) {
      fail("string maxLength must be between 1 and 4000.");
    }
    if (!["number", "integer"].includes(definition.type) &&
        (definition.minimum !== undefined || definition.maximum !== undefined)) fail("numeric bounds are supported only for number and integer properties.");
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
      safeArray(definition.enum, "property enum", 32);
      if (definition.enum.length < 1 || definition.enum.some(item =>
          !["string", "boolean"].includes(typeof item) && !(typeof item === "number" && Number.isFinite(item)))) {
        fail("property enum must contain 1–32 finite scalar values.");
      }
      const matchesType = item => definition.type === "string" ? typeof item === "string" &&
        (definition.maxLength === undefined || item.length <= definition.maxLength) :
        definition.type === "boolean" ? typeof item === "boolean" :
        definition.type === "integer" ? Number.isInteger(item) :
        definition.type === "number" ? typeof item === "number" && Number.isFinite(item) : false;
      if (definition.enum.some(item => !matchesType(item))) fail("property enum values must match the declared property type.");
      if (new Set(definition.enum).size !== definition.enum.length) fail("property enum values must be unique.");
    }
  }
  const required = schema.required ?? [];
  if (required !== undefined) safeArray(required, "inputSchema.required", names.length);
  if (!Array.isArray(required) || required.length > names.length ||
      required.some(name => typeof name !== "string" || !names.includes(name)) ||
      new Set(required).size !== required.length) fail("required must contain unique declared property names.");
  for (const key of Object.keys(schema)) {
    if (!["type", "properties", "required", "additionalProperties"].includes(key)) fail("unsupported inputSchema keyword: " + key);
  }
  return Object.freeze({
    type: "object",
    properties: Object.freeze(Object.fromEntries(names.map(name => {
      const definition = { ...properties[name] };
      if (definition.enum !== undefined) definition.enum = Object.freeze([...definition.enum]);
      return [name, Object.freeze(definition)];
    }))),
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
  safeArray(value.capabilities, "capabilities", MAX_CAPABILITIES);
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
    if (["consequential", "external"].includes(entry.risk) && !entry.approvalRequired) {
      fail("consequential and external capabilities must declare approvalRequired=true.");
    }
    safeArray(entry.examples, "examples", MAX_EXAMPLES);
    if (!Array.isArray(entry.examples) || entry.examples.length > MAX_EXAMPLES) fail("examples must be an array of at most " + MAX_EXAMPLES + " phrases.");
    const examples = entry.examples.map((example, i) => text(example, "example " + i, 160));
    const inputSchema = validateInputSchema(entry.inputSchema);
    for (const key of Object.keys(entry)) {
      if (!["id", "shell", "title", "description", "risk", "approvalRequired", "examples", "inputSchema", "presentation"].includes(key)) {
        fail("unsupported capability field: " + key);
      }
    }
    let presentation = null;
    if (entry.presentation !== undefined && entry.presentation !== null) {
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

/**
 * Validates untrusted arguments against one advertised capability's bounded
 * scalar schema. Returns a detached, frozen data snapshot; never invokes code.
 */
export function validateCapabilityInput(catalog, shell, capabilityId, input = {}) {
  const capability = findCapability(catalog, shell, capabilityId);
  if (!capability) fail("capability is not advertised by the active shell.");
  ownDataObject(input, "capability input");
  const schema = capability.inputSchema;
  const keys = Object.keys(input);
  if (!schema && keys.length) fail("capability does not accept input properties.");
  if (schema) {
    for (const key of keys) {
      if (!Object.hasOwn(schema.properties, key)) fail("input contains an undeclared property: " + key);
    }
    for (const key of schema.required) {
      if (!Object.hasOwn(input, key)) fail("input is missing required property: " + key);
    }
  }
  const result = {};
  for (const key of keys) {
    const value = input[key];
    const definition = schema?.properties[key];
    if (!definition) fail("capability does not accept input properties.");
    const validType = definition.type === "string" ? typeof value === "string" :
      definition.type === "boolean" ? typeof value === "boolean" :
      definition.type === "integer" ? Number.isSafeInteger(value) :
      definition.type === "number" ? typeof value === "number" && Number.isFinite(value) : false;
    if (!validType) fail("input property has the wrong type: " + key);
    if (definition.type === "string" && definition.maxLength !== undefined && value.length > definition.maxLength) {
      fail("input property exceeds its maximum length: " + key);
    }
    if (typeof value === "number" &&
        ((definition.minimum !== undefined && value < definition.minimum) ||
         (definition.maximum !== undefined && value > definition.maximum))) {
      fail("input property is outside its numeric bounds: " + key);
    }
    if (definition.enum && !definition.enum.some(item => item === value)) {
      fail("input property is not an allowed enum value: " + key);
    }
    result[key] = value;
  }
  return Object.freeze(result);
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
  return Object.freeze(discoverCapabilities(catalog, shell).map(item => Object.freeze({
    id: item.id,
    title: item.title,
    description: item.description,
    examples: item.examples,
    risk: item.risk,
    approvalRequired: item.approvalRequired,
    presentation: item.presentation
  })));
}

export const CAPABILITY_CATALOG_VERSION = CATALOG_VERSION;
