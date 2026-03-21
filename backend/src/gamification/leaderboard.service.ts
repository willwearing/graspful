import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  weeklyXP: number;
}

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  async getAcademyWeeklyLeaderboard(
    orgId: string,
    academyId: string,
  ): Promise<LeaderboardEntry[]> {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);

    const grouped = await this.prisma.xPEvent.groupBy({
      by: ['userId'],
      where: {
        academyId,
        createdAt: { gte: weekStart },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    if (grouped.length === 0) return [];

    const userIds = grouped.map((g) => g.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, displayName: true, avatarUrl: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const entries: LeaderboardEntry[] = [];
    let currentRank = 1;

    for (let i = 0; i < grouped.length; i++) {
      const g = grouped[i];
      const user = userMap.get(g.userId);
      const weeklyXP = g._sum.amount ?? 0;

      if (i > 0) {
        const prevXP = grouped[i - 1]._sum.amount ?? 0;
        if (weeklyXP < prevXP) {
          currentRank = i + 1;
        }
      }

      entries.push({
        rank: currentRank,
        userId: g.userId,
        displayName: user?.displayName ?? 'Unknown',
        avatarUrl: user?.avatarUrl ?? null,
        weeklyXP,
      });
    }

    return entries;
  }

  async getWeeklyLeaderboard(
    orgId: string,
    courseId: string,
  ): Promise<LeaderboardEntry[]> {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);

    // Aggregate XP per user for this week
    const grouped = await this.prisma.xPEvent.groupBy({
      by: ['userId'],
      where: {
        courseId,
        createdAt: { gte: weekStart },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    if (grouped.length === 0) return [];

    // Fetch user details
    const userIds = grouped.map((g) => g.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, displayName: true, avatarUrl: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Build ranked list with ties
    const entries: LeaderboardEntry[] = [];
    let currentRank = 1;

    for (let i = 0; i < grouped.length; i++) {
      const g = grouped[i];
      const user = userMap.get(g.userId);
      const weeklyXP = g._sum.amount ?? 0;

      // If this user has less XP than the previous, update rank
      if (i > 0) {
        const prevXP = grouped[i - 1]._sum.amount ?? 0;
        if (weeklyXP < prevXP) {
          currentRank = i + 1;
        }
      }

      entries.push({
        rank: currentRank,
        userId: g.userId,
        displayName: user?.displayName ?? 'Unknown',
        avatarUrl: user?.avatarUrl ?? null,
        weeklyXP,
      });
    }

    return entries;
  }
}
