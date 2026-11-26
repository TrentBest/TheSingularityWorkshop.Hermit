import { createSceneObservationValidator } from "../src/hermit-scene-observation.js";

const validateObservation = createSceneObservationValidator(["workbench", "lamp", "book"]);

window.addEventListener("hermit:host-observation", event => {
  const observation = validateObservation(event.detail);
  if (!observation) {
    window.dispatchEvent(new CustomEvent("hermit:host-observation-rejected", {
      detail: Object.freeze({ reason: "invalid-or-stale-observation" })
    }));
    return;
  }
  window.dispatchEvent(new CustomEvent("hermit:host-observation-accepted", {
    detail: observation
  }));
});
