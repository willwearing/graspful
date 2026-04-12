/**
 * LessonPausePolicy — Slice 2 of the wrong-answer remediation loop.
 *
 * Principle (Math Academy Way, Ch 21 p.300 and FAQ p.415):
 *   "If they fail a lesson, we give them a break and enable them to make
 *    progress learning unrelated topics before asking them to re-attempt
 *    the failed lesson... By halting a failed lesson and coming back to
 *    it later, that produces an 80% chance of passing the lesson the
 *    second time around without any additional intervention."
 *
 * Graspful's interpretation: pauses are SESSION-based, not time-based.
 * A paused concept disappears from the frontier for the rest of the
 * current study session and re-surfaces at the top of the next session.
 *
 * This module is a pure function — no I/O — so it can be unit-tested
 * alongside `plateau-detector.spec.ts`, `task-selector.spec.ts`, and
 * `remediation.service.spec.ts` per the plan's "Add specs alongside"
 * instruction.
 */

export interface LessonPauseInput {
  /** Number of KP attempts that returned incorrect in the current session. */
  sessionFailedKPAttempts: number;
  /** True when at least one KP in the concept is still unpassed. */
  hasUnpassedKPs: boolean;
  /** The concept's current mastery state. */
  masteryState: 'unstarted' | 'in_progress' | 'mastered' | 'needs_review';
}

/**
 * Threshold for session-level failed KP attempts before we pause a lesson.
 * Starting at 6 per the plan; tune on data once we have dashboards.
 */
export const PAUSE_SESSION_FAILURE_THRESHOLD = 6;

/**
 * Decide whether a concept should be paused given current session pressure.
 * Mastered concepts are never paused — they flow through the review path.
 */
export function shouldPauseLesson(input: LessonPauseInput): boolean {
  if (input.masteryState === 'mastered') return false;
  if (!input.hasUnpassedKPs) return false;
  return input.sessionFailedKPAttempts >= PAUSE_SESSION_FAILURE_THRESHOLD;
}

export interface ConceptPauseSnapshot {
  pausedAtSessionId: string | null;
  currentSessionId: string;
}

/**
 * True when the concept is paused and the current session matches the
 * session during which it was paused. Once a new session starts, the
 * concept re-enters the frontier.
 */
export function isConceptPausedInSession(
  snapshot: ConceptPauseSnapshot,
): boolean {
  if (!snapshot.pausedAtSessionId) return false;
  return snapshot.pausedAtSessionId === snapshot.currentSessionId;
}

/**
 * Derive a deterministic session identifier from a timestamp. Uses
 * UTC YYYY-MM-DD so that sessions roll over at UTC midnight regardless
 * of the learner's local clock — this matches Math Academy's doctrine
 * of "across sessions, not wall-clock minutes" and sidesteps per-user
 * timezone complexity.
 */
export function currentSessionId(now: Date = new Date()): string {
  const yyyy = now.getUTCFullYear().toString().padStart(4, '0');
  const mm = (now.getUTCMonth() + 1).toString().padStart(2, '0');
  const dd = now.getUTCDate().toString().padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
