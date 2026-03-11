import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface RecordXPInput {
  userId: string;
  courseId: string;
  source: 'lesson' | 'review' | 'quiz' | 'remediation' | 'bonus';
  amount: number;
  conceptId?: string;
}

export interface XPSummary {
  today: number;
  thisWeek: number;
  total: number;
  dailyTarget: number;
  dailyCap: number;
}

export interface DailyXP {
  date: string;
  xp: number;
}

const DAILY_XP_CAP = 500;

@Injectable()
export class XPService {
  constructor(private prisma: PrismaService) {}

  async recordXPEvent(input: RecordXPInput): Promise<{ amount: number }> {
    if (input.amount <= 0) {
      return { amount: 0 };
    }

    // Check daily cap
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayXP = await this.prisma.xPEvent.aggregate({
      where: {
        userId: input.userId,
        courseId: input.courseId,
        createdAt: { gte: todayStart },
      },
      _sum: { amount: true },
    });

    const earnedToday = todayXP._sum.amount ?? 0;
    const remaining = Math.max(0, DAILY_XP_CAP - earnedToday);
    const clampedAmount = Math.min(input.amount, remaining);

    if (clampedAmount <= 0) {
      return { amount: 0 };
    }

    // Record the event
    await this.prisma.xPEvent.create({
      data: {
        userId: input.userId,
        courseId: input.courseId,
        source: input.source,
        amount: clampedAmount,
        conceptId: input.conceptId,
      },
    });

    // Get enrollment to find orgId for streak update
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId: input.userId,
          courseId: input.courseId,
        },
      },
      include: { course: { select: { orgId: true } } },
    });

    // Update enrollment total
    await this.prisma.courseEnrollment.update({
      where: {
        userId_courseId: {
          userId: input.userId,
          courseId: input.courseId,
        },
      },
      data: { totalXPEarned: { increment: clampedAmount } },
    });

    // Update today's UserStreak xpEarned
    if (enrollment) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await this.prisma.userStreak.upsert({
        where: {
          userId_orgId_date: {
            userId: input.userId,
            orgId: enrollment.course.orgId,
            date: today,
          },
        },
        create: {
          userId: input.userId,
          orgId: enrollment.course.orgId,
          date: today,
          xpEarned: clampedAmount,
        },
        update: {
          xpEarned: { increment: clampedAmount },
        },
      });
    }

    return { amount: clampedAmount };
  }

  async getXPSummary(userId: string, courseId: string): Promise<XPSummary> {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);

    const [todayAgg, weekAgg] = await Promise.all([
      this.prisma.xPEvent.aggregate({
        where: { userId, courseId, createdAt: { gte: todayStart } },
        _sum: { amount: true },
      }),
      this.prisma.xPEvent.aggregate({
        where: { userId, courseId, createdAt: { gte: weekStart } },
        _sum: { amount: true },
      }),
    ]);

    return {
      today: todayAgg._sum.amount ?? 0,
      thisWeek: weekAgg._sum.amount ?? 0,
      total: enrollment?.totalXPEarned ?? 0,
      dailyTarget: enrollment?.dailyXPTarget ?? 40,
      dailyCap: DAILY_XP_CAP,
    };
  }

  async getWeeklyXPBreakdown(userId: string, courseId: string): Promise<DailyXP[]> {
    const days: DailyXP[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(now.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);

      days.push({
        date: dayStart.toISOString().split('T')[0],
        xp: 0,
      });
    }

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const events = await this.prisma.xPEvent.findMany({
      where: {
        userId,
        courseId,
        createdAt: { gte: weekStart },
      },
      select: { createdAt: true, amount: true },
    });

    for (const event of events) {
      const dateStr = event.createdAt.toISOString().split('T')[0];
      const day = days.find((d) => d.date === dateStr);
      if (day) day.xp += event.amount;
    }

    return days;
  }
}
