import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ExamSessionStatus, SectionMasteryState } from '@prisma/client';
import { SectionExamService } from './section-exam.service';

describe('SectionExamService', () => {
  function createHarness() {
    const session = {
      id: 'session-1',
      userId: 'user-1',
      courseId: 'course-1',
      sectionId: 'section-1',
      status: ExamSessionStatus.in_progress as ExamSessionStatus,
      score: null as number | null,
      passed: null as boolean | null,
      startedAt: new Date(),
      timeLimitMs: 60_000,
      section: { sortOrder: 1, sectionExamConfig: { enabled: true, passingScore: 0.75 } },
      questions: [0, 1, 2].map((index) => ({
        id: `question-${index + 1}`,
        problemId: `problem-${index + 1}`,
        conceptId: 'concept-1',
        concept: { id: 'concept-1', name: 'Concept' },
        response: index === 0 ? 'A' : null as string | null,
        correct: index === 0 ? true : null as boolean | null,
        problem: {
          type: 'multiple_choice',
          correctAnswer: 'A',
          explanation: null,
          options: ['A', 'B'],
        },
      })),
    };
    const prisma = {
      sectionExamSession: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockImplementation(({ include }) => {
          const problemId = include?.questions?.where?.problemId;
          return Promise.resolve({
            ...session,
            questions: problemId
              ? session.questions.filter((question) => question.problemId === problemId)
              : session.questions,
          });
        }),
        update: jest.fn().mockImplementation(({ data }) => {
          Object.assign(session, data);
          return Promise.resolve(session);
        }),
      },
      sectionExamQuestion: {
        findMany: jest.fn().mockImplementation(() => Promise.resolve(session.questions)),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const question = session.questions.find((item) => item.id === where.id)!;
          Object.assign(question, data);
          return Promise.resolve(question);
        }),
      },
      problemAttempt: { create: jest.fn().mockResolvedValue({}) },
      studentSectionState: {
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      courseSection: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((callback) => callback(prisma));
    const scope = { assertSection: jest.fn().mockResolvedValue({ academyId: 'academy-1' }) };
    const studentState = { markConceptsNeedsReview: jest.fn().mockResolvedValue(undefined) };
    const xp = { recordXPEvent: jest.fn().mockResolvedValue({ amount: 23 }) };
    const service = new SectionExamService(prisma as any, xp as any, studentState as any, scope as any);
    jest.spyOn(service, 'syncSectionStates').mockResolvedValue([] as any);
    const complete = () => service.completeExam('org-1', 'user-1', 'course-1', 'section-1', 'session-1');
    const answer = (problemId = 'problem-2', value: unknown = 'A') =>
      service.submitAnswer('org-1', 'user-1', 'course-1', 'section-1', 'session-1', problemId, value, 3000);
    return { session, prisma, scope, studentState, xp, service, complete, answer };
  }

  it('rejects incomplete exams before expiry without certification or XP', async () => {
    const { complete, prisma, xp, studentState } = createHarness();
    await expect(complete()).rejects.toThrow('Answer every assigned question');
    expect(prisma.sectionExamSession.update).not.toHaveBeenCalled();
    expect(prisma.studentSectionState.update).not.toHaveBeenCalled();
    expect(studentState.markConceptsNeedsReview).not.toHaveBeenCalled();
    expect(xp.recordXPEvent).not.toHaveBeenCalled();
  });

  it('counts unanswered questions as incorrect when an exam expires', async () => {
    const { complete, session, prisma, studentState } = createHarness();
    session.startedAt = new Date(Date.now() - 61_000);
    const result = await complete();
    expect(result).toMatchObject({ passed: false, score: 1 / 3, correctCount: 1, totalCount: 3 });
    expect(session.status).toBe(ExamSessionStatus.expired);
    expect(prisma.studentSectionState.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: SectionMasteryState.needs_review },
    }));
    expect(studentState.markConceptsNeedsReview).toHaveBeenCalledWith('user-1', ['concept-1'], prisma);
  });

  it('completes a full exam and replays its persisted result using a stable XP key', async () => {
    const { complete, session, prisma, xp } = createHarness();
    session.questions.forEach((question) => { question.response = 'A'; question.correct = true; });
    const result = await complete();
    session.section.sectionExamConfig.passingScore = 1.1;
    const replay = await complete();
    expect(result).toMatchObject({ passed: true, score: 1, xpAwarded: 23, alreadyCompleted: false });
    expect(replay).toMatchObject({ passed: true, score: 1, xpAwarded: 23, alreadyCompleted: true });
    expect(prisma.sectionExamSession.update).toHaveBeenCalledTimes(1);
    expect(prisma.studentSectionState.update).toHaveBeenCalledTimes(1);
    expect(xp.recordXPEvent).toHaveBeenLastCalledWith(expect.objectContaining({
      userId: 'user-1', courseId: 'course-1', idempotencyKey: 'section-exam:session-1',
    }));
    expect(prisma.sectionExamSession.updateMany).toHaveBeenCalledWith({
      where: { id: 'session-1', userId: 'user-1', courseId: 'course-1', sectionId: 'section-1', status: ExamSessionStatus.in_progress },
      data: { updatedAt: expect.any(Date) },
    });
  });

  it('retries a failed XP write after the exam result has been persisted', async () => {
    const { complete, session, prisma, xp } = createHarness();
    session.questions.forEach((question) => { question.response = 'A'; question.correct = true; });
    xp.recordXPEvent.mockRejectedValueOnce(new Error('Temporary database failure'));
    await expect(complete()).rejects.toThrow('Temporary database failure');
    await expect(complete()).resolves.toMatchObject({ passed: true, xpAwarded: 23, alreadyCompleted: true });
    expect(prisma.sectionExamSession.update).toHaveBeenCalledTimes(1);
  });

  it.each(['userId', 'courseId', 'sectionId'] as const)('rejects an exam session from a different %s', async (field) => {
    const { answer, complete, session, prisma, xp } = createHarness();
    session[field] = 'another-owner';
    await expect(answer()).rejects.toBeInstanceOf(NotFoundException);
    await expect(complete()).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.sectionExamQuestion.update).not.toHaveBeenCalled();
    expect(prisma.studentSectionState.update).not.toHaveBeenCalled();
    expect(xp.recordXPEvent).not.toHaveBeenCalled();
  });

  it('checks org, enrollment and section access before loading or mutating a session', async () => {
    const { service, answer, complete, scope, prisma } = createHarness();
    scope.assertSection.mockRejectedValue(new NotFoundException('Section not found'));
    await expect(answer()).rejects.toBeInstanceOf(NotFoundException);
    await expect(complete()).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.startExam('org-1', 'user-1', 'course-1', 'section-1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.getExamStatus('org-1', 'user-1', 'course-1', 'section-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(scope.assertSection).toHaveBeenCalledWith('org-1', 'user-1', 'course-1', 'section-1');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('records an answer once and accepts an identical retry without another attempt', async () => {
    const { answer, prisma, session } = createHarness();
    await expect(answer()).resolves.toEqual({ answeredCount: 2, totalProblems: 3 });
    session.status = ExamSessionStatus.completed;
    await expect(answer()).resolves.toEqual({ answeredCount: 2, totalProblems: 3 });
    expect(prisma.sectionExamQuestion.update).toHaveBeenCalledTimes(1);
    expect(prisma.problemAttempt.create).toHaveBeenCalledTimes(1);
  });

  it('rejects attempts to change an answer and problems outside the assigned exam', async () => {
    const { answer, prisma } = createHarness();
    await expect(answer('problem-1', 'B')).rejects.toThrow('Problem already answered');
    await expect(answer('outside-problem')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.problemAttempt.create).not.toHaveBeenCalled();
  });

  it('rejects expired, completed and null submissions without recording attempts', async () => {
    const { answer, session, prisma } = createHarness();
    await expect(answer('problem-2', null)).rejects.toBeInstanceOf(BadRequestException);
    session.startedAt = new Date(Date.now() - 61_000);
    await expect(answer()).rejects.toThrow('time has expired');
    session.status = ExamSessionStatus.completed;
    await expect(answer()).rejects.toThrow('already complete');
    expect(prisma.problemAttempt.create).not.toHaveBeenCalled();
  });

  it('resolves blueprint concept references by slug when starting an exam', async () => {
    const prisma = {
      courseSection: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'section-1',
          sectionExamConfig: {
            enabled: true,
            questionCount: 2,
            blueprint: [{ conceptId: 'entities', minQuestions: 1 }],
          },
          concepts: [
            {
              id: 'concept-1',
              slug: 'entities',
              name: 'Entities',
              knowledgePoints: [
                {
                  problems: [
                    {
                      id: 'problem-1',
                      type: 'multiple_choice',
                      questionText: 'Q1',
                      options: ['A', 'B'],
                      correctAnswer: 'A',
                      explanation: null,
                      isReviewVariant: true,
                      difficulty: 1,
                    },
                  ],
                },
              ],
            },
            {
              id: 'concept-2',
              slug: 'attributes',
              name: 'Attributes',
              knowledgePoints: [
                {
                  problems: [
                    {
                      id: 'problem-2',
                      type: 'multiple_choice',
                      questionText: 'Q2',
                      options: ['A', 'B'],
                      correctAnswer: 'B',
                      explanation: null,
                      isReviewVariant: false,
                      difficulty: 1,
                    },
                  ],
                },
              ],
            },
          ],
        }),
      },
      studentSectionState: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'state-1',
          status: SectionMasteryState.exam_ready,
          attempts: 0,
        }),
      },
      sectionExamSession: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn(),
    };

    const tx = {
      sectionExamSession: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'session-1' }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'session-1',
          sectionId: 'section-1',
          startedAt: new Date(),
          timeLimitMs: 12 * 60 * 1000,
          questions: [
            {
              id: 'question-1',
              problemId: 'problem-1',
              conceptId: 'concept-1',
              response: null,
              problem: {
                id: 'problem-1',
                type: 'multiple_choice',
                questionText: 'Q1',
                options: ['A', 'B'],
                correctAnswer: 'A',
                explanation: null,
              },
            },
            {
              id: 'question-2',
              problemId: 'problem-2',
              conceptId: 'concept-2',
              response: null,
              problem: {
                id: 'problem-2',
                type: 'multiple_choice',
                questionText: 'Q2',
                options: ['A', 'B'],
                correctAnswer: 'B',
                explanation: null,
              },
            },
          ],
        }),
      },
      sectionExamQuestion: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      studentSectionState: {
        update: jest.fn().mockResolvedValue({ status: SectionMasteryState.exam_ready, attempts: 0 }),
      },
    };

    prisma.$transaction.mockImplementation((callback: any) => callback(tx));

    const xpService = {
      recordXPEvent: jest.fn(),
    };

    const mockStudentState = {
      getConceptMasteryForIds: jest.fn().mockResolvedValue(new Map()),
      markConceptsNeedsReview: jest.fn().mockResolvedValue(undefined),
    };
    const scope = { assertSection: jest.fn().mockResolvedValue({ academyId: 'academy-1' }) };
    const service = new SectionExamService(prisma as any, xpService as any, mockStudentState as any, scope as any);
    jest.spyOn(service, 'syncSectionStates').mockResolvedValue([] as any);

    const result = await service.startExam('org-1', 'user-1', 'course-1', 'section-1');

    expect(tx.sectionExamQuestion.createMany).toHaveBeenCalledWith({
      data: [
        {
          sessionId: 'session-1',
          problemId: 'problem-1',
          conceptId: 'concept-1',
          sortOrder: 0,
        },
        {
          sessionId: 'session-1',
          problemId: 'problem-2',
          conceptId: 'concept-2',
          sortOrder: 1,
        },
      ],
    });
    expect(result.sessionId).toBe('session-1');
    expect(result.answeredProblemIds).toEqual([]);
    expect(result.expiresAt).toEqual(expect.any(String));
    expect(scope.assertSection).toHaveBeenCalledWith('org-1', 'user-1', 'course-1', 'section-1');

    // A start request that lost the race finds the existing session after it
    // locks the section state, even when its earlier lookup found no session.
    const existingSession = await tx.sectionExamSession.findUniqueOrThrow.mock.results[0].value;
    existingSession.questions[0].response = 'A';
    tx.sectionExamSession.findFirst.mockResolvedValue(existingSession);
    const resumed = await service.startExam('org-1', 'user-1', 'course-1', 'section-1');
    expect(resumed.sessionId).toBe(result.sessionId);
    expect(resumed.answeredProblemIds).toEqual(['problem-1']);
    expect(resumed.expiresAt).toBe(result.expiresAt);
    expect(tx.sectionExamSession.create).toHaveBeenCalledTimes(1);
    expect(tx.sectionExamQuestion.createMany).toHaveBeenCalledTimes(1);
  });
});
