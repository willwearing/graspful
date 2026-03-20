import { LearningEngineService } from './learning-engine.service';

describe('LearningEngineService', () => {
  let service: LearningEngineService;
  let mockPrisma: any;
  let mockStudentState: any;
  let mockGraphQuery: any;
  let mockRemediationService: any;
  let mockMemoryDecay: any;
  let mockSectionExamService: any;

  const conceptStates = [
    {
      conceptId: 'c1',
      masteryState: 'mastered',
      memory: 0.9,
      failCount: 0,
      concept: { courseId: 'course-1', sectionId: 'section-1', difficulty: 2 },
    },
    {
      conceptId: 'c2',
      masteryState: 'unstarted',
      memory: 1.0,
      failCount: 0,
      concept: { courseId: 'course-1', sectionId: 'section-1', difficulty: 3 },
    },
  ];

  const edges = [{ sourceConceptId: 'c1', targetConceptId: 'c2' }];

  beforeEach(() => {
    mockPrisma = {
      course: {
        findMany: jest.fn().mockResolvedValue([{ id: 'course-1' }]),
        findUnique: jest.fn().mockResolvedValue({ academyId: 'academy-1' }),
      },
      concept: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'c1', courseId: 'course-1', sectionId: 'section-1', difficulty: 2 },
          { id: 'c2', courseId: 'course-1', sectionId: 'section-1', difficulty: 3 },
        ]),
      },
      prerequisiteEdge: {
        findMany: jest.fn().mockResolvedValue(edges),
      },
      studentSectionState: {
        findMany: jest.fn().mockResolvedValue([
          {
            courseId: 'course-1',
            sectionId: 'section-1',
            status: 'lesson_in_progress',
            section: { sortOrder: 0 },
          },
        ]),
      },
      courseEnrollment: {
        findUnique: jest.fn().mockResolvedValue({ totalXPEarned: 50 }),
      },
      academyEnrollment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'academy-enrollment-1',
          dailyXPTarget: 40,
          totalXPEarned: 50,
        }),
      },
      problemAttempt: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    mockStudentState = {
      getConceptStatesForAcademy: jest.fn().mockResolvedValue(conceptStates),
      getAcademyIdForCourse: jest.fn().mockResolvedValue('academy-1'),
    };

    mockGraphQuery = {
      knowledgeFrontier: jest.fn().mockReturnValue(['c2']),
    };

    mockRemediationService = {
      getActiveRemediations: jest.fn().mockResolvedValue([]),
      getBlockedConceptIds: jest.fn().mockResolvedValue(new Set()),
      createRemediation: jest.fn().mockResolvedValue({}),
    };

    mockMemoryDecay = {
      decayAllMemory: jest.fn().mockResolvedValue(undefined),
    };

    mockSectionExamService = {
      syncSectionStates: jest.fn().mockResolvedValue([]),
    };

    service = new LearningEngineService(
      mockPrisma,
      mockStudentState,
      mockGraphQuery,
      mockRemediationService,
      mockMemoryDecay,
      mockSectionExamService,
    );
  });

  describe('getNextTask', () => {
    it('should return a task recommendation', async () => {
      const result = await service.getNextTaskForCourse('u1', 'course-1');

      expect(result).toBeDefined();
      expect(result.taskType).toBeDefined();
      expect(['lesson', 'review', 'quiz', 'remediation', 'section_exam']).toContain(
        result.taskType,
      );
    });

    it('should recommend a lesson when frontier concept is available', async () => {
      const result = await service.getNextTaskForCourse('u1', 'course-1');

      expect(result.taskType).toBe('lesson');
      expect(result.conceptId).toBe('c2');
    });

    it('should create remediations when plateau is detected', async () => {
      mockStudentState.getConceptStatesForAcademy.mockResolvedValue([
        {
          conceptId: 'c1',
          masteryState: 'in_progress',
          memory: 0.5,
          failCount: 0,
          concept: { courseId: 'course-1', sectionId: 'section-1', difficulty: 2 },
        },
        {
          conceptId: 'c2',
          masteryState: 'in_progress',
          memory: 0.3,
          failCount: 3,
          concept: { courseId: 'course-1', sectionId: 'section-1', difficulty: 3 },
        },
      ]);

      mockGraphQuery.knowledgeFrontier.mockReturnValue([]);

      const result = await service.getNextTaskForCourse('u1', 'course-1');

      expect(result.taskType).toBe('remediation');
      expect(mockRemediationService.createRemediation).toHaveBeenCalled();
    });
  });

  describe('getStudySession', () => {
    it('should return a study session with tasks', async () => {
      mockPrisma.academyEnrollment.findUnique.mockResolvedValue({
        dailyXPTarget: 40,
        totalXPEarned: 50,
      });

      const result = await service.getStudySessionForCourse('u1', 'course-1');

      expect(result.tasks).toBeDefined();
      expect(result.tasks.length).toBeGreaterThan(0);
      expect(result.estimatedXP).toBeGreaterThan(0);
    });

    it('throws when the learner is not enrolled', async () => {
      mockPrisma.academyEnrollment.findUnique.mockResolvedValueOnce(null);

      await expect(service.getStudySessionForCourse('u1', 'course-1')).rejects.toThrow(
        'Not enrolled in this academy',
      );
    });
  });
});
