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

function setVoiceStatus(message) {
  $("voice-status").textContent = message;
}

async function speak(message) {
  if (!speechOutput.supported) {
    setVoiceStatus("Speech output is not available in this browser. The text interface remains available.");
    return;
  }
  try {
    const voice = speechOutput.voices().find(candidate => candidate.lang?.toLowerCase().startsWith("en"));
    await speechOutput.speak(message, { lang: "en-US", voice });
  } catch (error) {
    if (error.code !== "CANCELLED") setVoiceStatus("Speech output: " + error.message);
  }
}

function chooseObject(objectId) {
  const card = [...document.querySelectorAll(".object-card")]
    .find(candidate => candidate.dataset.objectId === objectId);
  card?.click();
}

async function submitIntent(value) {
  if (window.hermitWorldReady) await window.hermitWorldReady;
  const objects = window.hermitWorldSnapshot?.objects ?? [];
  let intent;
  try {
    intent = resolvePlaygroundVoiceIntent(value, objects);
  } catch (error) {
    setVoiceStatus(error.message);
    return;
  }

  setVoiceStatus(intent.message);
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
    await speak(intent.message);
    return;
  }

  if (intent.status === "ready") {
    await speak(intent.message);
    $("inspect-button").click();
    return;
  }
  if (intent.status === "approval-required") {
    await speak(intent.message);
    $("approval-granted").focus();
    return;
  }
  await speak(intent.message);
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
  void speak("Hello. I am Hermit. Tell me what you would like to do, and I will bring the right Workshop interaction forward.");
});

$("voice-stop").addEventListener("click", () => {
  speechOutput.cancel();
  setVoiceStatus("Hermit's speech was stopped.");
});

$("voice-listen").addEventListener("click", async () => {
  $("voice-listen").disabled = true;
  $("voice-stop-listening").disabled = false;
  $("voice-interim").textContent = "Listening…";
  setVoiceStatus("Listening. Speak a request when you are ready.");
  try {
    const result = await speechInput.listen({
      lang: "en-US",
      interimResults: true,
      onInterim: update => {
        $("voice-interim").textContent = update.transcript || "Listening…";
      }
    });
    $("voice-request").value = result.transcript;
    $("voice-interim").textContent = "Recognized: " + result.transcript;
    await submitIntent(result.transcript);
  } catch (error) {
    if (error.code !== "CANCELLED") setVoiceStatus(error.message);
    $("voice-interim").textContent = error.code === "NO_SPEECH" ? "No speech detected." : "";
  } finally {
    $("voice-listen").disabled = !speechInput.supported;
    $("voice-stop-listening").disabled = !speechInput.supported;
  }
});

$("voice-stop-listening").addEventListener("click", () => {
  speechInput.cancel();
  $("voice-interim").textContent = "Listening stopped.";
  setVoiceStatus("Speech recognition stopped.");
});

$("voice-submit").addEventListener("click", () => {
  void submitIntent($("voice-request").value);
});
$("voice-request").addEventListener("keydown", event => {
  if (event.key === "Enter") void submitIntent($("voice-request").value);
});
