/**
 * Per-observation speed update using Elo/IRT/Glicko rule.
 * From adaptive-learning-architecture.md Section 6.
 * Pure functions — no external dependencies.
 */

export interface SpeedState {
  abilityTheta: number;
  speedRD: number;
  observationCount: number;
}

export interface Observation {
  correct: boolean;
  responseTimeMs: number;
}

export interface ConceptParams {
  difficultyTheta: number;
  timeIntensity: number; // expected log(response_time_seconds)
  timeIntensitySD: number; // SD of log(RT)
}

/**
 * Update speed parameters after a single practice observation.
 * Combines accuracy signal (Elo/Rasch) with response time signal (Van der Linden lognormal).
 */
export function updateSpeed(
  state: SpeedState,
  obs: Observation,
  concept: ConceptParams,
): SpeedState {
  const { abilityTheta, speedRD, observationCount } = state;
  const { difficultyTheta, timeIntensity, timeIntensitySD } = concept;

  // 1. K-factor: high uncertainty = bigger updates
  const K = Math.max(0.05, 1.0 / (1 + 0.5 * observationCount));

  // 2. Accuracy signal (standard Elo/Rasch)
  const expected = 1 / (1 + Math.exp(-(abilityTheta - difficultyTheta)));
  const actual = obs.correct ? 1 : 0;
  const accuracyResidual = actual - expected;

  // 3. Response time signal (Van der Linden lognormal model)
  const observedLogRT = Math.log(obs.responseTimeMs / 1000);
  const rtResidual = timeIntensity - observedLogRT; // positive = faster than expected
  const normalizedRT = Math.max(
    -2,
    Math.min(2, rtResidual / Math.max(timeIntensitySD, 0.5)),
  );

  // 4. Response time weight: grows from 0.1 to 0.3 as data accumulates
  const lambda = 0.1 + 0.2 * Math.min(1, observationCount / 20);

  // 5. Guessing detection: fast + incorrect = likely guessing, discount
  let rtWeight = lambda * normalizedRT;
  if (!obs.correct && normalizedRT > 0.5) {
    rtWeight *= 0.3; // fast + wrong = guessing
  }

  // 6. Combined update
  const newTheta = abilityTheta + K * (accuracyResidual + rtWeight);

  // 7. Uncertainty shrinks (Glicko formula)
  const q = Math.log(10) / 400;
  const gRD =
    1 / Math.sqrt(1 + (3 * q * q * speedRD * speedRD) / (Math.PI * Math.PI));
  const d2 = 1 / (q * q * gRD * gRD * expected * (1 - expected));
  const newRD = Math.sqrt(1 / (1 / (speedRD * speedRD) + 1 / d2));

  return {
    abilityTheta: newTheta,
    speedRD: newRD,
    observationCount: observationCount + 1,
  };
}

/**
 * Derive speed from ability and difficulty.
 * speed = exp(abilityTheta - difficultyTheta)
 */
export function deriveSpeed(
  abilityTheta: number,
  difficultyTheta: number,
): number {
  return Math.exp(abilityTheta - difficultyTheta);
}

/**
 * Cold-start blending: blend estimated speed with conservative prior.
 * For first ~15 observations, gradually trust the estimate more.
 */
export function blendSpeed(
  rawSpeed: number,
  observationCount: number,
): number {
  const confidence = Math.min(1.0, observationCount / 15);
  return 1.0 * (1 - confidence) + rawSpeed * confidence;
}
