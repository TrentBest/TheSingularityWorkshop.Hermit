import test from "node:test";
import assert from "node:assert/strict";
import { forwardPass, sigmoid } from "../assets/neural-network.js";

test("computes both weighted sums, biases, and sigmoid outputs", () => {
  const result = forwardPass([0.6, 0.2]);
  assert.deepEqual(result.contributions, [[0.3, -0.08000000000000002], [-0.18, 0.16000000000000003]]);
  assert.ok(Math.abs(result.weightedSums[0] - 0.22) < 1e-12);
  assert.ok(Math.abs(result.weightedSums[1] + 0.01999999999999999) < 1e-12);
  assert.ok(Math.abs(result.biasedSums[0] - 0.32) < 1e-12);
  assert.ok(Math.abs(result.biasedSums[1] + 0.22) < 1e-12);
  assert.ok(Math.abs(result.outputs[0] - sigmoid(0.32)) < 1e-12);
  assert.ok(Math.abs(result.outputs[1] - sigmoid(-0.22)) < 1e-12);
});

test("zero inputs leave each neuron with its bias before activation", () => {
  const result = forwardPass([0, 0]);
  assert.deepEqual(result.weightedSums, [0, 0]);
  assert.deepEqual(result.biasedSums, [0.1, -0.2]);
});

test("rejects wrong input shape and non-finite values", () => {
  assert.throws(() => forwardPass([1]), /exactly two inputs/);
  assert.throws(() => forwardPass([1, 2, 3]), /exactly two inputs/);
  assert.throws(() => forwardPass([1, Number.NaN]), /finite numbers/);
});

test("sigmoid rejects non-finite values", () => {
  assert.throws(() => sigmoid(Infinity), /finite number/);
});
