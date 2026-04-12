import {
  selectNextKPProblem,
  KPRemediationInput,
  ProblemBankEntry,
  KPStateSnapshot,
} from './kp-remediation-selector';

describe('selectNextKPProblem', () => {
  const kpA: KPStateSnapshot = {
    knowledgePointId: 'kp-a',
    sortOrder: 0,
    passed: false,
    consecutiveCorrect: 0,
    attempts: 0,
  };
  const kpB: KPStateSnapshot = {
    knowledgePointId: 'kp-b',
    sortOrder: 1,
    passed: false,
    consecutiveCorrect: 0,
    attempts: 0,
  };

  const bank: ProblemBankEntry[] = [
    { problemId: 'p-a-1', knowledgePointId: 'kp-a', sortOrder: 0 },
    { problemId: 'p-a-2', knowledgePointId: 'kp-a', sortOrder: 1 },
    { problemId: 'p-a-3', knowledgePointId: 'kp-a', sortOrder: 2 },
    { problemId: 'p-b-1', knowledgePointId: 'kp-b', sortOrder: 0 },
  ];

  describe('after a wrong answer', () => {
    it('should return another problem on the SAME KP', () => {
      const input: KPRemediationInput = {
        currentKPId: 'kp-a',
        lastProblemId: 'p-a-1',
        lastAnswerCorrect: false,
        problemBank: bank,
        kpStates: [{ ...kpA, attempts: 1, consecutiveCorrect: 0 }, kpB],
        seenProblemIdsThisSession: new Set(['p-a-1']),
      };
      const result = selectNextKPProblem(input);
      expect(result.nextProblemId).toMatch(/^p-a-/);
      expect(result.nextProblemId).not.toBe('p-a-1');
      expect(result.targetKPId).toBe('kp-a');
      expect(result.reopenWorkedExample).toBe(true);
    });

    it('should prefer problems not yet seen this session', () => {
      const input: KPRemediationInput = {
        currentKPId: 'kp-a',
        lastProblemId: 'p-a-1',
        lastAnswerCorrect: false,
        problemBank: bank,
        kpStates: [{ ...kpA, attempts: 1, consecutiveCorrect: 0 }, kpB],
        seenProblemIdsThisSession: new Set(['p-a-1']),
      };
      const result = selectNextKPProblem(input);
      expect(['p-a-2', 'p-a-3']).toContain(result.nextProblemId);
    });

    it('should recycle from the bank (with delay) when all session problems exhausted', () => {
      const input: KPRemediationInput = {
        currentKPId: 'kp-a',
        lastProblemId: 'p-a-3',
        lastAnswerCorrect: false,
        problemBank: bank,
        kpStates: [{ ...kpA, attempts: 3, consecutiveCorrect: 0 }, kpB],
        seenProblemIdsThisSession: new Set(['p-a-1', 'p-a-2', 'p-a-3']),
      };
      const result = selectNextKPProblem(input);
      expect(result.nextProblemId).toMatch(/^p-a-/);
      // All exhausted — pick any KP-A problem (recycled)
      expect(result.retryDelayMs).toBeGreaterThan(0);
    });
  });

  describe('after a correct answer', () => {
    it('should stay on the SAME KP when consecutiveCorrect < 2', () => {
      const input: KPRemediationInput = {
        currentKPId: 'kp-a',
        lastProblemId: 'p-a-1',
        lastAnswerCorrect: true,
        problemBank: bank,
        kpStates: [{ ...kpA, attempts: 1, consecutiveCorrect: 1 }, kpB],
        seenProblemIdsThisSession: new Set(['p-a-1']),
      };
      const result = selectNextKPProblem(input);
      expect(result.targetKPId).toBe('kp-a');
      expect(result.reopenWorkedExample).toBe(false);
    });

    it('should advance to the NEXT KP when consecutiveCorrect >= 2 (passed)', () => {
      const input: KPRemediationInput = {
        currentKPId: 'kp-a',
        lastProblemId: 'p-a-2',
        lastAnswerCorrect: true,
        problemBank: bank,
        kpStates: [
          { ...kpA, attempts: 2, consecutiveCorrect: 2, passed: true },
          kpB,
        ],
        seenProblemIdsThisSession: new Set(['p-a-1', 'p-a-2']),
      };
      const result = selectNextKPProblem(input);
      expect(result.targetKPId).toBe('kp-b');
      expect(result.nextProblemId).toBe('p-b-1');
      expect(result.reopenWorkedExample).toBe(false);
    });

    it('should signal lesson completion when advancing past the last KP', () => {
      const input: KPRemediationInput = {
        currentKPId: 'kp-b',
        lastProblemId: 'p-b-1',
        lastAnswerCorrect: true,
        problemBank: bank,
        kpStates: [
          { ...kpA, attempts: 2, consecutiveCorrect: 2, passed: true },
          { ...kpB, attempts: 2, consecutiveCorrect: 2, passed: true },
        ],
        seenProblemIdsThisSession: new Set([
          'p-a-1',
          'p-a-2',
          'p-b-1',
        ]),
      };
      const result = selectNextKPProblem(input);
      expect(result.nextProblemId).toBeNull();
      expect(result.lessonComplete).toBe(true);
    });
  });

  describe('anti-gaming retry delay', () => {
    it('should apply a retry delay when attempts > 2 on the same KP in session', () => {
      const input: KPRemediationInput = {
        currentKPId: 'kp-a',
        lastProblemId: 'p-a-2',
        lastAnswerCorrect: false,
        problemBank: bank,
        kpStates: [{ ...kpA, attempts: 3, consecutiveCorrect: 0 }, kpB],
        seenProblemIdsThisSession: new Set(['p-a-1', 'p-a-2']),
      };
      const result = selectNextKPProblem(input);
      expect(result.retryDelayMs).toBeGreaterThan(0);
    });

    it('should not delay on first retry', () => {
      const input: KPRemediationInput = {
        currentKPId: 'kp-a',
        lastProblemId: 'p-a-1',
        lastAnswerCorrect: false,
        problemBank: bank,
        kpStates: [{ ...kpA, attempts: 1, consecutiveCorrect: 0 }, kpB],
        seenProblemIdsThisSession: new Set(['p-a-1']),
      };
      const result = selectNextKPProblem(input);
      expect(result.retryDelayMs).toBe(0);
    });
  });

  describe('reopenWorkedExample behavior', () => {
    it('should only reopen worked example on FIRST miss per KP per session', () => {
      const input: KPRemediationInput = {
        currentKPId: 'kp-a',
        lastProblemId: 'p-a-2',
        lastAnswerCorrect: false,
        problemBank: bank,
        kpStates: [{ ...kpA, attempts: 3, consecutiveCorrect: 0 }, kpB],
        seenProblemIdsThisSession: new Set(['p-a-1', 'p-a-2']),
        workedExampleAlreadyReopenedForKP: new Set(['kp-a']),
      };
      const result = selectNextKPProblem(input);
      expect(result.reopenWorkedExample).toBe(false);
    });
  });
});
