/**
 * KPRemediationSelector — pure function that decides the next problem to serve
 * after a lesson practice attempt.
 *
 * Principle (Math Academy Way, Ch 21, p.300):
 *   "If they struggle during a task, we give more questions — that is, more
 *    chances to learn and demonstrate their learning."
 *
 * On a wrong answer the learner stays on the same knowledge point and sees a
 * different problem from the bank. On two consecutive correct answers the KP
 * is "passed" and the selector advances to the next KP in sortOrder.
 *
 * This module lives inside `assessment/` because it only consults KP state
 * and the lesson's problem bank. It does NOT traverse the prerequisite graph;
 * that is Slice 3's KPPlateauDetector.
 */

export interface ProblemBankEntry {
  problemId: string;
  knowledgePointId: string;
  sortOrder: number;
}

export interface KPStateSnapshot {
  knowledgePointId: string;
  sortOrder: number;
  passed: boolean;
  consecutiveCorrect: number;
  attempts: number;
}

export interface KPRemediationInput {
  currentKPId: string;
  lastProblemId: string;
  lastAnswerCorrect: boolean;
  problemBank: ProblemBankEntry[];
  kpStates: KPStateSnapshot[];
  seenProblemIdsThisSession: Set<string>;
  /**
   * KPs for which the worked example has already been re-opened once
   * in this session. See risk mitigation in the plan: "only auto-expand
   * on the first miss per KP per session; subsequent misses collapse it."
   */
  workedExampleAlreadyReopenedForKP?: Set<string>;
}

export interface KPRemediationResult {
  /**
   * The KP the next problem should target. Stable across a practice loop
   * until the KP is passed (2 consecutive correct).
   */
  targetKPId: string;
  /**
   * The id of the next problem to render, or null if the lesson is complete.
   */
  nextProblemId: string | null;
  /**
   * Whether the UI should re-open the collapsible worked-example panel.
   * True on the FIRST miss per KP per session, false otherwise.
   * See Math Academy FAQ p.416–417: we re-surface the existing worked
   * example verbatim. We never generate a new explanation.
   */
  reopenWorkedExample: boolean;
  /**
   * Anti-gaming retry delay (Ch 22, p.313). Applied when the learner has
   * attempted the same KP more than twice in the current session without
   * passing it. The UI should block submission for this many ms.
   */
  retryDelayMs: number;
  /**
   * True when every KP in the lesson has been passed. Nothing more to do.
   */
  lessonComplete: boolean;
}

const RETRY_DELAY_ATTEMPT_THRESHOLD = 2;
const RETRY_DELAY_BASE_MS = 1500;
const RETRY_DELAY_JITTER_MS = 1000;
const CONSECUTIVE_CORRECT_TO_PASS = 2;

/**
 * Decide the next problem to serve during a practice loop.
 * Pure function: no I/O, no randomness except a bounded jitter on retry delay.
 */
export function selectNextKPProblem(
  input: KPRemediationInput,
): KPRemediationResult {
  const {
    currentKPId,
    lastAnswerCorrect,
    problemBank,
    kpStates,
    seenProblemIdsThisSession,
    workedExampleAlreadyReopenedForKP,
  } = input;

  // Group bank by KP, preserving sortOrder within each KP.
  const bankByKP = new Map<string, ProblemBankEntry[]>();
  for (const entry of problemBank) {
    const list = bankByKP.get(entry.knowledgePointId) ?? [];
    list.push(entry);
    bankByKP.set(entry.knowledgePointId, list);
  }
  for (const list of bankByKP.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  const kpStatesById = new Map<string, KPStateSnapshot>();
  for (const state of kpStates) kpStatesById.set(state.knowledgePointId, state);

  const currentKPState = kpStatesById.get(currentKPId);
  const currentKPPassed =
    currentKPState?.passed === true ||
    (currentKPState?.consecutiveCorrect ?? 0) >= CONSECUTIVE_CORRECT_TO_PASS;

  // Decide which KP the next problem targets.
  let targetKPId = currentKPId;
  if (lastAnswerCorrect && currentKPPassed) {
    // Advance to the next KP in sortOrder that is not yet passed.
    const sortedKPs = [...kpStates].sort((a, b) => a.sortOrder - b.sortOrder);
    const currentIdx = sortedKPs.findIndex(
      (s) => s.knowledgePointId === currentKPId,
    );
    const nextKP = sortedKPs
      .slice(currentIdx + 1)
      .find((s) => !s.passed && s.consecutiveCorrect < CONSECUTIVE_CORRECT_TO_PASS);
    if (!nextKP) {
      return {
        targetKPId: currentKPId,
        nextProblemId: null,
        reopenWorkedExample: false,
        retryDelayMs: 0,
        lessonComplete: true,
      };
    }
    targetKPId = nextKP.knowledgePointId;
  }

  // Pick a problem for the target KP.
  const candidates = bankByKP.get(targetKPId) ?? [];
  if (candidates.length === 0) {
    // No problems authored for this KP; treat as completed so the learner
    // is not trapped. LessonService surfaces the "no problems authored" UX.
    return {
      targetKPId,
      nextProblemId: null,
      reopenWorkedExample: false,
      retryDelayMs: 0,
      lessonComplete: false,
    };
  }

  const unseen = candidates.filter(
    (c) => !seenProblemIdsThisSession.has(c.problemId),
  );

  let nextProblemId: string;
  if (unseen.length > 0) {
    nextProblemId = unseen[0].problemId;
  } else {
    // Bank exhausted for this KP in the session — recycle. Avoid serving the
    // same problem the learner just saw when possible.
    const recycled = candidates.find(
      (c) => c.problemId !== input.lastProblemId,
    );
    nextProblemId = (recycled ?? candidates[0]).problemId;
  }

  // Anti-gaming retry delay: attempts on target KP > threshold within the
  // session AND bank recycled OR the last answer was wrong on a "hot" KP.
  const targetKPAttempts = kpStatesById.get(targetKPId)?.attempts ?? 0;
  const shouldDelay =
    targetKPAttempts > RETRY_DELAY_ATTEMPT_THRESHOLD || unseen.length === 0;
  const retryDelayMs = shouldDelay
    ? RETRY_DELAY_BASE_MS + Math.floor(Math.random() * RETRY_DELAY_JITTER_MS)
    : 0;

  // Re-open worked example on the FIRST miss per KP per session only.
  const alreadyReopened =
    workedExampleAlreadyReopenedForKP?.has(targetKPId) ?? false;
  const reopenWorkedExample = !lastAnswerCorrect && !alreadyReopened;

  return {
    targetKPId,
    nextProblemId,
    reopenWorkedExample,
    retryDelayMs,
    lessonComplete: false,
  };
}
