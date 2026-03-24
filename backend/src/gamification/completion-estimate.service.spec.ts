import { Test } from '@nestjs/testing';
import { CompletionEstimateService } from './completion-estimate.service';
import { PrismaService } from '@/prisma/prisma.service';
import { StudentStateService } from '@/student-model/student-state.service';

const mockPrisma = {
  concept: {
    count: jest.fn(),
  },
  courseEnrollment: {
    findUnique: jest.fn(),
  },
  academyEnrollment: {
    findUnique: jest.fn(),
  },
  xPEvent: {
    aggregate: jest.fn(),
  },
};

const mockStudentState = {
  countMasteredConcepts: jest.fn(),
};

describe('CompletionEstimateService', () => {
  let service: CompletionEstimateService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        CompletionEstimateService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StudentStateService, useValue: mockStudentState },
      ],
    }).compile();
    service = module.get(CompletionEstimateService);
  });

  describe('getEstimate', () => {
    it('should estimate weeks remaining based on average daily XP', async () => {
      mockPrisma.concept.count.mockResolvedValue(100);
      mockStudentState.countMasteredConcepts.mockResolvedValue(25); // 25% mastered
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
      mockStudentState.countMasteredConcepts.mockResolvedValue(0);
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue({
        totalXPEarned: 0,
        dailyXPTarget: 40,
        createdAt: new Date(),
      });

      const estimate = await service.getEstimate('user-1', 'course-1');

      expect(estimate.completionPercent).toBe(0);
      expect(estimate.estimatedWeeksRemaining).toBeNull();
    });

    it('should estimate for academy across multiple courses', async () => {
      mockPrisma.concept.count.mockResolvedValue(200);
      mockStudentState.countMasteredConcepts.mockResolvedValue(80);
      mockPrisma.academyEnrollment.findUnique.mockResolvedValue({
        totalXPEarned: 1500,
        dailyXPTarget: 40,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      });

      const estimate = await service.getAcademyEstimate('user-1', 'academy-1');

      expect(estimate.completionPercent).toBe(40);
      expect(estimate.totalConcepts).toBe(200);
      expect(estimate.masteredConcepts).toBe(80);
      expect(estimate.estimatedWeeksRemaining).toBeGreaterThan(0);
    });

    it('should return 0 weeks when already complete', async () => {
      mockPrisma.concept.count.mockResolvedValue(50);
      mockStudentState.countMasteredConcepts.mockResolvedValue(50);
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
