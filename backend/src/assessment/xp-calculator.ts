/**
 * Pure functions for XP calculation with anti-gaming checks.
 * No external dependencies.
 */

export type ActivityType = 'lesson' | 'review' | 'quiz';

export interface XPInput {
  activityType: ActivityType;
  difficulty: number; // 1-10 for lessons, 1-5 for problems
  correct: boolean;
  responseTimeMs: number;
  attemptNumber: number; // 1-based
  quizScore?: number; // 0-1, only for quiz completion
}

export interface XPResult {
  xp: number;
  antiGamingTriggered: boolean;
  reason?: string;
}

const MIN_RESPONSE_TIME_MS = 2000;

/**
 * Calculate XP for a lesson problem answer.
 * Base: 10-20 XP scaled by difficulty.
 * +25% if first attempt, -50% if third+ attempt.
 */
export function calculateLessonXP(
  difficulty: number,
  attemptNumber: number,
  correct: boolean,
  responseTimeMs: number,
): XPResult {
  if (!correct) return { xp: 0, antiGamingTriggered: false };

  if (responseTimeMs < MIN_RESPONSE_TIME_MS) {
    return {
      xp: 0,
      antiGamingTriggered: true,
      reason: 'Answer submitted too quickly (<2s)',
    };
  }

  // Base XP scales linearly from 10 (difficulty 1) to 20 (difficulty 10)
  const baseXP = Math.round(10 + ((difficulty - 1) / 9) * 10);

  let modifier = 1.0;
  if (attemptNumber === 1) {
    modifier = 1.25;
  } else if (attemptNumber >= 3) {
    modifier = 0.5;
  }

  return {
    xp: Math.round(baseXP * modifier),
    antiGamingTriggered: false,
  };
}

/**
 * Calculate XP for a review problem answer.
 * Base: 3-5 XP. +10% if fast + accurate.
 */
export function calculateReviewXP(
  difficulty: number,
  correct: boolean,
  responseTimeMs: number,
  expectedTimeMs: number,
): XPResult {
  if (!correct) return { xp: 0, antiGamingTriggered: false };

  if (responseTimeMs < MIN_RESPONSE_TIME_MS) {
    return {
      xp: 0,
      antiGamingTriggered: true,
      reason: 'Answer submitted too quickly (<2s)',
    };
  }

  // Base: 3-5 scaled by difficulty (1-5)
  const baseXP = Math.round(3 + ((Math.min(difficulty, 5) - 1) / 4) * 2);

  // Fast + accurate bonus: answer in under expected time
  const fastBonus = responseTimeMs < expectedTimeMs ? 1.1 : 1.0;

  return {
    xp: Math.round(baseXP * fastBonus),
    antiGamingTriggered: false,
  };
}

/**
 * Calculate XP for quiz completion.
 * Base: 15-25 XP. Score-dependent multiplier.
 * 100% = 1.5x, <60% = 0.5x
 */
export function calculateQuizXP(
  questionCount: number,
  correctCount: number,
): XPResult {
  const score = questionCount > 0 ? correctCount / questionCount : 0;

  // Base XP scales with question count, capped at 15-25
  const baseXP = Math.round(
    Math.min(25, Math.max(15, questionCount * 1.5)),
  );

  let multiplier: number;
  if (score >= 1.0) {
    multiplier = 1.5;
  } else if (score >= 0.8) {
    multiplier = 1.2;
  } else if (score >= 0.6) {
    multiplier = 1.0;
  } else {
    multiplier = 0.5;
  }

  return {
    xp: Math.round(baseXP * multiplier),
    antiGamingTriggered: false,
  };
}

/**
 * Main XP dispatcher for individual problem answers.
 */
export function calculateXP(input: XPInput): XPResult {
  switch (input.activityType) {
    case 'lesson':
      return calculateLessonXP(
        input.difficulty,
        input.attemptNumber,
        input.correct,
        input.responseTimeMs,
      );
    case 'review':
      return calculateReviewXP(
        input.difficulty,
        input.correct,
        input.responseTimeMs,
        10000, // default expected time 10s
      );
    case 'quiz':
      // Individual quiz answers don't get XP; XP is awarded on completion
      return { xp: 0, antiGamingTriggered: false };
    default:
      return { xp: 0, antiGamingTriggered: false };
  }
}
