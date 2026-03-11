import { Test } from '@nestjs/testing';
import { CompletionEstimateService } from './completion-estimate.service';
import { PrismaService } from '@/prisma/prisma.service';

const mockPrisma = {
  concept: {
    count: jest.fn(),
  },
  studentConceptState: {
    count: jest.fn(),
  },
  courseEnrollment: {
    findUnique: jest.fn(),
  },
  xPEvent: {
    aggregate: jest.fn(),
  },
};

describe('CompletionEstimateService', () => {
  let service: CompletionEstimateService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        CompletionEstimateService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(CompletionEstimateService);
  });

  describe('getEstimate', () => {
    it('should estimate weeks remaining based on average daily XP', async () => {
      mockPrisma.concept.count.mockResolvedValue(100);
      mockPrisma.studentConceptState.count.mockResolvedValue(25); // 25% mastered
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue({
        totalXPEarned: 500,
        dailyXPTarget: 40,
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      });

      const estimate = await service.getEstimate('user-1', 'course-1');

      expect(estimate.completionPercent).toBe(25);
      expect(estimate.estimatedWeeksRemaining).toBeGreaterThan(0);
      expect(estimate.averageDailyXP).toBeGreaterThan(0);
    });

    it('should return null weeks when no XP history', async () => {
      mockPrisma.concept.count.mockResolvedValue(100);
      mockPrisma.studentConceptState.count.mockResolvedValue(0);
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue({
        totalXPEarned: 0,
        dailyXPTarget: 40,
        createdAt: new Date(),
      });

      const estimate = await service.getEstimate('user-1', 'course-1');

      expect(estimate.completionPercent).toBe(0);
      expect(estimate.estimatedWeeksRemaining).toBeNull();
    });

    it('should return 0 weeks when already complete', async () => {
      mockPrisma.concept.count.mockResolvedValue(50);
      mockPrisma.studentConceptState.count.mockResolvedValue(50);
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue({
        totalXPEarned: 1000,
        dailyXPTarget: 40,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      });

      const estimate = await service.getEstimate('user-1', 'course-1');

      expect(estimate.completionPercent).toBe(100);
      expect(estimate.estimatedWeeksRemaining).toBe(0);
    });
  });
});
