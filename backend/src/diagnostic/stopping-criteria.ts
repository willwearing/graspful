const HARD_CAP = 60;
const DIMINISHING_RETURNS_MIN_QUESTIONS = 20;
const DIMINISHING_RETURNS_MAX_UNCERTAIN = 5;
const UNCERTAIN_LOW = 0.2;
const UNCERTAIN_HIGH = 0.8;

/**
 * Count concepts in the uncertain range: 0.2 < P(L) < 0.8
 */
export function countUncertain(masteries: Map<string, number>): number {
  let count = 0;
  for (const pL of masteries.values()) {
    if (pL > UNCERTAIN_LOW && pL < UNCERTAIN_HIGH) {
      count++;
    }
  }
  return count;
}

/**
 * Determine whether the diagnostic should stop.
 *
 * Stopping conditions (any one is sufficient):
 * 1. Hard cap: questionCount >= 60
 * 2. Full coverage: no uncertain concepts remaining
 * 3. Diminishing returns: >= 20 questions AND < 5 uncertain concepts
 */
export function shouldStopDiagnostic(
  questionCount: number,
  masteries: Map<string, number>,
): boolean {
  // Hard cap
  if (questionCount >= HARD_CAP) return true;

  const uncertainCount = countUncertain(masteries);

  // Full coverage
  if (uncertainCount === 0) return true;

  // Diminishing returns
  if (questionCount >= DIMINISHING_RETURNS_MIN_QUESTIONS && uncertainCount < DIMINISHING_RETURNS_MAX_UNCERTAIN) {
    return true;
  }

  return false;
}
