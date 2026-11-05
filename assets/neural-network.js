/**
 * Hermit's first teaching network.
 *
 * A fixed 2-input / 2-output network. This module is deliberately small,
 * deterministic, dependency-free, and usable by both the page and Node tests.
 * It demonstrates inference only; it does not train or update weights.
 */

export const MODEL = Object.freeze({
  inputs: Object.freeze(["x₁", "x₂"]),
  outputs: Object.freeze(["y₁", "y₂"]),
  // weights[outputIndex][inputIndex]
  weights: Object.freeze([
    Object.freeze([0.5, -0.4]),
    Object.freeze([-0.3, 0.8])
  ]),
  biases: Object.freeze([0.1, -0.2]),
  activation: "sigmoid"
});

export function sigmoid(value) {
  if (!Number.isFinite(value)) {
    throw new TypeError("Activation input must be a finite number.");
  }
  return 1 / (1 + Math.exp(-value));
}

export function forwardPass(inputValues) {
  if (!Array.isArray(inputValues) || inputValues.length !== 2) {
    throw new TypeError("The teaching network requires exactly two inputs.");
  }
  if (!inputValues.every(Number.isFinite)) {
    throw new TypeError("Both input values must be finite numbers.");
  }

  const contributions = MODEL.weights.map((row) =>
    row.map((weight, inputIndex) => weight * inputValues[inputIndex])
  );
  const weightedSums = contributions.map((row) =>
    row.reduce((sum, contribution) => sum + contribution, 0)
  );
  const biasedSums = weightedSums.map(
    (sum, outputIndex) => sum + MODEL.biases[outputIndex]
  );
  const outputs = biasedSums.map(sigmoid);

  return Object.freeze({
    inputs: Object.freeze([...inputValues]),
    contributions: Object.freeze(contributions.map((row) => Object.freeze(row))),
    weightedSums: Object.freeze(weightedSums),
    biases: MODEL.biases,
    biasedSums: Object.freeze(biasedSums),
    outputs: Object.freeze(outputs)
  });
}
