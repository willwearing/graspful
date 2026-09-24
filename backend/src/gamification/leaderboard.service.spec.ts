import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { LeaderboardService } from './leaderboard.service';
import { PrismaService } from '@/prisma/prisma.service';
import { EnrollmentService } from '@/student-model/enrollment.service';

const mockPrisma = {
  course: {
    findUnique: jest.fn(),
  },
  academyEnrollment: { findUnique: jest.fn() },
  courseEnrollment: { findUnique: jest.fn() },
  xPEvent: {
    groupBy: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
};

describe('LeaderboardService', () => {
  let service: LeaderboardService;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockPrisma.course.findUnique.mockResolvedValue({ academyId: 'academy-1' });
    mockPrisma.academyEnrollment.findUnique.mockResolvedValue({ id: 'enrollment-1', academy: { orgId: 'org-1' } });
    const module = await Test.createTestingModule({
      providers: [
        LeaderboardService,
        { provide: PrismaService, useValue: mockPrisma },
        EnrollmentService,
      ],
    }).compile();
    service = module.get(LeaderboardService);
  });

  describe('getWeeklyLeaderboard', () => {
    it('rejects a legacy course-only learner before reading academy XP or learner profiles', async () => {
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue({ userId: 'learner-1', courseId: 'course-1' });
      mockPrisma.academyEnrollment.findUnique.mockResolvedValue(null);
      mockPrisma.xPEvent.groupBy.mockResolvedValue([]);

      await expect(service.getWeeklyLeaderboard('org-1', 'course-1', 'learner-1')).rejects.toBeInstanceOf(NotFoundException);
      expect(mockPrisma.academyEnrollment.findUnique).toHaveBeenCalledWith({
        where: { userId_academyId: { userId: 'learner-1', academyId: 'academy-1' } },
        include: { academy: { select: { orgId: true } } },
      });
      expect(mockPrisma.xPEvent.groupBy).not.toHaveBeenCalled();
      expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
    });

    it('should return ranked users sorted by weekly XP', async () => {
      mockPrisma.xPEvent.groupBy.mockResolvedValue([
        { userId: 'user-a', _sum: { amount: 200 } },
        { userId: 'user-c', _sum: { amount: 150 } },
        { userId: 'user-b', _sum: { amount: 100 } },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-a', displayName: 'Alice', avatarUrl: null },
        { id: 'user-b', displayName: 'Bob', avatarUrl: null },
        { id: 'user-c', displayName: 'Carol', avatarUrl: null },
      ]);

      const board = await service.getWeeklyLeaderboard('org-1', 'course-1', 'learner-1');

      expect(mockPrisma.xPEvent.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ academyId: 'academy-1', academy: { orgId: 'org-1' } }),
        }),
      );
      expect(board).toHaveLength(3);
      expect(board[0].rank).toBe(1);
      expect(board[0].displayName).toBe('Alice');
      expect(board[0].weeklyXP).toBe(200);
      expect(board[1].rank).toBe(2);
      expect(board[2].rank).toBe(3);
    });

    it('should handle ties with same rank', async () => {
      mockPrisma.xPEvent.groupBy.mockResolvedValue([
        { userId: 'user-a', _sum: { amount: 200 } },
        { userId: 'user-b', _sum: { amount: 200 } },
        { userId: 'user-c', _sum: { amount: 100 } },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-a', displayName: 'Alice', avatarUrl: null },
        { id: 'user-b', displayName: 'Bob', avatarUrl: null },
        { id: 'user-c', displayName: 'Carol', avatarUrl: null },
      ]);

      const board = await service.getWeeklyLeaderboard('org-1', 'course-1', 'learner-1');

      expect(board[0].rank).toBe(1);
      expect(board[1].rank).toBe(1); // Tied
      expect(board[2].rank).toBe(3); // Skip rank 2
    });

    it('should return empty array when no XP events', async () => {
      mockPrisma.xPEvent.groupBy.mockResolvedValue([]);

      const board = await service.getWeeklyLeaderboard('org-1', 'course-1', 'learner-1');

      expect(board).toEqual([]);
    });
  });

  describe('getAcademyWeeklyLeaderboard', () => {
    it('should aggregate XP by academyId instead of courseId', async () => {
      mockPrisma.xPEvent.groupBy.mockResolvedValue([
        { userId: 'user-a', _sum: { amount: 300 } },
        { userId: 'user-b', _sum: { amount: 150 } },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-a', displayName: 'Alice', avatarUrl: null },
        { id: 'user-b', displayName: 'Bob', avatarUrl: null },
      ]);

      const board = await service.getAcademyWeeklyLeaderboard('org-1', 'academy-1');

      expect(board).toHaveLength(2);
      expect(board[0].rank).toBe(1);
      expect(board[0].weeklyXP).toBe(300);
      expect(board[1].rank).toBe(2);

      // Verify the query used academyId and stayed inside the org
      expect(mockPrisma.xPEvent.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ academyId: 'academy-1', academy: { orgId: 'org-1' } }),
        }),
      );
    });

    it('should return empty array when no academy XP events', async () => {
      mockPrisma.xPEvent.groupBy.mockResolvedValue([]);

      const board = await service.getAcademyWeeklyLeaderboard('org-1', 'academy-1');

      expect(board).toEqual([]);
    });
  });
});
