export interface DiagnosticResponse {
  conceptId: string;
  correct: boolean;
  difficultyTheta: number;
}

const THETA_CLAMP = 4.0;
const POST_DIAGNOSTIC_SPEED_RD = 250;
const NEWTON_ITERATIONS = 20;
const NEWTON_EPSILON = 1e-6;

/**
 * IRT sigmoid: probability of correct given ability and difficulty.
 * P(correct | theta, b) = 1 / (1 + exp(-(theta - b)))
 */
function irtProbability(theta: number, difficultyTheta: number): number {
  return 1 / (1 + Math.exp(-(theta - difficultyTheta)));
}

/**
 * MLE ability estimation via Newton-Raphson on diagnostic responses.
 * Maximizes log-likelihood of observed responses under 1PL IRT model.
 *
 * Returns clamped theta in [-4, 4].
 */
export function estimateAbilityTheta(responses: DiagnosticResponse[]): number {
  if (responses.length === 0) return 0;

  let theta = 0;

  for (let iter = 0; iter < NEWTON_ITERATIONS; iter++) {
    let gradient = 0;
    let hessian = 0;

    for (const r of responses) {
      const p = irtProbability(theta, r.difficultyTheta);
      const residual = (r.correct ? 1 : 0) - p;
      gradient += residual;
      hessian -= p * (1 - p);
    }

    if (Math.abs(hessian) < NEWTON_EPSILON) break;

    const step = gradient / hessian;
    theta -= step;

    if (Math.abs(step) < NEWTON_EPSILON) break;
  }

  return Math.max(-THETA_CLAMP, Math.min(THETA_CLAMP, theta));
}

/**
 * Per-concept speed initialization: speed = exp(abilityTheta - difficultyTheta)
 */
export function computeConceptSpeed(
  abilityTheta: number,
  difficultyTheta: number,
): number {
  return Math.exp(abilityTheta - difficultyTheta);
}

/**
 * Bootstrap speed parameters from diagnostic results.
 * 1. Estimate global ability theta via MLE
 * 2. Compute per-concept speed from ability vs difficulty
 * 3. Reduce speedRD from 350 to 250
 */
export function bootstrapSpeedParameters(
  responses: DiagnosticResponse[],
  concepts: Array<{ id: string; difficultyTheta: number }>,
): {
  abilityTheta: number;
  speedRD: number;
  conceptSpeeds: Map<string, number>;
} {
  const abilityTheta = estimateAbilityTheta(responses);

  const conceptSpeeds = new Map<string, number>();
  for (const concept of concepts) {
    conceptSpeeds.set(
      concept.id,
      computeConceptSpeed(abilityTheta, concept.difficultyTheta),
    );
  }

  return {
    abilityTheta,
    speedRD: POST_DIAGNOSTIC_SPEED_RD,
    conceptSpeeds,
  };
}
