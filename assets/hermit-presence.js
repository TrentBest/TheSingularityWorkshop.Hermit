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


// Gentle gaze: the character acknowledges the visitor without tracking them
// as a surveillance feature. Only pointer position inside the encounter panel
// affects the pupils; keyboard focus gets a small, predictable glance.
const pupils = stage?.querySelector(".hermit-pupils");
const resetGaze = () => {
  if (!pupils) return;
  pupils.style.setProperty("--gaze-x", "0px");
  pupils.style.setProperty("--gaze-y", "0px");
};
stage?.addEventListener("pointermove", event => {
  if (!pupils || (event.pointerType !== "mouse" && event.pointerType !== "pen")) return;
  const bounds = stage.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
  const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
  pupils.style.setProperty("--gaze-x", `${Math.max(-6, Math.min(6, x * 6)).toFixed(1)}px`);
  pupils.style.setProperty("--gaze-y", `${Math.max(-4, Math.min(4, y * 4)).toFixed(1)}px`);
});
stage?.addEventListener("pointerleave", resetGaze);
stage?.addEventListener("focusin", () => {
  if (!pupils) return;
  pupils.style.setProperty("--gaze-x", "0px");
  pupils.style.setProperty("--gaze-y", "3px");
});
stage?.addEventListener("focusout", resetGaze);
