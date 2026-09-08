import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReviewService } from './review.service';

const owner = ['org-1', 'user-1', 'course-1', 'concept-1'] as const;
const problems = [1, 2, 3].map((index) => ({
  id: `p${index}`, questionText: `Q${index}`, type: 'multiple_choice',
  options: ['A', 'B'], correctAnswer: 0, explanation: 'A is correct.',
  difficulty: 3, isReviewVariant: true,
}));

function createHarness() {
  let conceptState = {
    masteryState: 'needs_review', failCount: 0, repNum: 0,
    concept: { isArchived: false, section: null },
  };
  const attempts = new Map<string, any>();
  const awards = new Map<string, number>();
  const prisma: any = {
    problem: { findMany: jest.fn().mockResolvedValue(problems) },
    problemAttempt: {
      findUnique: jest.fn().mockImplementation(async ({ where }) => attempts.get(where.id) ?? null),
      upsert: jest.fn().mockImplementation(({ where, create }) => {
        if (!attempts.has(where.id)) attempts.set(where.id, { ...create, submissionReceipt: null });
        return Promise.resolve(attempts.get(where.id));
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        Object.assign(attempts.get(where.id), data);
        return Promise.resolve(attempts.get(where.id));
      }),
    },
    $transaction: jest.fn().mockImplementation(async (operation) => {
      const before = structuredClone(conceptState);
      const beforeAttempts = structuredClone([...attempts.entries()]);
      try { return await operation(prisma); }
      catch (error) {
        conceptState = before;
        attempts.clear();
        for (const [id, attempt] of beforeAttempts) attempts.set(id, attempt);
        throw error;
      }
    }),
  };
  const studentState = {
    getConceptStateWithConcept: jest.fn().mockImplementation(async () => conceptState),
    getConceptState: jest.fn().mockImplementation(async () => conceptState),
    updateConceptAfterPractice: jest.fn().mockImplementation(async (_userId, _conceptId, data, tx) => {
      expect(tx).toBe(prisma);
      conceptState = { ...conceptState, ...data };
    }),
  };
  const xp = { recordXPEvent: jest.fn().mockImplementation(async (input) => {
    if (!awards.has(input.idempotencyKey)) awards.set(input.idempotencyKey, input.amount);
    return { amount: awards.get(input.idempotencyKey) };
  }) };
  const fire = { updateAfterReview: jest.fn().mockImplementation(async (_userId, _conceptId, _passed, _score, _academyId, tx) => {
    expect(tx).toBe(prisma);
    conceptState.repNum++;
  }) };
  const sections = { syncSectionStates: jest.fn().mockResolvedValue([]) };
  const scope = { assertConcept: jest.fn().mockResolvedValue({ academyId: 'academy-1' }) };
  const remediation = { getActiveRemediations: jest.fn().mockResolvedValue([]) };
  const service = new ReviewService(prisma, xp as any, fire as any, sections as any,
    studentState as any, scope as any, remediation as any);
  const start = () => service.startReview(...owner);
  const answer = (sessionId: string, problemId: string, value: unknown = '0') =>
    service.submitReviewAnswer(...owner, sessionId, problemId, value, 5000);
  const complete = (sessionId: string) => service.completeReview(...owner, sessionId);
  const answerAll = async (sessionId: string, values = ['0', '0', '0']) => {
    for (let index = 0; index < problems.length; index++) await answer(sessionId, problems[index].id, values[index]);
  };
  return { service, prisma, studentState, xp, fire, sections, scope, remediation,
    attempts, awards, state: () => conceptState, start, answer, complete, answerAll };
}

describe('ReviewService', () => {
  it('assigns sanitized questions and random session IDs', async () => {
    const { start } = createHarness();
    const first = await start();
    const second = await start();
    expect(first).toMatchObject({ totalProblems: 3, problemNumber: 1, currentProblem: {
      id: 'p1', options: [{ id: '0', text: 'A' }, { id: '1', text: 'B' }],
    } });
    expect(first.currentProblem).not.toHaveProperty('correctAnswer');
    expect(first.sessionId).not.toEqual(second.sessionId);
  });

  it('falls back to ordinary questions and rejects an empty bank', async () => {
    const { prisma, start } = createHarness();
    prisma.problem.findMany.mockResolvedValueOnce([]);
    expect((await start()).totalProblems).toBe(3);
    prisma.problem.findMany.mockResolvedValue([]);
    await expect(start()).rejects.toThrow(NotFoundException);
  });

  it('requires an active concept enrollment', async () => {
    const { studentState, start } = createHarness();
    studentState.getConceptStateWithConcept.mockResolvedValue(null as any);
    await expect(start()).rejects.toThrow(NotFoundException);
    studentState.getConceptStateWithConcept.mockResolvedValue({ concept: { isArchived: true } } as any);
    await expect(start()).rejects.toThrow(NotFoundException);
  });

  it.each(['unstarted', 'in_progress'])('rejects an unassigned review of %s content', async (masteryState) => {
    const { state, start, prisma } = createHarness();
    state().masteryState = masteryState;
    await expect(start()).rejects.toThrow('Complete the lesson');
    expect(prisma.problem.findMany).not.toHaveBeenCalled();
  });

  it('allows an explicit prerequisite remediation', async () => {
    const { state, start, remediation } = createHarness();
    state().masteryState = 'unstarted';
    remediation.getActiveRemediations.mockResolvedValue([{ weakPrerequisiteId: 'concept-1' }]);
    await expect(start()).resolves.toMatchObject({ totalProblems: 3 });
    expect(remediation.getActiveRemediations).toHaveBeenCalledWith('user-1', 'academy-1');
  });

  it.each([
    ['org-2', 'user-1', 'course-1', 'concept-1'],
    ['org-1', 'other-user', 'course-1', 'concept-1'],
    ['org-1', 'user-1', 'other-course', 'concept-1'],
    ['org-1', 'user-1', 'course-1', 'other-concept'],
  ])('rejects answer and completion outside scope %s %s %s %s', async (orgId, userId, courseId, conceptId) => {
    const { service, start, prisma, fire } = createHarness();
    const { sessionId } = await start();
    await expect(service.submitReviewAnswer(orgId, userId, courseId, conceptId, sessionId, 'p1', '0', 5000)).rejects.toThrow(NotFoundException);
    await expect(service.completeReview(orgId, userId, courseId, conceptId, sessionId)).rejects.toThrow(NotFoundException);
    expect(prisma.problemAttempt.upsert).not.toHaveBeenCalled();
    expect(fire.updateAfterReview).not.toHaveBeenCalled();
  });

  it('rechecks current enrollment when using a saved session', async () => {
    const { scope, start, answer, complete, prisma } = createHarness();
    const { sessionId } = await start();
    scope.assertConcept.mockRejectedValue(new NotFoundException());
    await expect(answer(sessionId, 'p1')).rejects.toThrow(NotFoundException);
    await expect(complete(sessionId)).rejects.toThrow(NotFoundException);
    expect(prisma.problemAttempt.upsert).not.toHaveBeenCalled();
  });

  it('rejects unassigned and out-of-order questions before grading', async () => {
    const { start, answer, prisma } = createHarness();
    const { sessionId } = await start();
    await expect(answer(sessionId, 'outside')).rejects.toThrow(NotFoundException);
    await expect(answer(sessionId, 'p2')).rejects.toThrow(BadRequestException);
    expect(prisma.problemAttempt.upsert).not.toHaveBeenCalled();
  });

  it('does not change mastery or repetition after one correct answer', async () => {
    const { start, answer, complete, state, studentState, fire } = createHarness();
    const { sessionId } = await start();
    expect(await answer(sessionId, 'p1')).toMatchObject({ correct: true, hasMore: true, problemNumber: 2 });
    await expect(complete(sessionId)).rejects.toThrow('Answer every assigned');
    expect(state()).toMatchObject({ masteryState: 'needs_review', repNum: 0 });
    expect(studentState.updateConceptAfterPractice).not.toHaveBeenCalled();
    expect(fire.updateAfterReview).not.toHaveBeenCalled();
  });

  it('replays identical concurrent answers once and rejects changed answers', async () => {
    const { start, answer, attempts, awards } = createHarness();
    const { sessionId } = await start();
    const [first, second] = await Promise.all([answer(sessionId, 'p1'), answer(sessionId, 'p1')]);
    expect(first).toEqual(second);
    expect(attempts.size).toBe(1);
    expect(awards.size).toBe(1);
    await expect(answer(sessionId, 'p1', '1')).rejects.toThrow('already answered');
  });

  it('recovers a committed attempt after its database response is lost', async () => {
    const { start, answer, prisma, attempts, awards } = createHarness();
    const { sessionId } = await start();
    const persist = prisma.problemAttempt.upsert.getMockImplementation();
    prisma.problemAttempt.upsert.mockImplementationOnce(async (input: any) => {
      await persist(input);
      throw new Error('Lost database response');
    });
    await expect(answer(sessionId, 'p1')).rejects.toThrow('Lost database response');
    await expect(answer(sessionId, 'p1', '1')).rejects.toThrow('already answered');
    await expect(answer(sessionId, 'p1')).resolves.toMatchObject({ problemNumber: 2 });
    expect(attempts.size).toBe(1);
    expect(awards.size).toBe(1);
  });

  it('retries after an XP award or attempt-finalization failure without duplicate effects', async () => {
    const { start, answer, xp, prisma, attempts, awards, state } = createHarness();
    const { sessionId } = await start();
    const award = xp.recordXPEvent.getMockImplementation()!;
    xp.recordXPEvent.mockImplementationOnce(async (input: any) => {
      await award(input);
      throw new Error('Lost XP response');
    });
    await expect(answer(sessionId, 'p1')).rejects.toThrow('Lost XP response');
    prisma.problemAttempt.update.mockRejectedValueOnce(new Error('Attempt update failed'));
    await expect(answer(sessionId, 'p1')).rejects.toThrow('Attempt update failed');
    await expect(answer(sessionId, 'p1')).resolves.toMatchObject({ correct: true, xpAwarded: 4 });
    expect(attempts.size).toBe(1);
    expect(awards.size).toBe(1);
    expect([...attempts.values()][0].xpAwarded).toBe(4);
    expect(state()).toMatchObject({ masteryState: 'needs_review', repNum: 0 });
  });

  it.each([
    [['0', '0', '0'], true, 1, 'mastered'],
    [['0', '1', '1'], false, 1 / 3, 'needs_review'],
  ] as const)('scores the complete assigned set %j', async (values, passed, score, masteryState) => {
    const { start, answerAll, complete, state } = createHarness();
    const { sessionId } = await start();
    await answerAll(sessionId, [...values]);
    expect(await complete(sessionId)).toMatchObject({ passed, score, totalCount: 3, updatedMasteryState: masteryState });
    expect(state().repNum).toBe(1);
  });

  it('replays concurrent and later completion without repeating XP or repetition', async () => {
    const { start, answerAll, answer, complete, fire, studentState, awards } = createHarness();
    const { sessionId } = await start();
    await answerAll(sessionId);
    const [first, second] = await Promise.all([complete(sessionId), complete(sessionId)]);
    expect(first).toEqual(second);
    expect(await complete(sessionId)).toEqual(first);
    expect(fire.updateAfterReview).toHaveBeenCalledTimes(1);
    expect(studentState.updateConceptAfterPractice).toHaveBeenCalledTimes(1);
    expect(awards.size).toBe(3);
    expect(await answer(sessionId, 'p1')).toMatchObject({ problemNumber: 2 });
  });

  it('rolls back mastery when repetition fails and retries completion', async () => {
    const { start, answerAll, complete, fire, state } = createHarness();
    const { sessionId } = await start();
    await answerAll(sessionId);
    fire.updateAfterReview.mockRejectedValueOnce(new Error('Propagation failed'));
    await expect(complete(sessionId)).rejects.toThrow('Propagation failed');
    expect(state()).toMatchObject({ masteryState: 'needs_review', repNum: 0 });
    await expect(complete(sessionId)).resolves.toMatchObject({ passed: true });
    expect(state()).toMatchObject({ masteryState: 'mastered', repNum: 1 });
  });

  it('retries section sync without repeating committed mastery or repetition', async () => {
    const { start, answerAll, complete, sections, state } = createHarness();
    const { sessionId } = await start();
    await answerAll(sessionId);
    sections.syncSectionStates.mockRejectedValueOnce(new Error('Sync failed'));
    await expect(complete(sessionId)).rejects.toThrow('Sync failed');
    await expect(complete(sessionId)).resolves.toMatchObject({ passed: true });
    expect(state().repNum).toBe(1);
  });

  it('uses the durable receipt after a committed transaction loses its acknowledgement', async () => {
    const { start, answerAll, complete, prisma, state, fire, attempts } = createHarness();
    const { sessionId } = await start();
    await answerAll(sessionId);
    prisma.$transaction.mockImplementationOnce(async (operation: any) => {
      await operation(prisma);
      // The database committed; only the response to the caller was lost.
      throw new Error('Commit acknowledgement lost');
    });
    await expect(complete(sessionId)).rejects.toThrow('Commit acknowledgement lost');
    const receipt = [...attempts.values()].find((attempt) => attempt.submissionReceipt)?.submissionReceipt;
    expect(receipt).toMatchObject({
      kind: 'review_completion', version: 1, sessionId,
      userId: owner[1], orgId: owner[0], courseId: owner[2], conceptId: owner[3],
    });
    expect(state()).toMatchObject({ masteryState: 'mastered', repNum: 1 });
    await expect(complete(sessionId)).resolves.toEqual(receipt.result);
    expect(state().repNum).toBe(1);
    expect(fire.updateAfterReview).toHaveBeenCalledTimes(1);
  });

  it('rolls back mastery and repetition when the durable receipt cannot be saved', async () => {
    const { start, answerAll, complete, prisma, state, attempts } = createHarness();
    const { sessionId } = await start();
    await answerAll(sessionId);
    prisma.problemAttempt.update.mockRejectedValueOnce(new Error('Receipt write failed'));
    await expect(complete(sessionId)).rejects.toThrow('Receipt write failed');
    expect(state()).toMatchObject({ masteryState: 'needs_review', repNum: 0 });
    expect([...attempts.values()].every((attempt) => attempt.submissionReceipt === null)).toBe(true);
    await expect(complete(sessionId)).resolves.toMatchObject({ passed: true });
    expect(state().repNum).toBe(1);
  });
});
