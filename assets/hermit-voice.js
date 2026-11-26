import {
  createSpeechRecognitionAdapter,
  createSpeechSynthesisAdapter,
  resolvePlaygroundVoiceIntent
} from "../src/voice.js";

const $ = id => document.getElementById(id);
const SpeechRecognitionHost = window.SpeechRecognition ?? window.webkitSpeechRecognition;
const speechOutput = createSpeechSynthesisAdapter({
  synthesis: window.speechSynthesis,
  createUtterance: typeof window.SpeechSynthesisUtterance === "function"
    ? text => new window.SpeechSynthesisUtterance(text)
    : undefined
});
const speechInput = createSpeechRecognitionAdapter({
  recognitionFactory: typeof SpeechRecognitionHost === "function"
    ? () => new SpeechRecognitionHost()
    : undefined
});

let activeTurn = 0;
let listening = false;

function setVoiceStatus(message) {
  $("voice-status").textContent = message;
}

function setPresence(state, message) { window.setHermitPresence?.(state, message); }

function setListeningControls() {
  $("voice-listen").disabled = !speechInput.supported || listening;
  $("voice-stop-listening").disabled = !speechInput.supported || !listening;
}

async function speak(message, turn = activeTurn) {
  if (!speechOutput.supported) {
    if (turn === activeTurn) setPresence("idle", message);
    setVoiceStatus("Speech output is not available in this browser. The text interface remains available.");
    return;
  }
  if (turn === activeTurn) setPresence("speaking", message);
  try {
    const voice = speechOutput.voices().find(candidate => candidate.lang?.toLowerCase().startsWith("en"));
    await speechOutput.speak(message, { lang: "en-US", voice });
    if (turn === activeTurn) setPresence("idle", "I am here. What shall we explore next?");
  } catch (error) {
    if (error.code !== "CANCELLED") {
      setVoiceStatus("Speech output: " + error.message + " The response remains available as text.");
      if (turn === activeTurn) setPresence("idle", message);
    }
  }
}

function chooseObject(objectId) {
  const card = [...document.querySelectorAll(".object-card")]
    .find(candidate => candidate.dataset.objectId === objectId);
  card?.click();
}

async function submitIntent(value) {
  const turn = ++activeTurn;
  if (speechOutput.supported) speechOutput.cancel();
  if (listening) {
    speechInput.cancel();
    listening = false;
    setListeningControls();
  }
  const request = value.trim();
  if (!request) {
    setPresence("concerned", "Tell me a little about what you want to do.");
    return;
  }
  if (window.hermitTaskActive) {
    const message = "I hear you. The current action is already with the host, and I can't safely interrupt it here. I'll report its verified outcome first. Please repeat your next request afterward.";
    setVoiceStatus(message);
    setPresence("working", message);
    return;
  }

  setPresence("thinking", "Let me understand what you are asking.");
  try {
    if (window.hermitWorldReady) await window.hermitWorldReady;
    if (turn !== activeTurn) return;
    const objects = window.hermitWorldSnapshot?.objects ?? [];
    const intent = resolvePlaygroundVoiceIntent(request, objects, window.hermitCapabilityCatalog);
    if (turn !== activeTurn) return;

    setVoiceStatus(intent.message);
    setPresence(intent.status === "ready" ? "working" : "speaking", intent.message);
    if (intent.objectId) chooseObject(intent.objectId);

    if (intent.status === "discovery") {
      const list = $("voice-capabilities");
      list.replaceChildren();
      for (const capability of intent.capabilities) {
        const item = document.createElement("li");
        const title = document.createElement("strong");
        const detail = document.createElement("span");
        title.textContent = capability.title + (capability.approvalRequired ? " · approval required" : " · read-only");
        detail.textContent = capability.description + " Example: “" + capability.example + "”.";
        item.append(title, document.createTextNode(" — "), detail);
        list.append(item);
      }
      await speak(intent.message, turn);
      return;
    }

    if (intent.status === "ready") {
      await speak(intent.message, turn);
      if (turn === activeTurn) $("inspect-button").click();
      return;
    }
    if (intent.status === "approval-required") {
      await speak(intent.message, turn);
      if (turn === activeTurn) $("approval-granted").focus();
      return;
    }
    await speak(intent.message, turn);
  } catch (error) {
    if (turn !== activeTurn) return;
    setVoiceStatus(error.message);
    setPresence("concerned", "I couldn't complete that request. Nothing further was attempted.");
  }
}

$("voice-speak").disabled = !speechOutput.supported;
$("voice-stop").disabled = !speechOutput.supported;
$("voice-listen").disabled = !speechInput.supported;
$("voice-stop-listening").disabled = !speechInput.supported;

if (!speechInput.supported) {
  setVoiceStatus("Speech recognition is not exposed by this browser. Type a request below, or use a host recognizer when one is connected.");
} else if (!speechOutput.supported) {
  setVoiceStatus("Speech recognition is available. Speech synthesis is not exposed by this browser.");
} else {
  setVoiceStatus("Voice is ready. Ask Hermit to inspect an object or move one to the workbench.");
}

$("voice-speak").addEventListener("click", () => {
  const turn = ++activeTurn;
  if (speechOutput.supported) speechOutput.cancel();
  void speak("Hello. I am Hermit. Tell me what you would like to do, and I will bring the right Workshop interaction forward.", turn);
});

$("voice-stop").addEventListener("click", () => {
  ++activeTurn;
  speechOutput.cancel();
  setPresence("idle", "All right. I'll pause here; the text response is still available.");
  setVoiceStatus("Hermit's speech was stopped.");
});

$("voice-listen").addEventListener("click", async () => {
  const turn = ++activeTurn;
  if (speechOutput.supported) speechOutput.cancel();
  listening = true;
  setPresence("listening", "I am listening. Take your time.");
  $("voice-listen").disabled = true;
  $("voice-stop-listening").disabled = false;
  $("voice-interim").textContent = "Listening…";
  setVoiceStatus("Listening. Speak a request when you are ready.");
  try {
    const result = await speechInput.listen({
      lang: "en-US",
      interimResults: true,
      onInterim: update => {
        if (turn === activeTurn) $("voice-interim").textContent = update.transcript || "Listening…";
      }
    });
    if (turn !== activeTurn) return;
    $("voice-request").value = result.transcript;
    $("voice-interim").textContent = "Recognized: " + result.transcript;
    listening = false;
    setListeningControls();
    await submitIntent(result.transcript);
  } catch (error) {
    if (turn !== activeTurn) return;
    listening = false;
    if (error.code !== "CANCELLED") {
      setVoiceStatus(error.message);
      setPresence("concerned", error.code === "NO_SPEECH"
        ? "I didn't catch that. We can try again, or you can type it."
        : "I couldn't access the microphone. You can still talk to me by typing.");
    } else {
      setPresence("idle", "No rush. I am here when you are ready.");
    }
    $("voice-interim").textContent = error.code === "NO_SPEECH" ? "No speech detected." : "";
  } finally {
    if (turn === activeTurn) {
      setListeningControls();
    }
  }
});

$("voice-stop-listening").addEventListener("click", () => {
  ++activeTurn;
  listening = false;
  speechInput.cancel();
  setPresence("idle", "No rush. I am here when you are ready.");
  $("voice-interim").textContent = "Listening stopped.";
  $("voice-status").textContent = "Speech recognition stopped.";
  $("voice-listen").disabled = !speechInput.supported;
  $("voice-stop-listening").disabled = !speechInput.supported;
});

$("voice-help-example").addEventListener("click", () => {
  $("voice-request").value = "What can you do?";
  void submitIntent($("voice-request").value);
});
$("voice-submit").addEventListener("click", () => {
  void submitIntent($("voice-request").value);
});
$("hermit-direct-send").addEventListener("click", () => {
  const request = $("hermit-direct-request").value.trim();
  $("voice-request").value = request;
  void submitIntent(request);
});
$("hermit-direct-request").addEventListener("keydown", event => {
  if (event.key === "Enter") $("hermit-direct-send").click();
});
$("voice-request").addEventListener("keydown", event => {
  if (event.key === "Enter") void submitIntent($("voice-request").value);
});
