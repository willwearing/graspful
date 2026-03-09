import { SimpleEdge } from '@/knowledge-graph/graph-query.service';
import {
  updateMasteryAfterCorrect,
  updateMasteryAfterIncorrect,
  BKT_DEFAULTS,
} from './bkt-engine';
import {
  propagateCorrectUpward,
  propagateIncorrectDownward,
} from './evidence-propagation';

/**
 * Binary entropy: H(p) = -p*log2(p) - (1-p)*log2(1-p)
 * Returns 0 for p=0 or p=1 (certain states).
 */
export function binaryEntropy(p: number): number {
  if (p <= 0 || p >= 1) return 0;
  return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
}

/**
 * Sum of binary entropy across all concepts.
 */
export function totalEntropy(masteries: Map<string, number>): number {
  let sum = 0;
  for (const pL of masteries.values()) {
    sum += binaryEntropy(pL);
  }
  return sum;
}

/**
 * Simulate testing a concept and compute the expected entropy reduction.
 *
 * Expected gain = H_current - [P(correct)*H_after_correct + P(incorrect)*H_after_incorrect]
 *
 * Where P(correct) = P(L)*(1-P(S)) + (1-P(L))*P(G)
 */
export function expectedInformationGain(
  conceptId: string,
  masteries: Map<string, number>,
  edges: SimpleEdge[],
  pGuess: number,
  pSlip: number = BKT_DEFAULTS.pSlip,
): number {
  const pL = masteries.get(conceptId) ?? 0.5;
  const hCurrent = totalEntropy(masteries);

  // Probability of observing correct
  const pCorrect = pL * (1 - pSlip) + (1 - pL) * pGuess;
  const pIncorrect = 1 - pCorrect;

  // Simulate correct outcome
  const pLAfterCorrect = updateMasteryAfterCorrect(pL, pGuess, pSlip);
  const masteriesAfterCorrect = new Map(masteries);
  masteriesAfterCorrect.set(conceptId, pLAfterCorrect);
  const propagatedCorrect = propagateCorrectUpward(conceptId, pLAfterCorrect, masteries, edges);
  for (const [id, val] of propagatedCorrect) {
    masteriesAfterCorrect.set(id, val);
  }
  const hAfterCorrect = totalEntropy(masteriesAfterCorrect);

  // Simulate incorrect outcome
  const pLAfterIncorrect = updateMasteryAfterIncorrect(pL, pSlip, pGuess);
  const masteriesAfterIncorrect = new Map(masteries);
  masteriesAfterIncorrect.set(conceptId, pLAfterIncorrect);
  const propagatedIncorrect = propagateIncorrectDownward(conceptId, pLAfterIncorrect, masteries, edges);
  for (const [id, val] of propagatedIncorrect) {
    masteriesAfterIncorrect.set(id, val);
  }
  const hAfterIncorrect = totalEntropy(masteriesAfterIncorrect);

  // Expected entropy after testing
  const hExpected = pCorrect * hAfterCorrect + pIncorrect * hAfterIncorrect;

  return Math.max(0, hCurrent - hExpected);
}

/**
 * Select the untested concept with the highest expected information gain.
 * Returns null if all concepts have been tested.
 */
export function selectNextConcept(
  masteries: Map<string, number>,
  edges: SimpleEdge[],
  testedIds: Set<string>,
  pGuess: number,
): string | null {
  let bestId: string | null = null;
  let bestGain = -1;

  for (const conceptId of masteries.keys()) {
    if (testedIds.has(conceptId)) continue;

    const gain = expectedInformationGain(conceptId, masteries, edges, pGuess);
    if (gain > bestGain) {
      bestGain = gain;
      bestId = conceptId;
    }
  }

  return bestId;
}
