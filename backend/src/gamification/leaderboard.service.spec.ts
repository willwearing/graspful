import { Test } from '@nestjs/testing';
import { LeaderboardService, LeaderboardEntry } from './leaderboard.service';
import { PrismaService } from '@/prisma/prisma.service';

const mockPrisma = {
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
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        LeaderboardService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(LeaderboardService);
  });

  describe('getWeeklyLeaderboard', () => {
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

      const board = await service.getWeeklyLeaderboard('org-1', 'course-1');

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

      const board = await service.getWeeklyLeaderboard('org-1', 'course-1');

      expect(board[0].rank).toBe(1);
      expect(board[1].rank).toBe(1); // Tied
      expect(board[2].rank).toBe(3); // Skip rank 2
    });

    it('should return empty array when no XP events', async () => {
      mockPrisma.xPEvent.groupBy.mockResolvedValue([]);

      const board = await service.getWeeklyLeaderboard('org-1', 'course-1');

      expect(board).toEqual([]);
    });
  });
});
