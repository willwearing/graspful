import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { StreakStatus } from '@graspful/shared';
import { EnrollmentService } from '@/student-model/enrollment.service';
import { startOfDayUtc } from '@/shared/utils/utc-date';

@Injectable()
export class StreakService {
  constructor(
    private prisma: PrismaService,
    private enrollments: EnrollmentService,
  ) {}

  async getStreakStatus(userId: string, courseId: string): Promise<StreakStatus> {
    const academyId = await this.enrollments.getAcademyIdForCourse(courseId);
    return this.getAcademyStreakStatus(userId, academyId);
  }

  private countStreak(
    xpByDate: Map<string, number>,
    startDate: Date,
    dailyTarget: number,
    freezeTokens: number,
  ): { streak: number; freezesUsed: number } {
    let streak = 0;
    let freezesUsed = 0;
    let pendingFreezes = 0; // Gaps that might be frozen if followed by a qualifying day
    const date = new Date(startDate);
    let hasStarted = false;

    for (let i = 0; i < 90; i++) {
      const dateStr = date.toISOString().split('T')[0];
      const xp = xpByDate.get(dateStr) ?? 0;

      if (xp >= dailyTarget) {
        hasStarted = true;
        // Confirm any pending freezes
        streak += pendingFreezes + 1;
        freezesUsed += pendingFreezes;
        pendingFreezes = 0;
      } else if (i === 0) {
        // Today isn't over yet — continue checking backward
      } else if (hasStarted && freezesUsed + pendingFreezes < freezeTokens) {
        // Tentatively freeze this gap (confirmed only if a qualifying day follows)
        pendingFreezes++;
      } else {
        break; // Streak broken
      }

      date.setUTCDate(date.getUTCDate() - 1);
    }

    return { streak, freezesUsed };
  }

  async getAcademyStreakStatus(
    userId: string,
    academyId: string,
  ): Promise<StreakStatus> {
    const enrollment = await this.enrollments.requireAcademyEnrollment(userId, academyId);
    const dailyTarget = enrollment.dailyXPTarget;
    const freezeTokens = enrollment.streakFreezeTokens;
    const orgId = enrollment.academy.orgId;
    const today = startOfDayUtc();
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setUTCDate(ninetyDaysAgo.getUTCDate() - 90);

    const streaks = await this.prisma.userStreak.findMany({
      where: {
        userId,
        orgId,
        date: { gte: ninetyDaysAgo },
      },
      orderBy: { date: 'desc' },
    });

    const xpByDate = new Map<string, number>();
    for (const s of streaks) {
      const dateStr = s.date.toISOString().split('T')[0];
      xpByDate.set(dateStr, s.xpEarned);
    }

    const todayStr = today.toISOString().split('T')[0];
    const todayXP = xpByDate.get(todayStr) ?? 0;
    const todayComplete = todayXP >= dailyTarget;

    const { streak: currentStreak, freezesUsed } = this.countStreak(
      xpByDate,
      today,
      dailyTarget,
      freezeTokens,
    );
    const longestStreak = await this.computeLongestStreak(userId, orgId, dailyTarget);

    return {
      currentStreak,
      longestStreak,
      todayComplete,
      todayXP,
      dailyTarget,
      freezeTokensRemaining: Math.max(0, freezeTokens - freezesUsed),
    };
  }

  async getLongestStreak(userId: string, courseId: string): Promise<number> {
    const academyId = await this.enrollments.getAcademyIdForCourse(courseId);
    return this.getLongestAcademyStreak(userId, academyId);
  }

  async getLongestAcademyStreak(
    userId: string,
    academyId: string,
  ): Promise<number> {
    const enrollment = await this.enrollments.requireAcademyEnrollment(userId, academyId);
    return this.computeLongestStreak(
      userId,
      enrollment.academy.orgId,
      enrollment.dailyXPTarget,
    );
  }

  private async computeLongestStreak(
    userId: string,
    orgId: string,
    dailyTarget: number,
  ): Promise<number> {
    const streaks = await this.prisma.userStreak.findMany({
      where: { userId, orgId },
      orderBy: { date: 'asc' },
    });

    let longest = 0;
    let current = 0;
    let lastDate: Date | null = null;

    for (const s of streaks) {
      const xp = s.xpEarned;
      if (xp < dailyTarget) {
        current = 0;
        lastDate = s.date;
        continue;
      }

      if (lastDate) {
        const diff = Math.round(
          (s.date.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (diff === 1) {
          current++;
        } else {
          current = 1;
        }
      } else {
        current = 1;
      }

      longest = Math.max(longest, current);
      lastDate = s.date;
    }

    return longest;
  }
}
