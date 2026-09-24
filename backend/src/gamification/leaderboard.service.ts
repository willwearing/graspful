import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { LeaderboardEntry } from '@graspful/shared';
import { EnrollmentService } from '@/student-model/enrollment.service';
import { startOfWeekUtc } from '@/shared/utils/utc-date';

@Injectable()
export class LeaderboardService {
  constructor(
    private prisma: PrismaService,
    private enrollments: EnrollmentService,
  ) {}

  async getAcademyWeeklyLeaderboard(
    orgId: string,
    academyId: string,
  ): Promise<LeaderboardEntry[]> {
    const weekStart = startOfWeekUtc();

    const grouped = await this.prisma.xPEvent.groupBy({
      by: ['userId'],
      where: {
        academyId,
        academy: { orgId },
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
    userId: string,
  ): Promise<LeaderboardEntry[]> {
    const academyId = await this.enrollments.getAcademyIdForCourse(courseId);
    await this.enrollments.requireAcademyEnrollment(userId, academyId);
    return this.getAcademyWeeklyLeaderboard(orgId, academyId);
  }
}
