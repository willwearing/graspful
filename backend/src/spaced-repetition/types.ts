/**
 * Types shared across the spaced-repetition module.
 * These decouple pure functions from Prisma models.
 */

/** An encompassing edge linking a source (encompassed) concept to a target (encompassing) concept. */
export interface EncompassingLink {
  sourceConceptId: string; // encompassed concept (receives implicit credit)
  targetConceptId: string; // encompassing concept (the one practiced)
  weight: number;          // fractional credit [0, 1]
}

/** Result of implicit repetition computation for a single concept. */
export interface ImplicitUpdate {
  conceptId: string;
  repNumDelta: number;
  memoryDelta: number;
}

/** Minimal concept state needed by FIRe pure functions. */
export interface FireConceptState {
  conceptId: string;
  repNum: number;
  memory: number;
  interval: number;
  speed: number;
  lastPracticedAt: Date | null;
}

/** The interval schedule (days). Index = floor(repNum). */
export const INTERVAL_SCHEDULE = [1, 3, 7, 14, 30, 60, 120, 240] as const;
