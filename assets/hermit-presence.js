const stage = document.getElementById("hermit-meet");
const message = document.getElementById("hermit-face-message");
const stateLabel = document.getElementById("hermit-state-label");
const labels = {
  idle: "Here with you · Ready",
  listening: "Listening · I'm all ears",
  thinking: "Thinking · Let me consider that",
  speaking: "Speaking · Here's what I found",
  working: "At work · Following the request",
  concerned: "Paused · Something needs attention"
};
const allowed = new Set(Object.keys(labels));
window.setHermitPresence = (state, text) => {
  if (!stage || !allowed.has(state)) return;
  stage.dataset.state = state;
  stateLabel.textContent = labels[state];
  if (typeof text === "string" && text.trim()) message.textContent = text;
};
