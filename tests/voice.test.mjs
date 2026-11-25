import test from "node:test";
import assert from "node:assert/strict";
import {
  createSpeechRecognitionAdapter,
  createSpeechSynthesisAdapter,
  resolvePlaygroundVoiceIntent,
  VoiceAdapterError
} from "../src/voice.js";

function fakeRecognition() {
  return {
    started: false,
    aborted: false,
    start() { this.started = true; },
    abort() { this.aborted = true; this.onend?.(); }
  };
}

test("speech synthesis reports completion and exposes available voices", async () => {
  const spoken = [];
  const adapter = createSpeechSynthesisAdapter({
    synthesis: {
      speak(utterance) { spoken.push(utterance); queueMicrotask(() => utterance.onend()); },
      cancel() {},
      getVoices: () => [{ name: "Workshop voice" }]
    },
    createUtterance: text => ({ text })
  });
  assert.equal(adapter.supported, true);
  assert.equal(adapter.voices()[0].name, "Workshop voice");
  const result = await adapter.speak("Hello, I am Hermit.");
  assert.equal(result.status, "completed");
  assert.equal(spoken[0].text, "Hello, I am Hermit.");
  assert.equal(spoken[0].rate, 1);
  assert.equal(spoken[0].pitch, 1);
});

test("speech synthesis rejects unsupported hosts and invalid bounds", async () => {
  const unsupported = createSpeechSynthesisAdapter();
  await assert.rejects(unsupported.speak("Hello"), error =>
    error instanceof VoiceAdapterError && error.code === "UNSUPPORTED");
  const adapter = createSpeechSynthesisAdapter({
    synthesis: { speak() {}, cancel() {} },
    createUtterance: text => ({ text })
  });
  await assert.rejects(adapter.speak("Hello", { rate: 3 }), error => error.code === "INVALID_OPTION");
  await assert.rejects(adapter.speak(""), error => error.code === "INVALID_TEXT");
});

test("speech synthesis cancellation settles the active request", async () => {
  let cancelled = 0;
  const adapter = createSpeechSynthesisAdapter({
    synthesis: { speak() {}, cancel() { cancelled += 1; } },
    createUtterance: text => ({ text })
  });
  const pending = adapter.speak("A long explanation.");
  assert.equal(adapter.cancel(), true);
  await assert.rejects(pending, error => error.code === "CANCELLED");
  assert.equal(cancelled, 1);
});

test("speech recognition streams interim text and resolves final text", async () => {
  const recognition = fakeRecognition();
  const interim = [];
  const adapter = createSpeechRecognitionAdapter({ recognitionFactory: () => recognition });
  const pending = adapter.listen({ onInterim: update => interim.push(update) });
  recognition.onresult({
    results: [
      Object.assign([{ transcript: "inspect " }], { isFinal: false }),
      Object.assign([{ transcript: "the glass vessel" }], { isFinal: true })
    ]
  });
  recognition.onend();
  const result = await pending;
  assert.equal(result.transcript, "the glass vessel");
  assert.equal(interim[0].transcript, "inspect the glass vessel");
  assert.equal(recognition.lang, "en-US");
  assert.equal(recognition.interimResults, true);
});

test("speech recognition reports unsupported, permission, empty and cancelled sessions", async () => {
  const unsupported = createSpeechRecognitionAdapter();
  await assert.rejects(unsupported.listen(), error => error.code === "UNSUPPORTED");

  const denied = fakeRecognition();
  const deniedAdapter = createSpeechRecognitionAdapter({ recognitionFactory: () => denied });
  const deniedPending = deniedAdapter.listen();
  denied.onerror({ error: "not-allowed" });
  await assert.rejects(deniedPending, error => error.code === "PERMISSION_DENIED");

  const empty = fakeRecognition();
  const emptyAdapter = createSpeechRecognitionAdapter({ recognitionFactory: () => empty });
  const emptyPending = emptyAdapter.listen();
  empty.onend();
  await assert.rejects(emptyPending, error => error.code === "NO_SPEECH");

  const cancelled = fakeRecognition();
  const cancelledAdapter = createSpeechRecognitionAdapter({ recognitionFactory: () => cancelled });
  const cancelledPending = cancelledAdapter.listen();
  assert.equal(cancelledAdapter.cancel(), true);
  await assert.rejects(cancelledPending, error => error.code === "CANCELLED");
});

test("voice intent grammar suggests inspection and requires host approval for movement", () => {
  const objects = [
    { id: "glass", name: "Glass vessel" },
    { id: "compass", name: "Brass compass" }
  ];
  const inspect = resolvePlaygroundVoiceIntent("Inspect the glass vessel!", objects);
  assert.equal(inspect.status, "ready");
  assert.equal(inspect.capabilityId, "inspect-object");
  assert.equal(inspect.objectId, "glass");

  const move = resolvePlaygroundVoiceIntent("Move the Brass compass to the workbench.", objects);
  assert.equal(move.status, "approval-required");
  assert.equal(move.capabilityId, "move-object");
  assert.equal(move.objectId, "compass");
  assert.match(move.message, /approve/);
});

test("voice intent grammar fails closed for unknown or unsupported requests", () => {
  const objects = [{ id: "glass", name: "Glass vessel" }];
  assert.equal(resolvePlaygroundVoiceIntent("delete the glass vessel", objects).status, "unsupported");
  assert.equal(resolvePlaygroundVoiceIntent("inspect the moon", objects).status, "not-found");
  assert.throws(() => resolvePlaygroundVoiceIntent("", objects), error => error.code === "INVALID_TEXT");
});
