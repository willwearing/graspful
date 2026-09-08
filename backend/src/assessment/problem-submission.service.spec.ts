import { ProblemSubmissionService } from './problem-submission.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('ProblemSubmissionService', () => {
  let service: ProblemSubmissionService;
  let mockPrisma: any;
  let mockFireUpdate: any;
  let mockXPService: any;
  let mockSectionExamService: any;
  let mockStudentState: any;
  let mockScope: any;
  let savedAttempts: Map<string, any>;

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
    savedAttempts = new Map();
    mockPrisma = {
      problem: {
        findUnique: jest.fn().mockResolvedValue(mockProblem),
      },
      studentKPState: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockImplementation(({ select }: any) => {
          // The hint builder wants full KP state; checkAllKPsPassed only needs passed
          if (select?.knowledgePointId) {
            return Promise.resolve([
              { knowledgePointId: 'kp-1', passed: false, consecutiveCorrect: 0, attempts: 1 },
              { knowledgePointId: 'kp-2', passed: false, consecutiveCorrect: 0, attempts: 0 },
            ]);
          }
          return Promise.resolve([{ passed: false }]);
        }),
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
        findMany: jest.fn().mockImplementation(({ select }: any) => {
          // checkAllKPsPassed uses { id: true }, the hint builder wants problems
          if (select?.problems) {
            return Promise.resolve([
              {
                id: 'kp-1',
                sortOrder: 0,
                problems: [{ id: 'prob-1' }, { id: 'prob-1b' }],
              },
              {
                id: 'kp-2',
                sortOrder: 1,
                problems: [{ id: 'prob-2' }],
              },
            ]);
          }
          return Promise.resolve([{ id: 'kp-1' }]);
        }),
      },
      problemAttempt: {
        findUnique: jest.fn().mockImplementation(({ where }: any) => savedAttempts.get(where.id) ?? null),
        create: jest.fn().mockImplementation(({ data }: any) => {
          savedAttempts.set(data.id, data);
          return data;
        }),
        update: jest.fn().mockImplementation(({ where, data }: any) => {
          const updated = { ...savedAttempts.get(where.id), ...data };
          savedAttempts.set(where.id, updated);
          return updated;
        }),
      },
      courseEnrollment: {
        update: jest.fn().mockResolvedValue({}),
      },
    };

    mockPrisma.$transaction = jest.fn().mockImplementation(async (work: any) => {
      const before = new Map(savedAttempts);
      try { return await work(mockPrisma); }
      catch (error) { savedAttempts = before; throw error; }
    });

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

    const mockRemediationService = {
      createRemediation: jest.fn().mockResolvedValue({}),
      getActiveRemediations: jest.fn().mockResolvedValue([]),
      getBlockedConceptIds: jest.fn().mockResolvedValue(new Set()),
      getBlockedConceptIdsForCourse: jest.fn().mockResolvedValue(new Set()),
      resolveRemediationsForPrerequisite: jest.fn().mockResolvedValue({}),
    };

    mockScope = { assertConcept: jest.fn().mockResolvedValue({ academyId: 'academy-1' }) };
    service = new ProblemSubmissionService(
      mockPrisma,
      mockFireUpdate,
      mockXPService,
      mockSectionExamService,
      mockStudentState as any,
      mockRemediationService as any,
      mockScope,
    );
  });

  it('should evaluate a correct MC answer and create attempt', async () => {
    const result = await service.submitAnswer({
      orgId: 'org-1',
      courseId: 'course-1',
      conceptId: 'concept-1',
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
      orgId: 'org-1',
      courseId: 'course-1',
      conceptId: 'concept-1',
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
      orgId: 'org-1',
      courseId: 'course-1',
      conceptId: 'concept-1',
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
      orgId: 'org-1',
      courseId: 'course-1',
      conceptId: 'concept-1',
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
      orgId: 'org-1',
      courseId: 'course-1',
      conceptId: 'concept-1',
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
      expect.any(String), // sessionId
      mockPrisma,
    );
  });

  it('should reset consecutiveCorrect on incorrect answer', async () => {
    mockPrisma.studentKPState.findUnique.mockResolvedValue({
      attempts: 3,
      consecutiveCorrect: 1,
      passed: false,
    });

    await service.submitAnswer({
      orgId: 'org-1',
      courseId: 'course-1',
      conceptId: 'concept-1',
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
      expect.objectContaining({ consecutiveCorrect: 1, passed: false }),
      expect.any(String),
      mockPrisma,
    );
  });

  it('should mark KP as passed after 2 consecutive correct', async () => {
    mockPrisma.studentKPState.findUnique.mockResolvedValue({
      attempts: 1,
      consecutiveCorrect: 1,
      passed: false,
    });

    await service.submitAnswer({
      orgId: 'org-1',
      courseId: 'course-1',
      conceptId: 'concept-1',
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
      expect.objectContaining({ consecutiveCorrect: 1, passed: false }),
      expect.any(String),
      mockPrisma,
    );
  });

  it('should update speed parameters on concept state', async () => {
    await service.submitAnswer({
      orgId: 'org-1',
      courseId: 'course-1',
      conceptId: 'concept-1',
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
      orgId: 'org-1',
      courseId: 'course-1',
      conceptId: 'concept-1',
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
      orgId: 'org-1',
      courseId: 'course-1',
      conceptId: 'concept-1',
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
    mockPrisma.knowledgePoint.findMany.mockResolvedValue([{ id: 'kp-1', sortOrder: 0, problems: [{ id: 'prob-1' }] }]);
    mockStudentState.getKPStatesForIds.mockResolvedValue([{ passed: true }]);

    const result = await service.submitAnswer({
      orgId: 'org-1',
      courseId: 'course-1',
      conceptId: 'concept-1',
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
      orgId: 'org-1',
      courseId: 'course-1',
      conceptId: 'concept-1',
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
      mockPrisma,
    );
  });

  it('should not award XP for anti-gaming triggered answers', async () => {
    const result = await service.submitAnswer({
      orgId: 'org-1',
      courseId: 'course-1',
      conceptId: 'concept-1',
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
      orgId: 'org-1',
      courseId: 'course-1',
      conceptId: 'concept-1',
        userId: 'user-1',
        problemId: 'prob-1',
        answer: 'opt-b',
        responseTimeMs: 0,
        activityType: 'lesson',
      }),
    ).rejects.toThrow('Response time must be positive');

    await expect(
      service.submitAnswer({
      orgId: 'org-1',
      courseId: 'course-1',
      conceptId: 'concept-1',
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
      orgId: 'org-1',
      courseId: 'course-1',
      conceptId: 'concept-1',
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
      expect.objectContaining({ consecutiveCorrect: 1, passed: false }),
      expect.any(String),
      mockPrisma,
    );
  });

  describe('nextProblemHint (Slice 1 — KP-level more practice)', () => {
    it('should return a hint targeting the same KP after a wrong answer', async () => {
      const result = await service.submitAnswer({
      orgId: 'org-1',
      courseId: 'course-1',
      conceptId: 'concept-1',
        userId: 'user-1',
        problemId: 'prob-1',
        answer: 'opt-a', // wrong
        responseTimeMs: 5000,
        activityType: 'lesson',
        seenProblemIds: ['prob-1'],
      });

      expect(result.nextProblemHint).not.toBeNull();
      expect(result.nextProblemHint!.targetKPId).toBe('kp-1');
      expect(result.nextProblemHint!.nextProblemId).toBe('prob-1b');
      expect(result.nextProblemHint!.reopenWorkedExample).toBe(true);
      expect(result.nextProblemHint!.lessonComplete).toBe(false);
    });

    it('should not reopen worked example twice for the same KP', async () => {
      const result = await service.submitAnswer({
      orgId: 'org-1',
      courseId: 'course-1',
      conceptId: 'concept-1',
        userId: 'user-1',
        problemId: 'prob-1b',
        answer: 'opt-a',
        responseTimeMs: 5000,
        activityType: 'lesson',
        seenProblemIds: ['prob-1', 'prob-1b'],
        workedExampleReopenedKPIds: ['kp-1'],
      });

      expect(result.nextProblemHint!.reopenWorkedExample).toBe(false);
    });

    it('should not compute a hint for non-lesson activity types', async () => {
      const result = await service.submitAnswer({
      orgId: 'org-1',
      courseId: 'course-1',
      conceptId: 'concept-1',
        userId: 'user-1',
        problemId: 'prob-1',
        answer: 'opt-b',
        responseTimeMs: 5000,
        activityType: 'review',
      });

      expect(result.nextProblemHint).toBeNull();
    });

    it('should advance to next KP when current KP passes (2 consecutive correct)', async () => {
      // Simulate kp-1 now passed
      mockPrisma.studentKPState.findMany.mockImplementation(({ select }: any) => {
        if (select?.knowledgePointId) {
          return Promise.resolve([
            { knowledgePointId: 'kp-1', passed: true, consecutiveCorrect: 2, attempts: 2 },
            { knowledgePointId: 'kp-2', passed: false, consecutiveCorrect: 0, attempts: 0 },
          ]);
        }
        return Promise.resolve([{ passed: false }]);
      });

      const result = await service.submitAnswer({
      orgId: 'org-1',
      courseId: 'course-1',
      conceptId: 'concept-1',
        userId: 'user-1',
        problemId: 'prob-1',
        answer: 'opt-b',
        responseTimeMs: 5000,
        activityType: 'lesson',
        seenProblemIds: ['prob-1'],
      });

      expect(result.nextProblemHint!.targetKPId).toBe('kp-2');
      expect(result.nextProblemHint!.nextProblemId).toBe('prob-2');
    });

    it('should signal lessonComplete when all KPs are passed', async () => {
      mockPrisma.studentKPState.findMany.mockImplementation(({ select }: any) => {
        if (select?.knowledgePointId) {
          return Promise.resolve([
            { knowledgePointId: 'kp-1', passed: true, consecutiveCorrect: 2, attempts: 2 },
            { knowledgePointId: 'kp-2', passed: true, consecutiveCorrect: 2, attempts: 2 },
          ]);
        }
        return Promise.resolve([{ passed: true }, { passed: true }]);
      });

      // Simulate practice on kp-2 -> correct -> advance past last KP
      const correctProblem = {
        ...mockProblem,
        knowledgePoint: {
          ...mockProblem.knowledgePoint,
          id: 'kp-2',
        },
      };
      mockPrisma.problem.findUnique.mockResolvedValueOnce(correctProblem);

      const result = await service.submitAnswer({
      orgId: 'org-1',
      courseId: 'course-1',
      conceptId: 'concept-1',
        userId: 'user-1',
        problemId: 'prob-2',
        answer: 'opt-b',
        responseTimeMs: 5000,
        activityType: 'lesson',
        seenProblemIds: ['prob-1', 'prob-2'],
      });

      expect(result.nextProblemHint!.lessonComplete).toBe(true);
      expect(result.nextProblemHint!.nextProblemId).toBeNull();
    });
  });

  describe('lesson and review scope', () => {
    const input = {
      userId: 'user-1', orgId: 'org-1', courseId: 'course-1', conceptId: 'concept-1',
      problemId: 'prob-1', answer: 'opt-b', responseTimeMs: 5000, activityType: 'lesson' as const,
    };

    it.each(['conceptId', 'courseId'] as const)('rejects a problem outside the route %s before writing an attempt', async (field) => {
      await expect(service.submitAnswer({ ...input, [field]: 'unrelated' })).rejects.toThrow(NotFoundException);
      expect(mockPrisma.problemAttempt.create).not.toHaveBeenCalled();
      expect(mockStudentState.upsertKPState).not.toHaveBeenCalled();
    });

    it('rejects absent enrollment before writing an attempt', async () => {
      mockStudentState.getConceptState.mockResolvedValue(null);
      await expect(service.submitAnswer(input)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.problemAttempt.create).not.toHaveBeenCalled();
    });

    it('rejects denied organization scope before loading the problem', async () => {
      mockScope.assertConcept.mockRejectedValue(new NotFoundException());
      await expect(service.submitAnswer(input)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.problem.findUnique).not.toHaveBeenCalled();
    });

    it('does not promote mastery from a single answer during a review', async () => {
      mockStudentState.getConceptState.mockResolvedValue({ ...mockConceptState, masteryState: 'needs_review' });
      mockStudentState.getKPStatesForIds.mockResolvedValue([{ passed: true }]);
      const result = await service.submitAnswer({ ...input, activityType: 'review' });
      expect(result.updatedMasteryState).toBe('needs_review');
      expect(mockStudentState.updateConceptAfterPractice).toHaveBeenCalledWith('user-1', 'concept-1', expect.objectContaining({ masteryState: 'needs_review' }), mockPrisma);
    });
  });

  describe('durable retry protection', () => {
    const input = {
      requestId: '06f232e6-dac9-4915-a372-c9d91651c795',
      orgId: 'org-1', userId: 'user-1', courseId: 'course-1', conceptId: 'concept-1',
      problemId: 'prob-1', answer: 'opt-b', responseTimeMs: 5000, activityType: 'lesson' as const,
    };

    it('returns the saved result without repeating any scoring effects', async () => {
      const first = await service.submitAnswer(input);
      const second = await service.submitAnswer(input);
      expect(second).toEqual(first);
      expect(savedAttempts.size).toBe(1);
      expect(mockPrisma.problemAttempt.create).toHaveBeenCalledTimes(1);
      expect(mockStudentState.upsertKPState).toHaveBeenCalledTimes(1);
      expect(mockStudentState.updateConceptAfterPractice).toHaveBeenCalledTimes(1);
      expect(mockXPService.recordXPEvent).toHaveBeenCalledTimes(1);
      expect(mockFireUpdate.propagateImplicitRepetition).toHaveBeenCalledTimes(1);
      expect([...savedAttempts.values()][0].xpAwarded).toBe(first.xpAwarded);
      expect(mockScope.assertConcept).toHaveBeenCalledTimes(2);
    });

    it('rejects an altered payload using the same request ID', async () => {
      await service.submitAnswer(input);
      await expect(service.submitAnswer({ ...input, answer: 'opt-a' })).rejects.toThrow(ConflictException);
      await expect(service.submitAnswer({ ...input, responseTimeMs: 5001 })).rejects.toThrow(ConflictException);
      expect(mockPrisma.problemAttempt.create).toHaveBeenCalledTimes(1);
    });

    it('records a new intentional attempt at the same problem', async () => {
      await service.submitAnswer(input);
      await service.submitAnswer({ ...input, requestId: '49e9d313-a0e0-426e-aae7-7f83a98bda56' });
      expect(savedAttempts.size).toBe(2);
      expect(mockStudentState.upsertKPState).toHaveBeenCalledTimes(2);
    });

    it('keeps another learner with the same client UUID separate', async () => {
      await service.submitAnswer(input);
      await service.submitAnswer({ ...input, userId: 'user-2' });
      expect(savedAttempts.size).toBe(2);
    });

    it('checks current enrollment before returning a saved result', async () => {
      await service.submitAnswer(input);
      mockScope.assertConcept.mockRejectedValueOnce(new NotFoundException('Enrollment removed'));
      await expect(service.submitAnswer(input)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.problemAttempt.create).toHaveBeenCalledTimes(1);
    });

    it('retries a failed derived section sync without applying the answer twice', async () => {
      mockSectionExamService.syncSectionStates.mockRejectedValueOnce(new Error('sync unavailable'));
      await expect(service.submitAnswer(input)).rejects.toThrow('sync unavailable');
      expect(savedAttempts.size).toBe(1);
      const result = await service.submitAnswer(input);
      expect(result.correct).toBe(true);
      expect(mockStudentState.upsertKPState).toHaveBeenCalledTimes(1);
      expect(mockXPService.recordXPEvent).toHaveBeenCalledTimes(1);
      expect(mockSectionExamService.syncSectionStates).toHaveBeenCalledTimes(2);
    });

    it('rolls the attempt back if FIRe fails and passes the same transaction to every scoring write', async () => {
      mockFireUpdate.propagateImplicitRepetition.mockRejectedValueOnce(new Error('FIRe unavailable'));
      await expect(service.submitAnswer(input)).rejects.toThrow('FIRe unavailable');
      expect(savedAttempts.size).toBe(0);
      expect(mockSectionExamService.syncSectionStates).not.toHaveBeenCalled();
      await service.submitAnswer(input);
      expect(savedAttempts.size).toBe(1);
      expect(mockStudentState.upsertKPState.mock.calls.every((call: any[]) => call.at(-1) === mockPrisma)).toBe(true);
      expect(mockStudentState.updateConceptAfterPractice.mock.calls.every((call: any[]) => call.at(-1) === mockPrisma)).toBe(true);
      expect(mockXPService.recordXPEvent.mock.calls.every((call: any[]) => call.at(-1) === mockPrisma)).toBe(true);
      expect(mockFireUpdate.propagateImplicitRepetition.mock.calls.every((call: any[]) => call.at(-1) === mockPrisma)).toBe(true);
    });

    it('retries a transaction conflict with the same durable attempt ID', async () => {
      mockPrisma.$transaction.mockRejectedValueOnce(Object.assign(new Error('write conflict'), { code: 'P2034' }));
      const result = await service.submitAnswer(input);
      expect(result.correct).toBe(true);
      expect(savedAttempts.size).toBe(1);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
    });
  });

});
