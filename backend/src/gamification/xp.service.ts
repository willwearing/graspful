import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface RecordXPInput {
  userId: string;
  academyId?: string;
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

    const scope = await this.resolveScope(input.courseId, input.academyId);

    // Check daily cap
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayXP = await this.prisma.xPEvent.aggregate({
      where: {
        userId: input.userId,
        academyId: scope.academyId,
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
        academyId: scope.academyId,
        courseId: scope.courseId,
        source: input.source,
        amount: clampedAmount,
        conceptId: input.conceptId,
      },
    });

    const academyEnrollment = await this.prisma.academyEnrollment.findUnique({
      where: {
        userId_academyId: {
          userId: input.userId,
          academyId: scope.academyId,
        },
      },
      include: { academy: { select: { orgId: true } } },
    });

    await this.prisma.academyEnrollment.update({
      where: {
        userId_academyId: {
          userId: input.userId,
          academyId: scope.academyId,
        },
      },
      data: { totalXPEarned: { increment: clampedAmount } },
    });

    await this.prisma.courseEnrollment.updateMany({
      where: {
        userId: input.userId,
        courseId: scope.courseId,
      },
      data: { totalXPEarned: { increment: clampedAmount } },
    });

    if (academyEnrollment) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await this.prisma.userStreak.upsert({
        where: {
          userId_orgId_date: {
            userId: input.userId,
            orgId: academyEnrollment.academy.orgId,
            date: today,
          },
        },
        create: {
          userId: input.userId,
          orgId: academyEnrollment.academy.orgId,
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

  async getAcademyXPSummary(
    userId: string,
    academyId: string,
  ): Promise<XPSummary> {
    const enrollment = await this.prisma.academyEnrollment.findUnique({
      where: { userId_academyId: { userId, academyId } },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const [todayAgg, weekAgg] = await Promise.all([
      this.prisma.xPEvent.aggregate({
        where: { userId, academyId, createdAt: { gte: todayStart } },
        _sum: { amount: true },
      }),
      this.prisma.xPEvent.aggregate({
        where: { userId, academyId, createdAt: { gte: weekStart } },
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

  async getAcademyWeeklyXPBreakdown(
    userId: string,
    academyId: string,
  ): Promise<DailyXP[]> {
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
        academyId,
        createdAt: { gte: weekStart },
      },
      select: { createdAt: true, amount: true },
    });

    for (const event of events) {
      const dateStr = event.createdAt.toISOString().split('T')[0];
      const day = days.find((candidate) => candidate.date === dateStr);
      if (day) {
        day.xp += event.amount;
      }
    }

    return days;
  }

  async getXPSinceLastQuiz(userId: string, academyId: string): Promise<number> {
    const enrollment = await this.prisma.academyEnrollment.findUnique({
      where: { userId_academyId: { userId, academyId } },
      select: { totalXPEarned: true },
    });

    if (!enrollment) {
      return 0;
    }

    // Find the most recent quiz XP event
    const lastQuizXP = await this.prisma.xPEvent.findFirst({
      where: {
        userId,
        academyId,
        source: 'quiz',
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    if (!lastQuizXP) {
      // No quiz taken yet — all XP counts
      return enrollment.totalXPEarned;
    }

    // Sum XP earned after the last quiz
    const result = await this.prisma.xPEvent.aggregate({
      where: {
        userId,
        academyId,
        createdAt: { gt: lastQuizXP.createdAt },
      },
      _sum: { amount: true },
    });

    return result._sum.amount ?? 0;
  }

  private async resolveScope(courseId: string, academyId?: string) {
    if (academyId) {
      return { academyId, courseId };
    }

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { academyId: true },
    });

    if (!course?.academyId) {
      throw new Error(`Course ${courseId} is missing academyId`);
    }

    return { academyId: course.academyId, courseId };
  }
}
