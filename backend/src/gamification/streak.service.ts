import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface StreakStatus {
  currentStreak: number;
  longestStreak: number;
  todayComplete: boolean;
  todayXP: number;
  dailyTarget: number;
  freezeTokensRemaining: number;
}

@Injectable()
export class StreakService {
  constructor(private prisma: PrismaService) {}

  async getStreakStatus(userId: string, courseId: string): Promise<StreakStatus> {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: { course: { select: { orgId: true } } },
    });

    const dailyTarget = enrollment?.dailyXPTarget ?? 40;
    const freezeTokens = (enrollment as any)?.streakFreezeTokens ?? 1;
    const orgId = enrollment?.course?.orgId;

    if (!orgId) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        todayComplete: false,
        todayXP: 0,
        dailyTarget,
        freezeTokensRemaining: freezeTokens,
      };
    }

    // Fetch last 90 days of streak records
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    ninetyDaysAgo.setHours(0, 0, 0, 0);

    const streaks = await this.prisma.userStreak.findMany({
      where: {
        userId,
        orgId,
        date: { gte: ninetyDaysAgo },
      },
      orderBy: { date: 'desc' },
    });

    // Build a date->xp map
    const xpByDate = new Map<string, number>();
    for (const s of streaks) {
      const dateStr = s.date.toISOString().split('T')[0];
      xpByDate.set(dateStr, (s as any).xpEarned ?? 0);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    const todayXP = xpByDate.get(todayStr) ?? 0;
    const todayComplete = todayXP >= dailyTarget;

    // Count current streak (consecutive days from today, backward)
    const { streak: currentStreak, freezesUsed } = this.countStreak(
      xpByDate,
      today,
      dailyTarget,
      freezeTokens,
    );
    const longestStreak = await this.getLongestStreak(userId, courseId);

    return {
      currentStreak,
      longestStreak,
      todayComplete,
      todayXP,
      dailyTarget,
      freezeTokensRemaining: Math.max(0, freezeTokens - freezesUsed),
    };
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

      date.setDate(date.getDate() - 1);
    }

    return { streak, freezesUsed };
  }

  async getLongestStreak(userId: string, courseId: string): Promise<number> {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: { course: { select: { orgId: true } } },
    });

    if (!enrollment?.course?.orgId) return 0;

    const dailyTarget = enrollment.dailyXPTarget;

    const streaks = await this.prisma.userStreak.findMany({
      where: { userId, orgId: enrollment.course.orgId },
      orderBy: { date: 'asc' },
    });

    let longest = 0;
    let current = 0;
    let lastDate: Date | null = null;

    for (const s of streaks) {
      const xp = (s as any).xpEarned ?? 0;
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
