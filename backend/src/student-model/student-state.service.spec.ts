import { Test, TestingModule } from '@nestjs/testing';
import { StudentStateService } from './student-state.service';
import { PrismaService } from '@/prisma/prisma.service';
import { activeConceptWhere } from '@/knowledge-graph/active-course-content';

describe('StudentStateService', () => {
  let service: StudentStateService;
  let mockPrisma: any;
  const academyId = 'academy-1';
  const courseId = 'course-1';

  beforeEach(async () => {
    mockPrisma = {
      course: {
        findUnique: jest.fn().mockResolvedValue({ academyId }),
      },
      concept: {
        findMany: jest.fn(),
      },
      studentConceptState: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        createMany: jest.fn(),
      },
      studentKPState: {
        upsert: jest.fn(),
      },
      academyEnrollment: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      courseEnrollment: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentStateService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(StudentStateService);
  });

  describe('getConceptStates', () => {
    it('should return all concept states for a user in a course', async () => {
      mockPrisma.concept.findMany.mockResolvedValue([
        { id: 'c1' },
        { id: 'c2' },
      ]);
      const states = [
        { id: 's1', userId: 'u1', conceptId: 'c1', masteryState: 'unstarted' },
        { id: 's2', userId: 'u1', conceptId: 'c2', masteryState: 'mastered' },
      ];
      mockPrisma.studentConceptState.findMany
        .mockResolvedValueOnce([
          { conceptId: 'c1' },
          { conceptId: 'c2' },
        ])
        .mockResolvedValueOnce(states);

      const result = await service.getConceptStates('u1', 'course-1');
      expect(result).toEqual(states);
      expect(mockPrisma.studentConceptState.createMany).not.toHaveBeenCalled();
      expect(mockPrisma.studentConceptState.findMany).toHaveBeenNthCalledWith(1, {
        where: {
          userId: 'u1',
          concept: activeConceptWhere({ course: { academyId } }),
        },
        select: { conceptId: true },
      });
      expect(mockPrisma.studentConceptState.findMany).toHaveBeenNthCalledWith(2, {
        where: {
          userId: 'u1',
          concept: activeConceptWhere({ courseId: 'course-1' }),
        },
        include: { concept: true },
      });
    });

    it('should create missing concept states before returning course mastery', async () => {
      mockPrisma.concept.findMany.mockResolvedValue([
        { id: 'c1' },
        { id: 'c2' },
      ]);
      mockPrisma.studentConceptState.findMany
        .mockResolvedValueOnce([{ conceptId: 'c1' }])
        .mockResolvedValueOnce([
          { id: 's1', userId: 'u1', conceptId: 'c1', masteryState: 'mastered' },
          { id: 's2', userId: 'u1', conceptId: 'c2', masteryState: 'unstarted' },
        ]);
      mockPrisma.studentConceptState.createMany.mockResolvedValue({ count: 1 });

      const result = await service.getConceptStates('u1', 'course-1');

      expect(mockPrisma.studentConceptState.createMany).toHaveBeenCalledWith({
        data: [{ userId: 'u1', conceptId: 'c2' }],
        skipDuplicates: true,
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('getMasteryMap', () => {
    it('should return a Map of conceptId -> mastery probability', async () => {
      mockPrisma.concept.findMany.mockResolvedValue([
        { id: 'c1' },
        { id: 'c2' },
        { id: 'c3' },
      ]);
      mockPrisma.studentConceptState.findMany
        .mockResolvedValueOnce([
          { conceptId: 'c1' },
          { conceptId: 'c2' },
          { conceptId: 'c3' },
        ])
        .mockResolvedValueOnce([
          { conceptId: 'c1', masteryState: 'unstarted', memory: 1.0 },
          { conceptId: 'c2', masteryState: 'mastered', memory: 0.9 },
          { conceptId: 'c3', masteryState: 'in_progress', memory: 0.6 },
        ]);

      const result = await service.getMasteryMap('u1', 'course-1');
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(3);
      // unstarted with memory=1.0 should map to prior 0.5
      expect(result.get('c1')).toBe(0.5);
      // mastered with memory=0.9 should stay 0.9
      expect(result.get('c2')).toBe(0.9);
      // in_progress with memory=0.6 should stay 0.6
      expect(result.get('c3')).toBe(0.6);
    });

    it('should seed missing course concepts so diagnostics see the full graph', async () => {
      mockPrisma.concept.findMany.mockResolvedValue([
        { id: 'c1' },
        { id: 'c2' },
      ]);
      mockPrisma.studentConceptState.findMany
        .mockResolvedValueOnce([{ conceptId: 'c1' }])
        .mockResolvedValueOnce([
          { conceptId: 'c1', masteryState: 'mastered', memory: 0.9 },
          { conceptId: 'c2', masteryState: 'unstarted', memory: 1.0 },
        ]);
      mockPrisma.studentConceptState.createMany.mockResolvedValue({ count: 1 });

      const result = await service.getMasteryMap('u1', 'course-1');

      expect(mockPrisma.studentConceptState.createMany).toHaveBeenCalledWith({
        data: [{ userId: 'u1', conceptId: 'c2' }],
        skipDuplicates: true,
      });
      expect(result.get('c2')).toBe(0.5);
    });
  });

  describe('updateConceptDiagnosticState', () => {
    it('should update diagnostic state and mastery state', async () => {
      mockPrisma.studentConceptState.update.mockResolvedValue({
        id: 's1',
        diagnosticState: 'mastered',
        masteryState: 'mastered',
      });

      await service.updateConceptDiagnosticState('u1', 'c1', 'mastered', 0.85);

      expect(mockPrisma.studentConceptState.update).toHaveBeenCalledWith({
        where: { userId_conceptId: { userId: 'u1', conceptId: 'c1' } },
        data: expect.objectContaining({
          diagnosticState: 'mastered',
          masteryState: 'mastered',
        }),
      });
    });

    it('should map conditionally_mastered to in_progress', async () => {
      mockPrisma.studentConceptState.update.mockResolvedValue({});

      await service.updateConceptDiagnosticState('u1', 'c1', 'conditionally_mastered', 0.6);

      expect(mockPrisma.studentConceptState.update).toHaveBeenCalledWith({
        where: { userId_conceptId: { userId: 'u1', conceptId: 'c1' } },
        data: expect.objectContaining({
          diagnosticState: 'conditionally_mastered',
          masteryState: 'in_progress',
        }),
      });
    });

    it('should map unknown to unstarted', async () => {
      mockPrisma.studentConceptState.update.mockResolvedValue({});

      await service.updateConceptDiagnosticState('u1', 'c1', 'unknown', 0.1);

      expect(mockPrisma.studentConceptState.update).toHaveBeenCalledWith({
        where: { userId_conceptId: { userId: 'u1', conceptId: 'c1' } },
        data: expect.objectContaining({
          diagnosticState: 'unknown',
          masteryState: 'unstarted',
        }),
      });
    });
  });

  describe('bulkUpdateMasteries', () => {
    it('should update multiple concept masteries', async () => {
      mockPrisma.studentConceptState.update.mockResolvedValue({});

      const updates = new Map([
        ['c1', 0.85],
        ['c2', 0.3],
      ]);
      await service.bulkUpdateMasteries('u1', updates);

      expect(mockPrisma.studentConceptState.update).toHaveBeenCalledTimes(2);
      expect(mockPrisma.studentConceptState.update).toHaveBeenCalledWith({
        where: { userId_conceptId: { userId: 'u1', conceptId: 'c1' } },
        data: { memory: 0.85 },
      });
    });
  });

  describe('updateSpeedParameters', () => {
    it('should update speed for all concepts', async () => {
      mockPrisma.studentConceptState.update.mockResolvedValue({});

      const speeds = new Map([['c1', 1.5]]);
      await service.updateSpeedParameters('u1', 1.2, 250, speeds);

      expect(mockPrisma.studentConceptState.update).toHaveBeenCalledWith({
        where: { userId_conceptId: { userId: 'u1', conceptId: 'c1' } },
        data: { speed: 1.5, abilityTheta: 1.2, speedRD: 250 },
      });
    });
  });

  describe('getConceptStatesForAcademyCourse', () => {
    it('should return concept states filtered by course within academy', async () => {
      mockPrisma.concept.findMany.mockResolvedValue([
        { id: 'c1' },
        { id: 'c2' },
        { id: 'c3' },
      ]);
      mockPrisma.studentConceptState.findMany
        .mockResolvedValueOnce([
          { conceptId: 'c1' },
          { conceptId: 'c2' },
          { conceptId: 'c3' },
        ])
        .mockResolvedValueOnce([
          { id: 's1', userId: 'u1', conceptId: 'c1', masteryState: 'mastered', concept: { courseId } },
          { id: 's2', userId: 'u1', conceptId: 'c2', masteryState: 'unstarted', concept: { courseId } },
        ]);

      const result = await service.getConceptStatesForAcademyCourse('u1', academyId, courseId);
      expect(result).toHaveLength(2);
      expect(mockPrisma.studentConceptState.findMany).toHaveBeenLastCalledWith({
        where: {
          userId: 'u1',
          concept: activeConceptWhere({ courseId, course: { academyId } }),
        },
        include: { concept: true },
      });
    });
  });

  describe('getAcademyCourseMasterySummary', () => {
    it('should return per-course mastery breakdown', async () => {
      mockPrisma.concept.findMany.mockResolvedValue([
        { id: 'c1' },
        { id: 'c2' },
        { id: 'c3' },
      ]);
      mockPrisma.studentConceptState.findMany
        .mockResolvedValueOnce([
          { conceptId: 'c1' },
          { conceptId: 'c2' },
          { conceptId: 'c3' },
        ])
        .mockResolvedValueOnce([
          { conceptId: 'c1', masteryState: 'mastered', concept: { courseId: 'course-1' } },
          { conceptId: 'c2', masteryState: 'in_progress', concept: { courseId: 'course-1' } },
          { conceptId: 'c3', masteryState: 'unstarted', concept: { courseId: 'course-2' } },
        ]);

      const result = await service.getAcademyCourseMasterySummary('u1', academyId);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);

      const course1 = result.get('course-1');
      expect(course1).toEqual({ total: 2, mastered: 1, inProgress: 1, unstarted: 0 });

      const course2 = result.get('course-2');
      expect(course2).toEqual({ total: 1, mastered: 0, inProgress: 0, unstarted: 1 });
    });

    it('should return empty map when no concept states exist', async () => {
      mockPrisma.concept.findMany.mockResolvedValue([]);
      mockPrisma.studentConceptState.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getAcademyCourseMasterySummary('u1', academyId);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });
  });

  describe('markDiagnosticComplete', () => {
    it('should update enrollment diagnosticCompleted flag', async () => {
      mockPrisma.academyEnrollment.update.mockResolvedValue({
        diagnosticCompleted: true,
      });

      await service.markDiagnosticComplete('u1', academyId);

      expect(mockPrisma.academyEnrollment.update).toHaveBeenCalledWith({
        where: { userId_academyId: { userId: 'u1', academyId } },
        data: {
          diagnosticCompleted: true,
          diagnosticCompletedAt: expect.any(Date),
        },
      });
    });
  });
});
