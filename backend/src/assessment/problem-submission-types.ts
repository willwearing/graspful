import type { ActivityType } from './xp-calculator';

export interface SubmitAnswerInput {
  requestId?: string;
  userId: string;
  orgId: string;
  courseId: string;
  conceptId: string;
  problemId: string;
  answer: unknown;
  responseTimeMs: number;
  activityType: ActivityType;
  /**
   * Problem IDs the learner has already seen during this lesson session.
   * Used by the KPRemediationSelector to avoid repeating problems and to
   * trigger anti-gaming retry delays. Optional for callers that are not
   * driving a lesson-flow loop (e.g. reviews, section exams).
   */
  seenProblemIds?: string[];
  /**
   * KPs for which the worked example has already been re-opened once in
   * this session. Matches the risk-mitigation rule: "only auto-expand on
   * the first miss per KP per session; subsequent misses collapse it."
   */
  workedExampleReopenedKPIds?: string[];
}

export interface NextProblemHint {
  /** The KP the next problem must target (same KP on miss; next KP on pass). */
  targetKPId: string;
  /** The concrete problem id to fetch next, or null if the lesson is complete. */
  nextProblemId: string | null;
  /** True if the lesson loop should re-surface the worked example panel. */
  reopenWorkedExample: boolean;
  /** Anti-gaming retry delay in ms; 0 if none. */
  retryDelayMs: number;
  /** True when every KP in the lesson has been passed. */
  lessonComplete: boolean;
}

export interface SubmitAnswerResult {
  correct: boolean;
  feedback: string;
  xpAwarded: number;
  antiGamingTriggered: boolean;
  updatedKPState: {
    passed: boolean;
    attempts: number;
    consecutiveCorrect: number;
  };
  updatedMasteryState: string;
  /**
   * Slice 1 : KP-level "more practice" loop. When the submission was part
   * of a lesson practice loop, the service returns a hint describing which
   * KP the next problem should target and which concrete problem to load.
   *
   * Null for non-lesson submissions (reviews, quiz questions, exams) where
   * task selection lives elsewhere.
   */
  nextProblemHint: NextProblemHint | null;
}
