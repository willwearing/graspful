import { INTERVAL_SCHEDULE } from './types';

/**
 * Calculate the raw delta from a review outcome.
 * Applies early-repetition discounting: delta is scaled by (1 - memory)
 * so reviewing something you already remember well gives diminishing returns.
 *
 * @param passed - Whether the review was passed
 * @param quality - Accuracy score 0-1 (only used when passed)
 * @param memory - Current memory value 0-1
 */
export function calculateRawDelta(
  passed: boolean,
  quality: number,
  memory: number,
): number {
  const base = passed ? quality : -0.5;
  return base * (1 - memory);
}

/**
 * Calculate the decay multiplier applied to repNum on failed reviews.
 * Higher penalty when memory is very low (student has forgotten more).
 * Returns a value in [0, 1] where 1.0 = maximum penalty.
 *
 * @param memory - Current memory value 0-1
 */
export function calculateDecay(memory: number): number {
  // Linear: penalty is 1 - memory. Fully forgotten = full penalty.
  return 1 - memory;
}

/**
 * Update repNum after a review.
 *
 * repNum = max(0, repNum + speed * decay^failed * rawDelta)
 *
 * When passed (failed=false): decay^0 = 1, so repNum += speed * rawDelta
 * When failed (failed=true): repNum += speed * decay * rawDelta (rawDelta is negative)
 *
 * @param repNum - Current repetition number
 * @param speed - Student's speed for this concept (>= 0)
 * @param decay - Decay multiplier from calculateDecay
 * @param failed - Whether the review was failed
 * @param rawDelta - Raw delta from calculateRawDelta
 */
export function updateRepNum(
  repNum: number,
  speed: number,
  decay: number,
  failed: boolean,
  rawDelta: number,
): number {
  const multiplier = failed ? decay : 1;
  return Math.max(0, repNum + speed * multiplier * rawDelta);
}

/**
 * Calculate updated memory after a review + time-based forgetting.
 *
 * memory = max(0, memory + rawDelta) * 0.5^(days / interval)
 *
 * @param currentMemory - Current memory value
 * @param rawDelta - Raw delta from calculateRawDelta
 * @param daysSinceLastPractice - Days since last practice
 * @param interval - Current interval in days
 */
export function calculateMemory(
  currentMemory: number,
  rawDelta: number,
  daysSinceLastPractice: number,
  interval: number,
): number {
  const updated = Math.max(0, currentMemory + rawDelta);
  const safeInterval = Math.max(interval, 0.5); // avoid division by zero
  const decayed = updated * Math.pow(0.5, daysSinceLastPractice / safeInterval);
  return Math.min(1, Math.max(0, decayed));
}

/**
 * Calculate the next review interval based on repNum.
 * Uses a fixed schedule: [1, 3, 7, 14, 30, 60, 120, 240] days.
 *
 * @param repNum - Current repetition number (can be fractional)
 */
export function calculateNextInterval(repNum: number): number {
  const index = Math.min(
    Math.floor(repNum),
    INTERVAL_SCHEDULE.length - 1,
  );
  return INTERVAL_SCHEDULE[Math.max(0, index)];
}

/**
 * Apply time-based memory decay only (no rawDelta).
 * Used by MemoryDecayService to update memory before task selection.
 *
 * memory = memory * 0.5^(days / interval)
 *
 * @param memory - Current memory value
 * @param daysSinceLastPractice - Days since last practice
 * @param interval - Current interval in days
 */
export function decayMemory(
  memory: number,
  daysSinceLastPractice: number,
  interval: number,
): number {
  const safeInterval = Math.max(interval, 0.5);
  return Math.max(0, memory * Math.pow(0.5, daysSinceLastPractice / safeInterval));
}
