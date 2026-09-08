import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { QuizService, type QuizSession } from './quiz.service';

describe('QuizService', () => {
  let service: QuizService;
  let prisma: any;
  let xp: any;
  let studentState: any;
  let remediation: any;
  let scope: any;

  const conceptStates = [
    { conceptId: 'c1', masteryState: 'mastered' },
    { conceptId: 'c2', masteryState: 'in_progress' },
    { conceptId: 'c3', masteryState: 'mastered' },
  ];
  const problems = [
    {
      id: 'p1', type: 'multiple_choice', questionText: 'Q1', options: ['A', 'B'],
      correctAnswer: '0', explanation: 'Exp1', difficulty: 3, isReviewVariant: false,
      knowledgePoint: { conceptId: 'c1' },
    },
    {
      id: 'p2', type: 'true_false', questionText: 'Q2', options: null,
      correctAnswer: true, explanation: 'Exp2', difficulty: 2, isReviewVariant: false,
      knowledgePoint: { conceptId: 'c2' },
    },
    {
      id: 'p3', type: 'fill_blank', questionText: 'Q3', options: null,
      correctAnswer: '42', explanation: 'Exp3', difficulty: 4, isReviewVariant: false,
      knowledgePoint: { conceptId: 'c3' },
    },
  ];

  const generate = () => service.generateQuiz('org-1', 'user-1', 'course-1');
  const submit = (quizId: string, problemId: string, answer: unknown = '0') =>
    service.submitQuizAnswer('org-1', 'user-1', 'course-1', quizId, problemId, answer, 5000);
  const complete = (quizId: string) => service.completeQuiz('org-1', 'user-1', 'course-1', quizId);
  const session = (quizId: string): QuizSession => (service as any).sessions.get(quizId);
  const expire = (quizId: string) => { session(quizId).startedAt = Date.now() - 15 * 60 * 1000; };
  async function answerAll(quizId: string, correct = true) {
    for (const problem of problems) {
      await submit(quizId, problem.id, correct ? problem.correctAnswer : 'wrong');
    }
  }

  beforeEach(() => {
    prisma = {
      problem: { findMany: jest.fn().mockResolvedValue(problems) },
      problemAttempt: {
        upsert: jest.fn().mockImplementation(async ({ create }: any) => create),
      },
    };
    xp = { recordXPEvent: jest.fn().mockResolvedValue({ amount: 20 }) };
    studentState = {
      getConceptStatesForCourse: jest.fn().mockResolvedValue(conceptStates),
      markConceptsNeedsReview: jest.fn().mockResolvedValue({ count: 3 }),
    };
    remediation = { createRemediation: jest.fn().mockResolvedValue({}) };
    scope = { assertCourse: jest.fn().mockResolvedValue({ academyId: 'academy-1' }) };
    service = new QuizService(prisma, xp, studentState, remediation, scope);
  });

  afterEach(() => { jest.restoreAllMocks(); });

  describe('generateQuiz', () => {
    it('returns a unique quiz and server expiry without answer keys', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);
      const first = await generate();
      const second = await generate();
      expect(first.quizId).not.toBe(second.quizId);
      expect(first.quizId).toMatch(/^[0-9a-f-]{36}$/);
      expect(first).toMatchObject({ totalProblems: 3, startedAt: now, expiresAt: now + 900000 });
      expect(first.problems[0].options).toEqual([{ id: '0', text: 'A' }, { id: '1', text: 'B' }]);
      for (const problem of first.problems) {
        expect(problem).not.toHaveProperty('correctAnswer');
        expect(problem).not.toHaveProperty('explanation');
      }
      expect(scope.assertCourse).toHaveBeenCalledWith('org-1', 'user-1', 'course-1');
      expect(studentState.getConceptStatesForCourse).toHaveBeenCalledWith('user-1', 'course-1');
    });

    it('rejects unavailable or non-entitled course access before reading content', async () => {
      scope.assertCourse.mockRejectedValue(new ForbiddenException('Course access required'));
      await expect(generate()).rejects.toThrow(ForbiddenException);
      expect(studentState.getConceptStatesForCourse).not.toHaveBeenCalled();
      expect(prisma.problem.findMany).not.toHaveBeenCalled();
    });

    it('rejects courses without eligible concepts', async () => {
      studentState.getConceptStatesForCourse.mockResolvedValue([{ conceptId: 'c1', masteryState: 'unstarted' }]);
      await expect(generate()).rejects.toThrow('No concepts available for quiz');
    });

    it('rejects courses with too few assigned problems', async () => {
      prisma.problem.findMany.mockResolvedValue(problems.slice(0, 1));
      await expect(generate()).rejects.toThrow('found 1, need 3');
    });

    it('removes sessions after the expiry retention window', async () => {
      const quiz = await generate();
      session(quiz.quizId).startedAt = Date.now() - 26 * 60 * 60 * 1000;
      await generate();
      await expect(complete(quiz.quizId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('caller scope', () => {
    it.each([
      ['org-2', 'user-1', 'course-1'],
      ['org-1', 'user-2', 'course-1'],
      ['org-1', 'user-1', 'course-2'],
    ])('rejects foreign quiz reads and writes for %s/%s/%s', async (orgId, userId, courseId) => {
      const quiz = await generate();
      await expect(service.submitQuizAnswer(orgId, userId, courseId, quiz.quizId, 'p1', '0', 5000))
        .rejects.toThrow(NotFoundException);
      await expect(service.completeQuiz(orgId, userId, courseId, quiz.quizId))
        .rejects.toThrow(NotFoundException);
      expect(prisma.problemAttempt.upsert).not.toHaveBeenCalled();
      expect(studentState.markConceptsNeedsReview).not.toHaveBeenCalled();
      expect(xp.recordXPEvent).not.toHaveBeenCalled();
    });

    it('checks fresh entitlement before accepting an answer or completing', async () => {
      const quiz = await generate();
      scope.assertCourse.mockRejectedValue(new ForbiddenException('Access revoked'));
      await expect(submit(quiz.quizId, 'p1')).rejects.toThrow('Access revoked');
      expire(quiz.quizId);
      await expect(complete(quiz.quizId)).rejects.toThrow('Access revoked');
      expect(prisma.problemAttempt.upsert).not.toHaveBeenCalled();
      expect(xp.recordXPEvent).not.toHaveBeenCalled();
    });

    it('checks scope before returning a cached completion', async () => {
      const quiz = await generate();
      await answerAll(quiz.quizId);
      await complete(quiz.quizId);
      scope.assertCourse.mockRejectedValue(new ForbiddenException('Access revoked'));
      await expect(complete(quiz.quizId)).rejects.toThrow('Access revoked');
      expect(xp.recordXPEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('submitQuizAnswer', () => {
    it('persists an answer and returns progress without feedback', async () => {
      const quiz = await generate();
      expect(await submit(quiz.quizId, 'p1')).toEqual({ answeredCount: 1, totalProblems: 3 });
      expect(prisma.problemAttempt.upsert).toHaveBeenCalledWith(expect.objectContaining({
        create: expect.objectContaining({ userId: 'user-1', problemId: 'p1', correct: true, xpAwarded: 0 }),
        update: {},
      }));
    });

    it('rejects an unknown quiz or unassigned problem', async () => {
      await expect(submit('unknown', 'p1')).rejects.toThrow(NotFoundException);
      const quiz = await generate();
      await expect(submit(quiz.quizId, 'unassigned')).rejects.toThrow(NotFoundException);
      expect(prisma.problemAttempt.upsert).not.toHaveBeenCalled();
    });

    it('replays the original acknowledgement after a later question is answered', async () => {
      const quiz = await generate();
      const original = await submit(quiz.quizId, 'p1');
      await submit(quiz.quizId, 'p2', true);
      expect(await submit(quiz.quizId, 'p1')).toEqual(original);
      expect(original).toEqual({ answeredCount: 1, totalProblems: 3 });
      expect(prisma.problemAttempt.upsert).toHaveBeenCalledTimes(2);
    });

    it('rejects a changed answer to an answered question', async () => {
      const quiz = await generate();
      await submit(quiz.quizId, 'p1');
      await expect(submit(quiz.quizId, 'p1', '1')).rejects.toThrow('Problem already answered with a different answer');
      expect(prisma.problemAttempt.upsert).toHaveBeenCalledTimes(1);
    });

    it('acknowledges concurrent same-answer submissions with one stored attempt', async () => {
      const quiz = await generate();
      const results = await Promise.all([submit(quiz.quizId, 'p1'), submit(quiz.quizId, 'p1')]);
      expect(results).toEqual([
        { answeredCount: 1, totalProblems: 3 },
        { answeredCount: 1, totalProblems: 3 },
      ]);
      expect(prisma.problemAttempt.upsert).toHaveBeenCalledTimes(1);
      expect(session(quiz.quizId).answers).toHaveLength(1);
    });

    it('rejects the changed answer in concurrent submissions', async () => {
      const quiz = await generate();
      const results = await Promise.allSettled([submit(quiz.quizId, 'p1'), submit(quiz.quizId, 'p1', '1')]);
      expect(results.map((result) => result.status)).toEqual(['fulfilled', 'rejected']);
      expect(prisma.problemAttempt.upsert).toHaveBeenCalledTimes(1);
    });

    it('compares structured answers by value and rejects changes', async () => {
      const quiz = await generate();
      const original = await submit(quiz.quizId, 'p1', { left: 'right', up: 'down' });
      expect(await submit(quiz.quizId, 'p1', { up: 'down', left: 'right' })).toEqual(original);
      await expect(submit(quiz.quizId, 'p1', { up: 'left', left: 'right' }))
        .rejects.toThrow('Problem already answered with a different answer');
      expect(prisma.problemAttempt.upsert).toHaveBeenCalledTimes(1);
    });

    it('allows retry after failed persistence without inventing an answer', async () => {
      const quiz = await generate();
      prisma.problemAttempt.upsert.mockRejectedValueOnce(new Error('Database unavailable'));
      await expect(submit(quiz.quizId, 'p1')).rejects.toThrow('Database unavailable');
      expect(session(quiz.quizId).answers).toHaveLength(0);
      expect(await submit(quiz.quizId, 'p1')).toEqual({ answeredCount: 1, totalProblems: 3 });
      const [first, retry] = prisma.problemAttempt.upsert.mock.calls;
      expect(retry[0].where.id).toBe(first[0].where.id);
    });

    it('uses the first persisted answer after an ambiguous database failure', async () => {
      const quiz = await generate();
      let stored: any;
      prisma.problemAttempt.upsert
        .mockImplementationOnce(async ({ create }: any) => {
          stored = create;
          throw new Error('Response lost after commit');
        })
        .mockImplementationOnce(async () => stored);
      await expect(submit(quiz.quizId, 'p1', 'wrong')).rejects.toThrow('Response lost after commit');
      await expect(submit(quiz.quizId, 'p1', '0')).rejects.toThrow('Problem already answered with a different answer');
      expect(session(quiz.quizId).answers[0].correct).toBe(false);
      expect(await submit(quiz.quizId, 'p1', 'wrong')).toEqual({ answeredCount: 1, totalProblems: 3 });
      expect(prisma.problemAttempt.upsert).toHaveBeenCalledTimes(2);
    });

    it('rejects an answer at the expiry boundary', async () => {
      const quiz = await generate();
      expire(quiz.quizId);
      await expect(submit(quiz.quizId, 'p1')).rejects.toThrow('Quiz time has expired');
      expect(prisma.problemAttempt.upsert).not.toHaveBeenCalled();
    });

    it('replays a saved answer after expiry', async () => {
      const quiz = await generate();
      const original = await submit(quiz.quizId, 'p1');
      expire(quiz.quizId);
      expect(await submit(quiz.quizId, 'p1')).toEqual(original);
      await expect(submit(quiz.quizId, 'p1', '1')).rejects.toThrow('Problem already answered with a different answer');
      expect(prisma.problemAttempt.upsert).toHaveBeenCalledTimes(1);
    });

    it('replays a saved answer after completion and rejects a changed answer', async () => {
      const quiz = await generate();
      await answerAll(quiz.quizId);
      await complete(quiz.quizId);
      expect(await submit(quiz.quizId, 'p1')).toEqual({ answeredCount: 1, totalProblems: 3 });
      await expect(submit(quiz.quizId, 'p1', '1')).rejects.toThrow('Problem already answered with a different answer');
      expect(prisma.problemAttempt.upsert).toHaveBeenCalledTimes(3);
    });

    it('rejects a new answer after an expired quiz has completed', async () => {
      const quiz = await generate();
      expire(quiz.quizId);
      await complete(quiz.quizId);
      await expect(submit(quiz.quizId, 'p1')).rejects.toThrow('Quiz is already complete');
    });

    it.each([-1, NaN, Infinity, 1.5])('rejects invalid response time %s', async (responseTimeMs) => {
      const quiz = await generate();
      await expect(service.submitQuizAnswer('org-1', 'user-1', 'course-1', quiz.quizId, 'p1', '0', responseTimeMs))
        .rejects.toThrow(BadRequestException);
      expect(prisma.problemAttempt.upsert).not.toHaveBeenCalled();
    });
  });

  describe('completeQuiz', () => {
    it('requires every assigned answer before expiry', async () => {
      const quiz = await generate();
      await submit(quiz.quizId, 'p1');
      await expect(complete(quiz.quizId)).rejects.toThrow('Answer every quiz question before completing');
      expect(session(quiz.quizId).isComplete).toBe(false);
      expect(xp.recordXPEvent).not.toHaveBeenCalled();
      expect(studentState.markConceptsNeedsReview).not.toHaveBeenCalled();
      await submit(quiz.quizId, 'p2', true);
      await submit(quiz.quizId, 'p3', '42');
      expect((await complete(quiz.quizId)).score).toBe(1);
    });

    it('returns a perfect result with no remediation for all correct answers', async () => {
      const quiz = await generate();
      await answerAll(quiz.quizId);
      const result = await complete(quiz.quizId);
      expect(result).toMatchObject({ score: 1, correctCount: 3, totalCount: 3, xpAwarded: 20, failedConcepts: [] });
      expect(result.results).toEqual(problems.map((problem) => ({ problemId: problem.id, correct: true, feedback: 'Correct!' })));
      expect(remediation.createRemediation).not.toHaveBeenCalled();
      expect(studentState.markConceptsNeedsReview).not.toHaveBeenCalled();
      expect(xp.recordXPEvent).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-1', academyId: 'academy-1', courseId: 'course-1',
        source: 'quiz', idempotencyKey: `quiz:${quiz.quizId}`,
      }));
    });

    it('scores unanswered questions as incorrect on expiry and creates remediation', async () => {
      const quiz = await generate();
      await submit(quiz.quizId, 'p1');
      expire(quiz.quizId);
      const result = await complete(quiz.quizId);
      expect(result).toMatchObject({ score: 1 / 3, correctCount: 1, totalCount: 3, failedConcepts: ['c2', 'c3'] });
      expect(result.conceptBreakdown).toEqual({ c1: { correct: 1, total: 1 }, c2: { correct: 0, total: 1 }, c3: { correct: 0, total: 1 } });
      expect(result.results).toHaveLength(3);
      expect(result.results[1]).toMatchObject({ problemId: 'p2', correct: false, feedback: 'Unanswered. Exp2' });
      expect(studentState.markConceptsNeedsReview).toHaveBeenCalledWith('user-1', ['c2', 'c3']);
      expect(remediation.createRemediation.mock.calls).toEqual([
        ['user-1', 'academy-1', 'c2', 'c2', 'course-1'],
        ['user-1', 'academy-1', 'c3', 'c3', 'course-1'],
      ]);
    });

    it('scores a fully unanswered expired quiz as zero', async () => {
      const quiz = await generate();
      expire(quiz.quizId);
      const result = await complete(quiz.quizId);
      expect(result).toMatchObject({ score: 0, correctCount: 0, totalCount: 3, failedConcepts: ['c1', 'c2', 'c3'] });
      expect(result.xpAwarded).toBe(0);
      expect(xp.recordXPEvent).not.toHaveBeenCalled();
      expect(remediation.createRemediation).toHaveBeenCalledTimes(3);
    });

    it('replays sequential and concurrent completions without repeated effects', async () => {
      const quiz = await generate();
      await answerAll(quiz.quizId, false);
      const results = await Promise.all([complete(quiz.quizId), complete(quiz.quizId)]);
      expect(await complete(quiz.quizId)).toEqual(results[0]);
      expect(results[0]).toEqual(results[1]);
      expect(xp.recordXPEvent).toHaveBeenCalledTimes(1);
      expect(studentState.markConceptsNeedsReview).toHaveBeenCalledTimes(1);
      expect(remediation.createRemediation).toHaveBeenCalledTimes(3);
    });

    it('waits for an in-flight final answer before completing', async () => {
      const quiz = await generate();
      await submit(quiz.quizId, 'p1');
      await submit(quiz.quizId, 'p2', true);
      const [answerResult, result] = await Promise.all([submit(quiz.quizId, 'p3', '42'), complete(quiz.quizId)]);
      expect(answerResult.answeredCount).toBe(3);
      expect(result.score).toBe(1);
      expect(xp.recordXPEvent).toHaveBeenCalledTimes(1);
    });

    it('retries failed remediation without repeating earlier completed phases', async () => {
      const quiz = await generate();
      await answerAll(quiz.quizId, false);
      remediation.createRemediation.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('Remediation failed'));
      await expect(complete(quiz.quizId)).rejects.toThrow('Remediation failed');
      expect(xp.recordXPEvent).not.toHaveBeenCalled();
      expect(session(quiz.quizId).result).toBeUndefined();
      await complete(quiz.quizId);
      expect(studentState.markConceptsNeedsReview).toHaveBeenCalledTimes(1);
      expect(remediation.createRemediation.mock.calls.map((call: any[]) => call[2])).toEqual(['c1', 'c2', 'c2', 'c3']);
      expect(xp.recordXPEvent).toHaveBeenCalledTimes(1);
    });

    it('retries failed XP with the same idempotency key and retains zero capped XP', async () => {
      const quiz = await generate();
      await answerAll(quiz.quizId, false);
      xp.recordXPEvent.mockRejectedValueOnce(new Error('XP failed')).mockResolvedValueOnce({ amount: 0 });
      await expect(complete(quiz.quizId)).rejects.toThrow('XP failed');
      expect((await complete(quiz.quizId)).xpAwarded).toBe(0);
      expect((await complete(quiz.quizId)).xpAwarded).toBe(0);
      expect(xp.recordXPEvent).toHaveBeenCalledTimes(2);
      expect(xp.recordXPEvent.mock.calls[0]).toEqual(xp.recordXPEvent.mock.calls[1]);
      expect(remediation.createRemediation).toHaveBeenCalledTimes(3);
    });

    it('rejects completion of an unknown quiz', async () => {
      await expect(complete('unknown')).rejects.toThrow(NotFoundException);
    });
  });
});
