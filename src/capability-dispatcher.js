import {
  validateCapabilityCatalog,
  validateCapabilityInput
} from "./capability-catalog.js";

function invalid(message) {
  const error = new TypeError("Invalid capability dispatcher: " + message);
  error.code = "INVALID_CAPABILITY_DISPATCHER";
  throw error;
}

function snapshotHandlers(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) {
    invalid("handlers must be a plain object.");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const handlers = Object.create(null);
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== "string" || key === "__proto__" || key === "constructor" || key === "prototype") {
      invalid("handlers contain an unsupported key.");
    }
    const descriptor = descriptors[key];
    if (!descriptor.enumerable || !("value" in descriptor) || typeof descriptor.value !== "function") {
      invalid("every handler must be an enumerable own function property.");
    }
    handlers[key] = descriptor.value;
  }
  return Object.freeze(handlers);
}

function policyDecision(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) {
    return null;
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of Reflect.ownKeys(descriptors)) {
    const descriptor = descriptors[key];
    if (typeof key !== "string" || !descriptor.enumerable || !("value" in descriptor)) return null;
  }
  if (typeof value.allowed !== "boolean") return null;
  if (value.approvalRequired !== undefined && typeof value.approvalRequired !== "boolean") return null;
  if (value.reason !== undefined && typeof value.reason !== "string") return null;
  return Object.freeze({
    allowed: value.allowed,
    approvalRequired: value.approvalRequired === true,
    reason: value.reason
  });
}

function snapshotHandlerResult(value, path = "$", ancestors = new WeakSet(), budget = { nodes: 0 }) {
  budget.nodes += 1;
  if (budget.nodes > 4096 || path.split(/[.\\[\\]]/).length > 32) {
    throw new TypeError("Host handler result exceeds structural limits.");
  }
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "object" || ancestors.has(value)) {
    throw new TypeError("Host handler result must contain acyclic JSON data.");
  }
  ancestors.add(value);
  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype || value.length > 4096) {
      throw new TypeError("Host handler result contains an unsupported array.");
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some(key => key !== "length" &&
        (typeof key !== "string" || !/^(0|[1-9]\\d*)$/.test(key) || Number(key) >= value.length))) {
      throw new TypeError("Host handler result arrays must not contain extra properties.");
    }
    const result = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
        throw new TypeError("Host handler result arrays must be dense data arrays.");
      }
      result.push(snapshotHandlerResult(descriptor.value, `${path}[${index}]`, ancestors, budget));
    }
    ancestors.delete(value);
    return Object.freeze(result);
  }
  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
    throw new TypeError("Host handler result objects must be plain data objects.");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some(key => typeof key !== "string")) {
    throw new TypeError("Host handler result must not contain symbol properties.");
  }
  const result = {};
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      throw new TypeError("Host handler result must contain enumerable data properties only.");
    }
    Object.defineProperty(result, key, {
      value: snapshotHandlerResult(descriptor.value, `${path}.${key}`, ancestors, budget),
      enumerable: true,
      writable: false,
      configurable: false
    });
  }
  ancestors.delete(value);
  return Object.freeze(result);
}

/**
 * Creates a host-owned capability dispatcher.
 *
 * Catalog metadata can add friction but cannot grant permission. Every call
 * goes through host authorization; approval is required when either the
 * catalog or host policy requires it. Only handlers injected by the trusted
 * host can execute. This module does not authenticate users or implement an
 * approval UI; those remain responsibilities of the host callbacks.
 */
export function createCapabilityDispatcher({
  catalog,
  shell,
  handlers,
  authorize,
  requestApproval
} = {}) {
  const validatedCatalog = validateCapabilityCatalog(catalog);
  if (typeof shell !== "string" || !shell.trim()) invalid("shell must be a non-empty string.");
  if (typeof authorize !== "function") invalid("a host authorize callback is required.");
  if (requestApproval !== undefined && typeof requestApproval !== "function") {
    invalid("requestApproval must be a host function when supplied.");
  }
  const activeShell = shell.trim();
  const trustedHandlers = snapshotHandlers(handlers);

  return Object.freeze({
    async invoke(capabilityId, input = {}) {
      const capability = validatedCatalog.capabilities.find(item => item.shell === activeShell && item.id === capabilityId);
      if (!capability) return Object.freeze({ status: "unsupported", capabilityId });

      let validatedInput;
      try {
        validatedInput = validateCapabilityInput(validatedCatalog, activeShell, capabilityId, input);
      } catch {
        return Object.freeze({ status: "invalid-input", capabilityId });
      }

      const handler = trustedHandlers[capabilityId];
      if (typeof handler !== "function") {
        return Object.freeze({ status: "unavailable", capabilityId, reason: "host-handler-missing" });
      }

      const request = Object.freeze({ capability, input: validatedInput });
      let decision;
      try {
        decision = policyDecision(await authorize(request));
      } catch {
        return Object.freeze({ status: "denied", capabilityId, reason: "host-policy-error" });
      }
      if (!decision) return Object.freeze({ status: "denied", capabilityId, reason: "invalid-host-policy-decision" });
      if (!decision.allowed) {
        return Object.freeze({ status: "denied", capabilityId, reason: decision.reason ?? "host-policy-denied" });
      }

      const approvalRequired = capability.approvalRequired || decision.approvalRequired;
      let approvalGranted = false;
      if (approvalRequired) {
        if (typeof requestApproval !== "function") {
          return Object.freeze({ status: "approval-required", capabilityId, reason: "approval-provider-missing" });
        }
        try {
          approvalGranted = (await requestApproval(Object.freeze({
            capability,
            input: validatedInput,
            policy: decision
          }))) === true;
        } catch {
          return Object.freeze({ status: "approval-denied", capabilityId, reason: "approval-provider-error" });
        }
        if (!approvalGranted) return Object.freeze({ status: "approval-denied", capabilityId });

        // Human approval may take time. Recheck host authority immediately
        // before dispatch so revocation or changed policy cannot be bypassed.
        try {
          decision = policyDecision(await authorize(request));
        } catch {
          return Object.freeze({ status: "denied", capabilityId, reason: "host-policy-error" });
        }
        if (!decision) return Object.freeze({ status: "denied", capabilityId, reason: "invalid-host-policy-decision" });
        if (!decision.allowed) {
          return Object.freeze({ status: "denied", capabilityId, reason: decision.reason ?? "host-policy-denied" });
        }
        if (!capability.approvalRequired && decision.approvalRequired && !approvalGranted) {
          return Object.freeze({ status: "approval-required", capabilityId, reason: "host-policy-changed" });
        }
      }

      try {
        const handlerResult = await handler(Object.freeze({
          capability,
          input: validatedInput,
          policy: decision,
          approvalGranted
        }));
        const result = snapshotHandlerResult(handlerResult);
        if (new TextEncoder().encode(JSON.stringify(result)).length > 16_384) {
          throw new TypeError("Host handler result exceeds the serialized size limit.");
        }
        return Object.freeze({ status: "completed", capabilityId, result });
      } catch {
        return Object.freeze({ status: "failed", capabilityId, reason: "host-handler-failed" });
      }
    }
  });
}
