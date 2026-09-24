import { Prisma } from '@prisma/client';
import { StudentStateService } from '@/student-model/student-state.service';
import { updateSubmissionConceptState } from './problem-submission-progress';

describe('problem submission session progress', () => {
  const now = new Date('2026-09-24T23:59:59.000Z');
  const concept = { difficulty: 5, difficultyTheta: 0, timeIntensity: Math.log(10), timeIntensitySD: 0.8 };
  let state: any;
  let tx: Prisma.TransactionClient;
  let studentState: StudentStateService;

  beforeEach(() => {
    jest.useFakeTimers({ now });
    state = {
      masteryState: 'in_progress', abilityTheta: 0, speedRD: 250,
      observationCount: 0, failCount: 0, pausedAtSessionId: null,
      sessionFailedKPAttempts: 0, lastPracticedAt: null,
    };
    tx = { knowledgePoint: { findMany: jest.fn().mockResolvedValue([{ id: 'kp-1' }]) } } as any;
    studentState = {
      getConceptState: jest.fn().mockImplementation(async () => ({ ...state })),
      getKPStatesForIds: jest.fn().mockResolvedValue([{ knowledgePointId: 'kp-1', passed: false }]),
      updateConceptAfterPractice: jest.fn().mockImplementation(async (_userId, _conceptId, data) => {
        Object.assign(state, data);
        return { ...state };
      }),
    } as unknown as StudentStateService;
  });

  afterEach(() => jest.useRealTimers());

  const practice = (studentState: StudentStateService, tx: Prisma.TransactionClient, correct = false) =>
    updateSubmissionConceptState(studentState, 'user-1', 'concept-1', correct, 5000, concept, true, tx);

  it('accumulates failed answers before the pause threshold and pauses on the sixth failure', async () => {
    for (let failure = 1; failure <= 6; failure++) {
      await practice(studentState, tx);
      expect(state.sessionFailedKPAttempts).toBe(failure);
      expect(state.pausedAtSessionId).toBe(failure < 6 ? null : '2026-09-24');
    }
    expect(studentState.updateConceptAfterPractice).toHaveBeenLastCalledWith(
      'user-1', 'concept-1', expect.objectContaining({ lastPracticedAt: now }), tx,
    );
  });

  it('keeps failures from the current session after a successful answer', async () => {
    await practice(studentState, tx);
    await practice(studentState, tx, true);
    await practice(studentState, tx);

    expect(state.sessionFailedKPAttempts).toBe(2);
    expect(state.failCount).toBe(1);
    expect(state.pausedAtSessionId).toBeNull();
  });

  it.each([null, '2026-09-24'])('resets a previous session counter at UTC midnight with pause marker %s', async (pausedAtSessionId) => {
    Object.assign(state, {
      lastPracticedAt: now, sessionFailedKPAttempts: 5, pausedAtSessionId,
    });
    jest.setSystemTime(new Date('2026-09-25T00:00:00.000Z'));

    await practice(studentState, tx);

    expect(state.sessionFailedKPAttempts).toBe(1);
    expect(state.pausedAtSessionId).toBeNull();
  });

  it('keeps a current session pause even when practice time is absent from legacy state', async () => {
    Object.assign(state, { pausedAtSessionId: '2026-09-24', sessionFailedKPAttempts: 6 });

    await practice(studentState, tx);

    expect(state.sessionFailedKPAttempts).toBe(7);
    expect(state.pausedAtSessionId).toBe('2026-09-24');
  });
});
