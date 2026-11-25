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
  const trustedHandlers = snapshotHandlers(handlers);

  return Object.freeze({
    async invoke(capabilityId, input = {}, context = undefined) {
      const capability = validatedCatalog.capabilities.find(item => item.shell === shell && item.id === capabilityId);
      if (!capability) return Object.freeze({ status: "unsupported", capabilityId });

      let validatedInput;
      try {
        validatedInput = validateCapabilityInput(validatedCatalog, shell, capabilityId, input);
      } catch {
        return Object.freeze({ status: "invalid-input", capabilityId });
      }

      const handler = trustedHandlers[capabilityId];
      if (typeof handler !== "function") {
        return Object.freeze({ status: "unavailable", capabilityId, reason: "host-handler-missing" });
      }

      const request = Object.freeze({ capability, input: validatedInput, context });
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
      if (approvalRequired) {
        if (typeof requestApproval !== "function") {
          return Object.freeze({ status: "approval-required", capabilityId, reason: "approval-provider-missing" });
        }
        let approved = false;
        try {
          approved = (await requestApproval(Object.freeze({
            capability,
            input: validatedInput,
            context,
            policy: decision
          }))) === true;
        } catch {
          return Object.freeze({ status: "approval-denied", capabilityId, reason: "approval-provider-error" });
        }
        if (!approved) return Object.freeze({ status: "approval-denied", capabilityId });
      }

      try {
        const result = await handler(Object.freeze({
          capability,
          input: validatedInput,
          context,
          policy: decision,
          approvalGranted: approvalRequired
        }));
        return Object.freeze({ status: "completed", capabilityId, result });
      } catch {
        return Object.freeze({ status: "failed", capabilityId, reason: "host-handler-failed" });
      }
    }
  });
}
