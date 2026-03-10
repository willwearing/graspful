import { Test } from '@nestjs/testing';
import { XPService, XPSummary, RecordXPInput } from './xp.service';
import { PrismaService } from '@/prisma/prisma.service';

const mockPrisma = {
  xPEvent: {
    create: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
  },
  courseEnrollment: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  userStreak: {
    upsert: jest.fn(),
  },
};

describe('XPService', () => {
  let service: XPService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        XPService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(XPService);
  });

  describe('recordXPEvent', () => {
    it('should create an XP event and increment enrollment totalXPEarned', async () => {
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue({
        id: 'enroll-1',
        totalXPEarned: 100,
        dailyXPTarget: 40,
        course: { orgId: 'org-1' },
      });
      mockPrisma.xPEvent.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
      mockPrisma.xPEvent.create.mockResolvedValue({ id: 'xp-1', amount: 15 });
      mockPrisma.courseEnrollment.update.mockResolvedValue({});
      mockPrisma.userStreak.upsert.mockResolvedValue({});

      const result = await service.recordXPEvent({
        userId: 'user-1',
        courseId: 'course-1',
        source: 'lesson',
        amount: 15,
        conceptId: 'concept-1',
      });

      expect(result.amount).toBe(15);
      expect(mockPrisma.xPEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          courseId: 'course-1',
          source: 'lesson',
          amount: 15,
          conceptId: 'concept-1',
        }),
      });
      expect(mockPrisma.courseEnrollment.update).toHaveBeenCalled();
    });

    it('should skip recording when amount is 0', async () => {
      const result = await service.recordXPEvent({
        userId: 'user-1',
        courseId: 'course-1',
        source: 'lesson',
        amount: 0,
      });

      expect(result.amount).toBe(0);
      expect(mockPrisma.xPEvent.create).not.toHaveBeenCalled();
    });

    it('should cap daily XP at 500', async () => {
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue({
        id: 'enroll-1',
        totalXPEarned: 100,
        dailyXPTarget: 40,
        course: { orgId: 'org-1' },
      });
      // Simulate 490 XP already earned today
      mockPrisma.xPEvent.aggregate.mockResolvedValue({ _sum: { amount: 490 } });
      mockPrisma.xPEvent.create.mockResolvedValue({ id: 'xp-2', amount: 10 });
      mockPrisma.courseEnrollment.update.mockResolvedValue({});
      mockPrisma.userStreak.upsert.mockResolvedValue({});

      const result = await service.recordXPEvent({
        userId: 'user-1',
        courseId: 'course-1',
        source: 'lesson',
        amount: 20,
      });

      // Should clamp to 10 (500 - 490)
      expect(result.amount).toBe(10);
    });
  });

  describe('getXPSummary', () => {
    it('should return today, week, and total XP', async () => {
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue({
        totalXPEarned: 250,
        dailyXPTarget: 40,
      });
      // today's XP
      mockPrisma.xPEvent.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 25 } })  // today
        .mockResolvedValueOnce({ _sum: { amount: 120 } }); // this week

      const summary = await service.getXPSummary('user-1', 'course-1');

      expect(summary).toEqual({
        today: 25,
        thisWeek: 120,
        total: 250,
        dailyTarget: 40,
        dailyCap: 500,
      });
    });
  });

  describe('getWeeklyXPBreakdown', () => {
    it('should return XP for each of the last 7 days', async () => {
      // Mock 7 days of events grouped by date
      const events = [
        { createdAt: new Date('2026-03-10'), amount: 30 },
        { createdAt: new Date('2026-03-09'), amount: 45 },
      ];
      mockPrisma.xPEvent.findMany.mockResolvedValue(events);

      const breakdown = await service.getWeeklyXPBreakdown('user-1', 'course-1');

      expect(breakdown).toHaveLength(7);
      // Each day should have { date: string, xp: number }
      expect(breakdown[0]).toHaveProperty('date');
      expect(breakdown[0]).toHaveProperty('xp');
    });
  });
});
