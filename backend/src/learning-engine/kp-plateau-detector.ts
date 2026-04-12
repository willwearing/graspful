/**
 * KPPlateauDetector — Slice 3 of the wrong-answer remediation loop.
 *
 * Fires when a learner has failed the same knowledge point enough times
 * across enough sessions to warrant remedial review on that KP's
 * authored **key prerequisite**.
 *
 * Principle (Math Academy Way, Ch 4 p.75–76 + Ch 21 pp.300–301):
 *   "If a student ever fails a lesson twice at the same knowledge point,
 *    we automatically provide remedial reviews on the key prerequisites.
 *    This helps the student strengthen their foundations in the areas
 *    where they are most in need of additional practice, so that they
 *    are better prepared to pass the lesson the next time around."
 *
 * Graspful's thresholds are slightly softer than Math Academy's "twice at
 * the same KP" because Slice 1 already gives extra practice within the
 * current session. We fire only once the learner has failed across at
 * least two DIFFERENT sessions — matching Math Academy's FAQ p.416:
 * "this is a slow process because it has to be resistant to adversarial
 * students gaming the system."
 */

export const KP_PLATEAU_ATTEMPTS_THRESHOLD = 4;
export const KP_PLATEAU_SESSIONS_THRESHOLD = 2;

export interface KPPlateauSnapshot {
  attempts: number;
  passed: boolean;
  /**
   * Distinct session ids on which a failure occurred for this KP. Callers
   * that only track "first failed session" and "most recent failed session"
   * should pass `[first, last]` — de-duplication is handled internally.
   */
  failedSessionIds: string[];
  /** The KP's authored key prerequisite, or null when not yet backfilled. */
  keyPrerequisiteConceptId: string | null;
}

/**
 * True when the KP has plateaued and the system should create a remediation
 * pointing at its key prerequisite. Graceful fallback: when the KP has no
 * authored key prerequisite, this returns false and the concept-level
 * `detectPlateau` path handles the case.
 */
export function detectKPPlateau(snapshot: KPPlateauSnapshot): boolean {
  if (snapshot.passed) return false;
  if (!snapshot.keyPrerequisiteConceptId) return false;
  if (snapshot.attempts < KP_PLATEAU_ATTEMPTS_THRESHOLD) return false;
  const distinctSessions = new Set(snapshot.failedSessionIds).size;
  return distinctSessions >= KP_PLATEAU_SESSIONS_THRESHOLD;
}
