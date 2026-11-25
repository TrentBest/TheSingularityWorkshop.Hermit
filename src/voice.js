export class VoiceAdapterError extends Error {
  constructor(code, message, cause) {
    super(message);
    this.name = "VoiceAdapterError";
    this.code = code;
    if (cause !== undefined) this.cause = cause;
  }
}

const error = (code, message, cause) => new VoiceAdapterError(code, message, cause);

function validateText(value, label = "Speech text") {
  if (typeof value !== "string" || !value.trim()) {
    throw error("INVALID_TEXT", label + " must be a non-empty string.");
  }
  if (value.length > 4000) throw error("TEXT_TOO_LONG", label + " must not exceed 4,000 characters.");
  return value.trim();
}

function boundedNumber(value, fallback, minimum, maximum, label) {
  const number = value === undefined ? fallback : value;
  if (!Number.isFinite(number) || number < minimum || number > maximum) {
    throw error("INVALID_OPTION", label + " must be between " + minimum + " and " + maximum + ".");
  }
  return number;
}

/** Host-neutral speech output. Browser globals are supplied by the host, never read at import time. */
export function createSpeechSynthesisAdapter({ synthesis, createUtterance } = {}) {
  const supported = Boolean(synthesis && typeof synthesis.speak === "function" &&
    typeof synthesis.cancel === "function" && typeof createUtterance === "function");
  let active = null;

  function cancel() {
    if (!active) return false;
    const current = active;
    active = null;
    current.cleanup();
    try { synthesis.cancel(); } catch { /* best-effort host cancellation */ }
    current.reject(error("CANCELLED", "Speech output was cancelled."));
    return true;
  }

  function speak(value, options = {}) {
    if (!supported) return Promise.reject(error("UNSUPPORTED", "Speech synthesis is not available in this host."));
    let text;
    let rate;
    let pitch;
    try {
      text = validateText(value);
      rate = boundedNumber(options.rate, 1, 0.5, 2, "Speech rate");
      pitch = boundedNumber(options.pitch, 1, 0.5, 2, "Speech pitch");
    } catch (cause) {
      return Promise.reject(cause);
    }
    if (options.signal?.aborted) {
      return Promise.reject(error("CANCELLED", "Speech output was cancelled before it started."));
    }

    cancel();
    return new Promise((resolve, reject) => {
      let utterance;
      try {
        utterance = createUtterance(text);
        utterance.lang = options.lang ?? "en-US";
        utterance.rate = rate;
        utterance.pitch = pitch;
        if (options.voice) utterance.voice = options.voice;
      } catch (cause) {
        reject(error("SPEECH_FAILED", "The host could not create a speech utterance.", cause));
        return;
      }

      let settled = false;
      const cleanup = () => {
        options.signal?.removeEventListener("abort", abort);
        utterance.onend = null;
        utterance.onerror = null;
      };
      const finish = (callback, result) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (active?.utterance === utterance) active = null;
        callback(result);
      };
      const abort = () => {
        if (active?.utterance !== utterance) return;
        active = null;
        try { synthesis.cancel(); } catch { /* best-effort host cancellation */ }
        finish(reject, error("CANCELLED", "Speech output was cancelled."));
      };

      active = { utterance, reject, cleanup };
      utterance.onend = () => finish(resolve, { status: "completed", text });
      utterance.onerror = event => finish(reject,
        error("SPEECH_FAILED", "The host speech engine could not complete the utterance.", event?.error));
      options.signal?.addEventListener("abort", abort, { once: true });
      try {
        synthesis.speak(utterance);
      } catch (cause) {
        finish(reject, error("SPEECH_FAILED", "The host speech engine rejected the utterance.", cause));
      }
    });
  }

  return Object.freeze({
    supported,
    voices: () => supported && typeof synthesis.getVoices === "function" ? [...synthesis.getVoices()] : [],
    speak,
    cancel
  });
}

/**
 * Streaming recognition contract. The host may supply Web Speech, a local
 * Whisper process, or another recognizer through recognitionFactory.
 */
export function createSpeechRecognitionAdapter({ recognitionFactory } = {}) {
  const supported = typeof recognitionFactory === "function";
  let active = null;

  function cancel() {
    if (!active) return false;
    const current = active;
    active = null;
    current.cleanup();
    try { current.recognition.abort?.(); } catch { /* best-effort host cancellation */ }
    current.reject(error("CANCELLED", "Speech recognition was cancelled."));
    return true;
  }

  function listen(options = {}) {
    if (!supported) return Promise.reject(error("UNSUPPORTED", "Speech recognition is not available in this host."));
    if (options.signal?.aborted) {
      return Promise.reject(error("CANCELLED", "Speech recognition was cancelled before it started."));
    }
    cancel();

    return new Promise((resolve, reject) => {
      let recognition;
      try {
        recognition = recognitionFactory();
        if (!recognition) throw new Error("The recognition provider returned no session.");
      } catch (cause) {
        reject(error("RECOGNITION_FAILED", "The host could not create a recognition session.", cause));
        return;
      }

      let settled = false;
      let latestTranscript = "";
      const cleanup = () => {
        options.signal?.removeEventListener("abort", abort);
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
      };
      const finish = (callback, result) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (active?.recognition === recognition) active = null;
        callback(result);
      };
      const abort = () => {
        if (active?.recognition !== recognition) return;
        active = null;
        try { recognition.abort?.(); } catch { /* best-effort host cancellation */ }
        finish(reject, error("CANCELLED", "Speech recognition was cancelled."));
      };

      recognition.lang = options.lang ?? "en-US";
      recognition.continuous = options.continuous ?? false;
      recognition.interimResults = options.interimResults ?? true;
      active = { recognition, reject, cleanup };

      recognition.onresult = event => {
        let finalTranscript = "";
        let interimTranscript = "";
        let combinedTranscript = "";
        for (let index = 0; index < (event.results?.length ?? 0); index += 1) {
          const result = event.results[index];
          const transcript = result?.[0]?.transcript ?? "";
          combinedTranscript += transcript;
          if (result?.isFinal) finalTranscript += transcript;
          else interimTranscript += transcript;
        }
        latestTranscript = finalTranscript.trim();
        try {
          options.onInterim?.({
            finalTranscript: latestTranscript,
            interimTranscript: interimTranscript.trim(),
            transcript: combinedTranscript.trim()
          });
        } catch { /* observers cannot break recognition */ }
      };
      recognition.onerror = event => finish(reject,
        error(event?.error === "not-allowed" ? "PERMISSION_DENIED" : "RECOGNITION_FAILED",
          event?.error === "not-allowed" ? "Microphone permission was denied." :
            "Speech recognition failed" + (event?.error ? ": " + event.error : ".")));
      recognition.onend = () => latestTranscript
        ? finish(resolve, { status: "completed", transcript: latestTranscript })
        : finish(reject, error("NO_SPEECH", "No speech was recognized."));

      options.signal?.addEventListener("abort", abort, { once: true });
      try {
        recognition.start();
      } catch (cause) {
        finish(reject, error("RECOGNITION_FAILED", "The host could not start speech recognition.", cause));
      }
    });
  }

  return Object.freeze({ supported, listen, cancel });
}

/** Describes the fixture's discoverable actions without exposing host authority. */
export function describePlaygroundCapabilities(objects = []) {
  const availableObjects = Array.isArray(objects) ? objects.filter(item =>
    item && typeof item.id === "string" && typeof item.name === "string") : [];
  return Object.freeze([
    Object.freeze({
      id: "inspect-object",
      title: "Inspect an object",
      description: "Ask Hermit to examine an object and report its observed location and description. This is read-only.",
      example: "Inspect the glass vessel",
      available: availableObjects.length > 0,
      approvalRequired: false
    }),
    Object.freeze({
      id: "move-object",
      title: "Move an object to the workbench",
      description: "Ask Hermit to propose moving an object. The host still requires your explicit approval before the world changes.",
      example: "Move the brass compass to the workbench",
      available: availableObjects.length > 0,
      approvalRequired: true
    })
  ]);
}

function isDiscoveryRequest(text) {
  return /^(?:help|what can you do|what can i do|how can i|how do i use (?:you|hermit|this workshop)|show (?:me )?(?:your )?(?:capabilities|help)|list (?:your )?(?:capabilities|actions))$/.test(text);
}

/** Small deterministic grammar for the Pages fixture; it never grants authority or executes a mutation. */
export function resolvePlaygroundVoiceIntent(value, objects = []) {
  const text = validateText(value, "Voice request")
    .toLocaleLowerCase("en-US")
    .replace(/[.,!?;:]/g, " ")
    .replace(/\\s+/g, " ")
    .trim();
  if (isDiscoveryRequest(text)) {
    const capabilities = describePlaygroundCapabilities(objects);
    return {
      status: "discovery",
      capabilities,
      message: capabilities.map(item => item.title + ": " + item.description + " Try: " + item.example + ".").join(" ")
    };
  }
  const move = text.match(/^move (?:the )?(.+?) to (?:the )?workbench$/);
  const inspect = text.match(/^(?:inspect|examine|look at) (?:the )?(.+)$/);
  const match = move ?? inspect;
  if (!match) {
    return { status: "unsupported", message: "Try “inspect the glass vessel” or “move the glass vessel to the workbench”." };
  }

  const requested = match[1].trim();
  const object = objects.find(item =>
    item.id.toLocaleLowerCase("en-US") === requested ||
    item.name.toLocaleLowerCase("en-US") === requested);
  if (!object) {
    return { status: "not-found", message: "I could not find “" + requested + "” in this Workshop scene." };
  }
  if (move) {
    return {
      status: "approval-required",
      capabilityId: "move-object",
      objectId: object.id,
      message: "I can move " + object.name + " to the workbench. Please approve that change in the host interface."
    };
  }
  return {
    status: "ready",
    capabilityId: "inspect-object",
    objectId: object.id,
    message: "I can inspect " + object.name + " now."
  };
}
