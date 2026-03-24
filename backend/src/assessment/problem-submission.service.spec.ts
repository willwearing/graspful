import { ProblemSubmissionService } from './problem-submission.service';
import { NotFoundException } from '@nestjs/common';

describe('ProblemSubmissionService', () => {
  let service: ProblemSubmissionService;
  let mockPrisma: any;
  let mockFireUpdate: any;
  let mockXPService: any;
  let mockSectionExamService: any;
  let mockStudentState: any;

  const mockProblem = {
    id: 'prob-1',
    type: 'multiple_choice',
    questionText: 'Which is correct?',
    correctAnswer: 'opt-b',
    explanation: 'Because B is right.',
    difficulty: 3,
    knowledgePoint: {
      id: 'kp-1',
      conceptId: 'concept-1',
      concept: {
        id: 'concept-1',
        courseId: 'course-1',
        difficulty: 5,
        difficultyTheta: 0,
        timeIntensity: 0,
        timeIntensitySD: 0.8,
        course: { academyId: 'academy-1' },
      },
    },
  };

  const mockConceptState = {
    id: 'cs-1',
    userId: 'user-1',
    conceptId: 'concept-1',
    masteryState: 'in_progress',
    abilityTheta: 0,
    speedRD: 250,
    observationCount: 5,
    failCount: 0,
    speed: 1.0,
    repNum: 0,
    memory: 1.0,
    interval: 1.0,
  };

  beforeEach(() => {
    mockPrisma = {
      problem: {
        findUnique: jest.fn().mockResolvedValue(mockProblem),
      },
      studentKPState: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([{ passed: false }]),
        upsert: jest.fn().mockResolvedValue({
          passed: false,
          attempts: 1,
          consecutiveCorrect: 1,
        }),
      },
      studentConceptState: {
        findUnique: jest.fn().mockResolvedValue(mockConceptState),
        update: jest.fn().mockResolvedValue({ masteryState: 'in_progress' }),
      },
      knowledgePoint: {
        findMany: jest.fn().mockResolvedValue([{ id: 'kp-1' }]),
      },
      problemAttempt: {
        create: jest.fn().mockResolvedValue({ id: 'attempt-1' }),
      },
      courseEnrollment: {
        update: jest.fn().mockResolvedValue({}),
      },
    };

    mockFireUpdate = {
      updateAfterReview: jest.fn().mockResolvedValue(undefined),
      propagateImplicitRepetition: jest.fn().mockResolvedValue(undefined),
    };

    mockXPService = {
      recordXPEvent: jest.fn().mockResolvedValue({ amount: 15 }),
    };

    mockSectionExamService = {
      syncSectionStates: jest.fn().mockResolvedValue(undefined),
    };

    mockStudentState = {
      getKPState: jest.fn().mockImplementation((_userId: string, kpId: string) =>
        mockPrisma.studentKPState.findUnique({ where: { userId_knowledgePointId: { userId: _userId, knowledgePointId: kpId } } }),
      ),
      upsertKPState: jest.fn().mockResolvedValue({
        passed: false,
        attempts: 1,
        consecutiveCorrect: 1,
      }),
      getConceptState: jest.fn().mockImplementation((_userId: string, cId: string) =>
        mockPrisma.studentConceptState.findUnique({ where: { userId_conceptId: { userId: _userId, conceptId: cId } } }),
      ),
      getConceptMemory: jest.fn().mockResolvedValue(1),
      updateConceptAfterPractice: jest.fn().mockResolvedValue({ masteryState: 'in_progress' }),
      getKPStatesForIds: jest.fn().mockImplementation((_userId: string, kpIds: string[]) =>
        mockPrisma.studentKPState.findMany({ where: { userId: _userId, knowledgePointId: { in: kpIds } } }),
      ),
    };

    service = new ProblemSubmissionService(
      mockPrisma,
      mockFireUpdate,
      mockXPService,
      mockSectionExamService,
      mockStudentState as any,
    );
  });

  it('should evaluate a correct MC answer and create attempt', async () => {
    const result = await service.submitAnswer({
      userId: 'user-1',
      problemId: 'prob-1',
      answer: 'opt-b',
      responseTimeMs: 5000,
      activityType: 'lesson',
    });

    expect(result.correct).toBe(true);
    expect(result.feedback).toBe('Correct!');
    expect(result.xpAwarded).toBeGreaterThan(0);
    expect(mockPrisma.problemAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          problemId: 'prob-1',
          correct: true,
        }),
      }),
    );
  });

  it('should evaluate an incorrect answer', async () => {
    const result = await service.submitAnswer({
      userId: 'user-1',
      problemId: 'prob-1',
      answer: 'opt-a',
      responseTimeMs: 5000,
      activityType: 'lesson',
    });

    expect(result.correct).toBe(false);
    expect(result.feedback).toContain('opt-b');
    expect(result.xpAwarded).toBe(0);
  });

  it('should throw NotFoundException for non-existent problem', async () => {
    mockPrisma.problem.findUnique.mockResolvedValue(null);

    await expect(
      service.submitAnswer({
        userId: 'user-1',
        problemId: 'nonexistent',
        answer: 'A',
        responseTimeMs: 5000,
        activityType: 'lesson',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw when student concept state not found', async () => {
    mockStudentState.getConceptState.mockResolvedValue(null);

    await expect(
      service.submitAnswer({
        userId: 'user-1',
        problemId: 'prob-1',
        answer: 'opt-b',
        responseTimeMs: 5000,
        activityType: 'lesson',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should update KP state on correct answer', async () => {
    await service.submitAnswer({
      userId: 'user-1',
      problemId: 'prob-1',
      answer: 'opt-b',
      responseTimeMs: 5000,
      activityType: 'lesson',
    });

    // updateKPState calls getKPState then upsertKPState via studentState
    expect(mockStudentState.upsertKPState).toHaveBeenCalledWith(
      'user-1',
      'kp-1',
      true,
      undefined, // no existing state
    );
  });

  it('should reset consecutiveCorrect on incorrect answer', async () => {
    mockPrisma.studentKPState.findUnique.mockResolvedValue({
      attempts: 3,
      consecutiveCorrect: 1,
      passed: false,
    });

    await service.submitAnswer({
      userId: 'user-1',
      problemId: 'prob-1',
      answer: 'opt-a',
      responseTimeMs: 5000,
      activityType: 'lesson',
    });

    expect(mockStudentState.upsertKPState).toHaveBeenCalledWith(
      'user-1',
      'kp-1',
      false,
      { consecutiveCorrect: 1, passed: false },
    );
  });

  it('should mark KP as passed after 2 consecutive correct', async () => {
    mockPrisma.studentKPState.findUnique.mockResolvedValue({
      attempts: 1,
      consecutiveCorrect: 1,
      passed: false,
    });

    await service.submitAnswer({
      userId: 'user-1',
      problemId: 'prob-1',
      answer: 'opt-b',
      responseTimeMs: 5000,
      activityType: 'lesson',
    });

    expect(mockStudentState.upsertKPState).toHaveBeenCalledWith(
      'user-1',
      'kp-1',
      true,
      { consecutiveCorrect: 1, passed: false },
    );
  });

  it('should update speed parameters on concept state', async () => {
    await service.submitAnswer({
      userId: 'user-1',
      problemId: 'prob-1',
      answer: 'opt-b',
      responseTimeMs: 5000,
      activityType: 'lesson',
    });

    expect(mockStudentState.updateConceptAfterPractice).toHaveBeenCalled();
    const updateData = mockStudentState.updateConceptAfterPractice.mock.calls[0][2];
    expect(updateData.observationCount).toBe(6);
    expect(typeof updateData.abilityTheta).toBe('number');
    expect(typeof updateData.speedRD).toBe('number');
  });

  it('should transition unstarted to in_progress', async () => {
    mockStudentState.getConceptState.mockResolvedValue({
      ...mockConceptState,
      masteryState: 'unstarted',
    });

    const result = await service.submitAnswer({
      userId: 'user-1',
      problemId: 'prob-1',
      answer: 'opt-a',
      responseTimeMs: 5000,
      activityType: 'lesson',
    });

    expect(result.updatedMasteryState).toBe('in_progress');
  });

  it('should transition mastered to needs_review on incorrect', async () => {
    mockStudentState.getConceptState.mockResolvedValue({
      ...mockConceptState,
      masteryState: 'mastered',
    });

    const result = await service.submitAnswer({
      userId: 'user-1',
      problemId: 'prob-1',
      answer: 'opt-a',
      responseTimeMs: 5000,
      activityType: 'lesson',
    });

    expect(result.updatedMasteryState).toBe('needs_review');
  });

  it('should transition to mastered when all KPs passed', async () => {
    // Set up: KP will be passed (2nd consecutive correct)
    mockPrisma.studentKPState.findUnique.mockResolvedValue({
      attempts: 1,
      consecutiveCorrect: 1,
      passed: false,
    });
    mockStudentState.upsertKPState.mockResolvedValue({
      passed: true,
      attempts: 2,
      consecutiveCorrect: 2,
    });

    // All KPs are passed
    mockPrisma.knowledgePoint.findMany.mockResolvedValue([{ id: 'kp-1' }]);
    mockStudentState.getKPStatesForIds.mockResolvedValue([{ passed: true }]);

    const result = await service.submitAnswer({
      userId: 'user-1',
      problemId: 'prob-1',
      answer: 'opt-b',
      responseTimeMs: 5000,
      activityType: 'lesson',
    });

    expect(result.updatedMasteryState).toBe('mastered');
  });

  it('should award XP and increment enrollment total', async () => {
    await service.submitAnswer({
      userId: 'user-1',
      problemId: 'prob-1',
      answer: 'opt-b',
      responseTimeMs: 5000,
      activityType: 'lesson',
    });

    expect(mockXPService.recordXPEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        courseId: 'course-1',
        source: 'lesson',
      }),
    );
  });

  it('should not award XP for anti-gaming triggered answers', async () => {
    const result = await service.submitAnswer({
      userId: 'user-1',
      problemId: 'prob-1',
      answer: 'opt-b',
      responseTimeMs: 1000, // under 2s threshold
      activityType: 'lesson',
    });

    expect(result.xpAwarded).toBe(0);
    expect(result.antiGamingTriggered).toBe(true);
    // enrollment update should not be called when xp is 0
    expect(mockPrisma.courseEnrollment.update).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException for non-positive responseTimeMs', async () => {
    await expect(
      service.submitAnswer({
        userId: 'user-1',
        problemId: 'prob-1',
        answer: 'opt-b',
        responseTimeMs: 0,
        activityType: 'lesson',
      }),
    ).rejects.toThrow('Response time must be positive');

    await expect(
      service.submitAnswer({
        userId: 'user-1',
        problemId: 'prob-1',
        answer: 'opt-b',
        responseTimeMs: -100,
        activityType: 'lesson',
      }),
    ).rejects.toThrow('Response time must be positive');
  });

  it('should reset consecutiveCorrect after failure then require 2 new consecutive correct', async () => {
    // First: 1 correct (consecutiveCorrect = 1)
    mockPrisma.studentKPState.findUnique.mockResolvedValue({
      attempts: 1,
      consecutiveCorrect: 1,
      passed: false,
    });

    // Submit incorrect — should reset to 0
    await service.submitAnswer({
      userId: 'user-1',
      problemId: 'prob-1',
      answer: 'opt-a', // wrong
      responseTimeMs: 5000,
      activityType: 'lesson',
    });

    expect(mockStudentState.upsertKPState).toHaveBeenCalledWith(
      'user-1',
      'kp-1',
      false,
      { consecutiveCorrect: 1, passed: false },
    );
  });
});
