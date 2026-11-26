/**
 * Music perception is supplied by a trusted host/audio-analysis adapter.
 * This policy consumes compact features; it does not capture microphone audio.
 */
export function evaluateMusicObservation(value, { threshold = 0.72 } = {}) {
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) throw new RangeError("Threshold must be between 0 and 1.");
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (value.schema !== "hermit.music-observation.v1" || value.source !== "host") return null;
  if (!Number.isSafeInteger(value.revision) || value.revision < 1) return null;
  if (typeof value.observedAt !== "string" || !Number.isFinite(Date.parse(value.observedAt))) return null;
  for (const key of ["energy", "groove", "confidence"]) {
    if (!Number.isFinite(value[key]) || value[key] < 0 || value[key] > 1) return null;
  }
  if (value.bpm !== null && value.bpm !== undefined && (!Number.isFinite(value.bpm) || value.bpm < 30 || value.bpm > 300)) return null;

  const score = value.energy * value.groove * value.confidence;
  const dance = score >= threshold;
  return Object.freeze({
    schema: "hermit.music-response.v1",
    sourceRevision: value.revision,
    score: Number(score.toFixed(4)),
    expression: dance ? "dance" : "attend",
    intensity: dance ? Math.min(1, Math.max(0.35, value.energy)) : 0.25,
    durationMs: dance ? 8000 : 1800,
    utterance: dance ? "DANCE PARTY!!!!!!!" : null
  });
}
