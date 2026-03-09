import { LearningEngineService } from './learning-engine.service';

describe('LearningEngineService', () => {
  let service: LearningEngineService;
  let mockPrisma: any;
  let mockStudentState: any;
  let mockGraphQuery: any;
  let mockRemediationService: any;

  const conceptStates = [
    {
      conceptId: 'c1',
      masteryState: 'mastered',
      memory: 0.9,
      failCount: 0,
      concept: { courseId: 'course-1' },
    },
    {
      conceptId: 'c2',
      masteryState: 'unstarted',
      memory: 1.0,
      failCount: 0,
      concept: { courseId: 'course-1' },
    },
  ];

  const edges = [{ sourceConceptId: 'c1', targetConceptId: 'c2' }];

  beforeEach(() => {
    mockPrisma = {
      concept: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'c1', courseId: 'course-1' },
          { id: 'c2', courseId: 'course-1' },
        ]),
      },
      prerequisiteEdge: {
        findMany: jest.fn().mockResolvedValue(edges),
      },
      courseEnrollment: {
        findUnique: jest.fn().mockResolvedValue({ totalXPEarned: 50 }),
      },
      problemAttempt: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    mockStudentState = {
      getConceptStates: jest.fn().mockResolvedValue(conceptStates),
    };

    mockGraphQuery = {
      knowledgeFrontier: jest.fn().mockReturnValue(['c2']),
    };

    mockRemediationService = {
      getActiveRemediations: jest.fn().mockResolvedValue([]),
      getBlockedConceptIds: jest.fn().mockResolvedValue(new Set()),
      createRemediation: jest.fn().mockResolvedValue({}),
    };

    service = new LearningEngineService(
      mockPrisma,
      mockStudentState,
      mockGraphQuery,
      mockRemediationService,
    );
  });

  describe('getNextTask', () => {
    it('should return a task recommendation', async () => {
      const result = await service.getNextTask('u1', 'course-1');

      expect(result).toBeDefined();
      expect(result.taskType).toBeDefined();
      expect(['lesson', 'review', 'quiz', 'remediation']).toContain(
        result.taskType,
      );
    });

    it('should recommend a lesson when frontier concept is available', async () => {
      const result = await service.getNextTask('u1', 'course-1');

      expect(result.taskType).toBe('lesson');
      expect(result.conceptId).toBe('c2');
    });

    it('should create remediations when plateau is detected', async () => {
      mockStudentState.getConceptStates.mockResolvedValue([
        {
          conceptId: 'c1',
          masteryState: 'in_progress',
          memory: 0.5,
          failCount: 0,
          concept: { courseId: 'course-1' },
        },
        {
          conceptId: 'c2',
          masteryState: 'in_progress',
          memory: 0.3,
          failCount: 3,
          concept: { courseId: 'course-1' },
        },
      ]);

      mockGraphQuery.knowledgeFrontier.mockReturnValue([]);

      const result = await service.getNextTask('u1', 'course-1');

      expect(result.taskType).toBe('remediation');
      expect(mockRemediationService.createRemediation).toHaveBeenCalled();
    });
  });

  describe('getStudySession', () => {
    it('should return a study session with tasks', async () => {
      const result = await service.getStudySession('u1', 'course-1', 40);

      expect(result.tasks).toBeDefined();
      expect(result.tasks.length).toBeGreaterThan(0);
      expect(result.estimatedXP).toBeGreaterThan(0);
    });
  });
});
