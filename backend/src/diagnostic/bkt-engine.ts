export const BKT_DEFAULTS = {
  pL0: 0.5,
  pSlip: 0.1,
  pGuessMC: 0.2,
  pGuessFillBlank: 0.05,
} as const;

/**
 * Bayesian update of mastery probability after a correct response.
 * P(L|correct) = P(L)*(1-P(S)) / [P(L)*(1-P(S)) + (1-P(L))*P(G)]
 */
export function updateMasteryAfterCorrect(
  pL: number,
  pGuess: number,
  pSlip: number = BKT_DEFAULTS.pSlip,
): number {
  const numerator = pL * (1 - pSlip);
  const denominator = numerator + (1 - pL) * pGuess;
  return numerator / denominator;
}

/**
 * Bayesian update of mastery probability after an incorrect response.
 * P(L|incorrect) = P(L)*P(S) / [P(L)*P(S) + (1-P(L))*(1-P(G))]
 *
 * Uses MC guess rate for the (1-P(G)) term since incorrect responses
 * don't depend on question type as strongly.
 */
export function updateMasteryAfterIncorrect(
  pL: number,
  pSlip: number = BKT_DEFAULTS.pSlip,
  pGuess: number = BKT_DEFAULTS.pGuessMC,
): number {
  const numerator = pL * pSlip;
  const denominator = numerator + (1 - pL) * (1 - pGuess);
  return numerator / denominator;
}

/**
 * Apply time-based discounting to a correct answer update.
 * If the student took more than 2x the expected time, discount
 * the update by blending between prior mastery and the full update.
 *
 * Returns the discounted mastery value.
 */
export function applyTimeDiscount(
  correctUpdate: number,
  priorMastery: number,
  timeRatio: number,
): number {
  if (timeRatio <= 2.0) return correctUpdate;

  const discount = Math.max(0.3, 1.0 - (timeRatio - 2.0) * 0.2);
  return priorMastery + discount * (correctUpdate - priorMastery);
}

/**
 * Classify a concept's diagnostic state based on final P(L).
 */
export function classifyDiagnosticState(
  pL: number,
): 'mastered' | 'conditionally_mastered' | 'partially_known' | 'unknown' {
  if (pL >= 0.8) return 'mastered';
  if (pL >= 0.5) return 'conditionally_mastered';
  if (pL >= 0.2) return 'partially_known';
  return 'unknown';
}
