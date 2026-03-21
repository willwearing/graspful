import { Test } from '@nestjs/testing';
import { StreakService, StreakStatus } from './streak.service';
import { PrismaService } from '@/prisma/prisma.service';

const mockPrisma = {
  userStreak: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  courseEnrollment: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  academyEnrollment: {
    findUnique: jest.fn(),
  },
};

describe('StreakService', () => {
  let service: StreakService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        StreakService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(StreakService);
  });

  describe('getStreakStatus', () => {
    it('should return 0-day streak when no history', async () => {
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue({
        dailyXPTarget: 40,
        streakFreezeTokens: 1,
        course: { orgId: 'org-1' },
      });
      mockPrisma.userStreak.findMany.mockResolvedValue([]);

      const status = await service.getStreakStatus('user-1', 'course-1');

      expect(status.currentStreak).toBe(0);
      expect(status.todayComplete).toBe(false);
    });

    it('should count consecutive days meeting XP target', async () => {
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue({
        dailyXPTarget: 40,
        streakFreezeTokens: 1,
        course: { orgId: 'org-1' },
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(today.getDate() - 2);

      mockPrisma.userStreak.findMany.mockResolvedValue([
        { date: today, xpEarned: 45 },
        { date: yesterday, xpEarned: 50 },
        { date: twoDaysAgo, xpEarned: 40 },
      ]);

      const status = await service.getStreakStatus('user-1', 'course-1');

      expect(status.currentStreak).toBe(3);
      expect(status.todayComplete).toBe(true);
    });

    it('should break streak on missed day without freeze token', async () => {
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue({
        dailyXPTarget: 40,
        streakFreezeTokens: 0,
        course: { orgId: 'org-1' },
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      // Skip yesterday, have two days ago
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(today.getDate() - 2);

      mockPrisma.userStreak.findMany.mockResolvedValue([
        { date: today, xpEarned: 50 },
        { date: twoDaysAgo, xpEarned: 40 },
      ]);

      const status = await service.getStreakStatus('user-1', 'course-1');

      expect(status.currentStreak).toBe(1); // Only today
    });

    it('should use freeze token to preserve streak through missed day', async () => {
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue({
        dailyXPTarget: 40,
        streakFreezeTokens: 1,
        course: { orgId: 'org-1' },
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(today.getDate() - 2);
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(today.getDate() - 3);

      mockPrisma.userStreak.findMany.mockResolvedValue([
        { date: today, xpEarned: 50 },
        // yesterday missing — freeze token used
        { date: twoDaysAgo, xpEarned: 40 },
        { date: threeDaysAgo, xpEarned: 45 },
      ]);

      const status = await service.getStreakStatus('user-1', 'course-1');

      // Streak should survive one gap
      expect(status.currentStreak).toBe(4); // 3 days + 1 frozen day
      expect(status.freezeTokensRemaining).toBe(0);
    });
  });

  describe('getAcademyStreakStatus', () => {
    it('should return 0-day streak when no enrollment', async () => {
      mockPrisma.academyEnrollment.findUnique.mockResolvedValue(null);

      const status = await service.getAcademyStreakStatus('user-1', 'academy-1');

      expect(status.currentStreak).toBe(0);
      expect(status.todayComplete).toBe(false);
    });

    it('should count consecutive days using academy enrollment', async () => {
      mockPrisma.academyEnrollment.findUnique
        .mockResolvedValueOnce({
          dailyXPTarget: 40,
          streakFreezeTokens: 1,
          academy: { orgId: 'org-1' },
        })
        .mockResolvedValueOnce({
          dailyXPTarget: 40,
          academy: { orgId: 'org-1' },
        });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      mockPrisma.userStreak.findMany.mockResolvedValue([
        { date: today, xpEarned: 50 },
        { date: yesterday, xpEarned: 45 },
      ]);

      const status = await service.getAcademyStreakStatus('user-1', 'academy-1');

      expect(status.currentStreak).toBe(2);
      expect(status.todayComplete).toBe(true);
    });
  });

  describe('getLongestStreak', () => {
    it('should calculate longest streak from history', async () => {
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue({
        dailyXPTarget: 40,
        streakFreezeTokens: 0,
        course: { orgId: 'org-1' },
      });

      // 5-day streak, then gap, then 2-day streak
      const dates = [];
      const base = new Date('2026-03-01');
      for (let i = 0; i < 5; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        dates.push({ date: d, xpEarned: 40 + i });
      }
      // Gap on day 5
      for (let i = 7; i < 9; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        dates.push({ date: d, xpEarned: 40 });
      }

      mockPrisma.userStreak.findMany.mockResolvedValue(dates);

      const longest = await service.getLongestStreak('user-1', 'course-1');

      expect(longest).toBe(5);
    });
  });
});
