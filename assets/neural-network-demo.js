import { MODEL, forwardPass } from "./neural-network.js";

const $ = (id) => document.getElementById(id);
const input1 = $("input-one");
const input2 = $("input-two");
const svg = $("network-visual");
const status = $("step-status");
const stepButton = $("step-button");
const playButton = $("play-button");
const resetButton = $("reset-button");
const stepNames = [
  "Inputs",
  "Weighted connections",
  "Weighted sums",
  "Bias",
  "Activation",
  "Outputs"
];
let step = 0;
let timer = null;
let result = forwardPass([Number(input1.value), Number(input2.value)]);

const fmt = (n) => Number(n).toFixed(3);
const setText = (id, value) => { $(id).textContent = value; };

function readInputs() {
  result = forwardPass([Number(input1.value), Number(input2.value)]);
  render();
}

function render() {
  setText("input-one-value", fmt(result.inputs[0]));
  setText("input-two-value", fmt(result.inputs[1]));
  setText("input-one-value-copy", fmt(result.inputs[0]));
  setText("input-two-value-copy", fmt(result.inputs[1]));
  setText("contribution-11", fmt(result.contributions[0][0]));
  setText("contribution-21", fmt(result.contributions[0][1]));
  setText("contribution-12", fmt(result.contributions[1][0]));
  setText("contribution-22", fmt(result.contributions[1][1]));
  setText("sum-one", fmt(result.weightedSums[0]));
  setText("sum-two", fmt(result.weightedSums[1]));
  setText("bias-one", fmt(result.biases[0]));
  setText("bias-two", fmt(result.biases[1]));
  setText("biased-one", fmt(result.biasedSums[0]));
  setText("biased-two", fmt(result.biasedSums[1]));
  setText("output-one", fmt(result.outputs[0]));
  setText("output-two", fmt(result.outputs[1]));
  setText("output-one-readable", fmt(result.outputs[0]));
  setText("output-two-readable", fmt(result.outputs[1]));

  $("edge-11").classList.toggle("active", step >= 1);
  $("edge-21").classList.toggle("active", step >= 1);
  $("edge-12").classList.toggle("active", step >= 1);
  $("edge-22").classList.toggle("active", step >= 1);
  $("node-input-one").classList.toggle("active", step >= 0);
  $("node-input-two").classList.toggle("active", step >= 0);
  $("node-output-one").classList.toggle("active", step >= 5);
  $("node-output-two").classList.toggle("active", step >= 5);

  document.querySelectorAll("[data-stage]").forEach((element) => {
    const stage = Number(element.dataset.stage);
    element.classList.toggle("stage-active", stage === step);
    element.classList.toggle("stage-done", stage < step);
  });

  status.textContent = `Step ${step + 1} of ${stepNames.length}: ${stepNames[step]}.`;
  stepButton.disabled = step === stepNames.length - 1;
  playButton.textContent = timer ? "Pause" : "Play";
  $("equation-one").textContent =
    `y₁ = σ((${fmt(result.inputs[0])} × 0.5) + (${fmt(result.inputs[1])} × −0.4) + 0.1) = ${fmt(result.outputs[0])}`;
  $("equation-two").textContent =
    `y₂ = σ((${fmt(result.inputs[0])} × −0.3) + (${fmt(result.inputs[1])} × 0.8) − 0.2) = ${fmt(result.outputs[1])}`;
}

function stop() {
  if (timer) window.clearInterval(timer);
  timer = null;
  render();
}

function advance() {
  if (step < stepNames.length - 1) {
    step += 1;
    render();
  } else {
    stop();
  }
}

stepButton.addEventListener("click", advance);
playButton.addEventListener("click", () => {
  if (timer) {
    stop();
    return;
  }
  if (step === stepNames.length - 1) step = 0;
  advance();
  timer = window.setInterval(() => {
    if (step === stepNames.length - 1) stop();
    else advance();
  }, 1100);
  render();
});
resetButton.addEventListener("click", () => {
  stop();
  step = 0;
  render();
});
input1.addEventListener("input", () => { stop(); step = 0; readInputs(); });
input2.addEventListener("input", () => { stop(); step = 0; readInputs(); });

render();
