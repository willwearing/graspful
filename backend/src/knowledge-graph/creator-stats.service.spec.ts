import { CreatorStatsService } from './creator-stats.service';

describe('CreatorStatsService', () => {
  let service: CreatorStatsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      courseEnrollment: {
        findMany: jest.fn(),
      },
      studentConceptState: {
        findMany: jest.fn(),
      },
      revenueEvent: {
        aggregate: jest.fn(),
      },
    };

    service = new CreatorStatsService(mockPrisma);
  });

  describe('getStats', () => {
    it('returns combined stats for an org', async () => {
      mockPrisma.courseEnrollment.findMany.mockResolvedValue([
        { userId: 'u1' },
        { userId: 'u2' },
      ]);
      mockPrisma.studentConceptState.findMany.mockResolvedValue([
        { userId: 'u1', masteryState: 'mastered', concept: { courseId: 'c1' } },
        { userId: 'u1', masteryState: 'in_progress', concept: { courseId: 'c1' } },
        { userId: 'u2', masteryState: 'mastered', concept: { courseId: 'c1' } },
        { userId: 'u2', masteryState: 'mastered', concept: { courseId: 'c1' } },
      ]);
      mockPrisma.revenueEvent.aggregate.mockResolvedValue({
        _sum: { creatorPayout: 15000 },
      });

      const stats = await service.getStats('org-1');

      expect(stats.students).toBe(2);
      // u1: 1/2 = 0.5, u2: 2/2 = 1.0, avg = 0.75
      expect(stats.avgCompletion).toBe(0.75);
      expect(stats.totalRevenue).toBe(15000);
    });

    it('returns zeros when no data exists', async () => {
      mockPrisma.courseEnrollment.findMany.mockResolvedValue([]);
      mockPrisma.studentConceptState.findMany.mockResolvedValue([]);
      mockPrisma.revenueEvent.aggregate.mockResolvedValue({
        _sum: { creatorPayout: null },
      });

      const stats = await service.getStats('org-empty');

      expect(stats.students).toBe(0);
      expect(stats.avgCompletion).toBe(0);
      expect(stats.totalRevenue).toBe(0);
    });

    it('handles multiple courses in completion calculation', async () => {
      mockPrisma.courseEnrollment.findMany.mockResolvedValue([
        { userId: 'u1' },
      ]);
      mockPrisma.studentConceptState.findMany.mockResolvedValue([
        // Course 1: 2/2 mastered
        { userId: 'u1', masteryState: 'mastered', concept: { courseId: 'c1' } },
        { userId: 'u1', masteryState: 'mastered', concept: { courseId: 'c1' } },
        // Course 2: 0/2 mastered
        { userId: 'u1', masteryState: 'unstarted', concept: { courseId: 'c2' } },
        { userId: 'u1', masteryState: 'unstarted', concept: { courseId: 'c2' } },
      ]);
      mockPrisma.revenueEvent.aggregate.mockResolvedValue({
        _sum: { creatorPayout: 0 },
      });

      const stats = await service.getStats('org-1');

      // c1: 1.0, c2: 0.0, avg = 0.5
      expect(stats.avgCompletion).toBe(0.5);
    });
  });
});
