import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '@/prisma/prisma.service';
import type { DailyXP, XPSummary } from '@graspful/shared';
import { EnrollmentService } from '@/student-model/enrollment.service';
import { startOfDayUtc, startOfWeekUtc } from '@/shared/utils/utc-date';

export interface RecordXPInput {
  userId: string;
  academyId?: string;
  courseId: string;
  source: 'lesson' | 'review' | 'quiz' | 'remediation' | 'bonus';
  amount: number;
  conceptId?: string;
  idempotencyKey?: string;
}

const DAILY_XP_CAP = 500;

@Injectable()
export class XPService {
  constructor(
    private prisma: PrismaService,
    private enrollments: EnrollmentService,
  ) {}

  async recordXPEvent(
    input: RecordXPInput,
    tx?: Prisma.TransactionClient,
  ): Promise<{ amount: number }> {
    if (input.amount <= 0 && !input.idempotencyKey) {
      return { amount: 0 };
    }

    if (tx) {
      // The caller owns rollback and retries for the entire operation.
      return this.recordXPInTransaction(input, tx);
    }

    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(
          (transaction) => this.recordXPInTransaction(input, transaction),
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        // Concurrent awards can conflict on the cap or a keyed event. Retry
        // the whole transaction so both the cap and existing award are read again.
        const code = (error as { code?: string })?.code;
        if (attempt >= 2 || (code !== 'P2034' && code !== 'P2002')) {
          throw error;
        }
      }
    }
  }

  private async recordXPInTransaction(
    input: RecordXPInput,
    tx: Prisma.TransactionClient,
  ): Promise<{ amount: number }> {
    const scope = await this.resolveScope(input.courseId, input.academyId, tx);
    const eventId = input.idempotencyKey
      ? this.idempotentEventId(input, scope.academyId)
      : undefined;

    if (eventId) {
      const existing = await tx.xPEvent.findUnique({
        where: { id: eventId },
        select: { amount: true },
      });
      if (existing) {
        return { amount: existing.amount };
      }
    }

    const todayStart = startOfDayUtc();
    const todayXP = await tx.xPEvent.aggregate({
      where: {
        userId: input.userId,
        academyId: scope.academyId,
        createdAt: { gte: todayStart },
      },
      _sum: { amount: true },
    });
    const remaining = Math.max(0, DAILY_XP_CAP - (todayXP._sum.amount ?? 0));
    const clampedAmount = Math.max(0, Math.min(input.amount, remaining));

    if (clampedAmount === 0 && !eventId) {
      return { amount: 0 };
    }

    // Persist keyed zero awards too, so a retry tomorrow cannot earn XP.
    await tx.xPEvent.create({
      data: {
        ...(eventId ? { id: eventId } : {}),
        userId: input.userId,
        academyId: scope.academyId,
        courseId: scope.courseId,
        source: input.source,
        amount: clampedAmount,
        conceptId: input.conceptId,
      },
    });

    if (clampedAmount === 0) {
      return { amount: 0 };
    }

    const academyEnrollment = await this.enrollments.findAcademyEnrollment(
      input.userId,
      scope.academyId,
      tx,
    );

    if (academyEnrollment) {
      await tx.academyEnrollment.update({
        where: {
          userId_academyId: {
            userId: input.userId,
            academyId: scope.academyId,
          },
        },
        data: { totalXPEarned: { increment: clampedAmount } },
      });
    }

    await tx.courseEnrollment.updateMany({
      where: {
        userId: input.userId,
        courseId: scope.courseId,
      },
      data: { totalXPEarned: { increment: clampedAmount } },
    });

    if (academyEnrollment) {
      await tx.userStreak.upsert({
        where: {
          userId_orgId_date: {
            userId: input.userId,
            orgId: academyEnrollment.academy.orgId,
            date: todayStart,
          },
        },
        create: {
          userId: input.userId,
          orgId: academyEnrollment.academy.orgId,
          date: todayStart,
          xpEarned: clampedAmount,
        },
        update: {
          xpEarned: { increment: clampedAmount },
        },
      });
    }

    return { amount: clampedAmount };
  }

  private idempotentEventId(input: RecordXPInput, academyId: string): string {
    // A scoped UUID v8 uses the existing primary key for retry protection.
    const bytes = createHash('sha256').update(JSON.stringify([
      'graspful-xp-event',
      input.userId,
      academyId,
      input.courseId,
      input.source,
      input.idempotencyKey,
    ])).digest().subarray(0, 16);
    bytes[6] = (bytes[6] & 0x0f) | 0x80;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = bytes.toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  async getXPSummary(userId: string, courseId: string): Promise<XPSummary> {
    const academyId = await this.enrollments.getAcademyIdForCourse(courseId);
    return this.getAcademyXPSummary(userId, academyId);
  }

  async getWeeklyXPBreakdown(userId: string, courseId: string): Promise<DailyXP[]> {
    const academyId = await this.enrollments.getAcademyIdForCourse(courseId);
    return this.getAcademyWeeklyXPBreakdown(userId, academyId);
  }

  async getAcademyXPSummary(
    userId: string,
    academyId: string,
  ): Promise<XPSummary> {
    const enrollment = await this.enrollments.requireAcademyEnrollment(userId, academyId);

    const todayStart = startOfDayUtc();

    const weekStart = startOfWeekUtc(todayStart);

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
      total: enrollment.totalXPEarned,
      dailyTarget: enrollment.dailyXPTarget,
      dailyCap: DAILY_XP_CAP,
    };
  }

  async getAcademyWeeklyXPBreakdown(
    userId: string,
    academyId: string,
  ): Promise<DailyXP[]> {
    await this.enrollments.requireAcademyEnrollment(userId, academyId);
    const days: DailyXP[] = [];
    const todayStart = startOfDayUtc();

    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(todayStart);
      dayStart.setUTCDate(todayStart.getUTCDate() - i);

      days.push({
        date: dayStart.toISOString().split('T')[0],
        xp: 0,
      });
    }

    const weekStart = new Date(todayStart);
    weekStart.setUTCDate(todayStart.getUTCDate() - 6);

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
    const enrollment = await this.enrollments.requireAcademyEnrollment(userId, academyId);

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

  private async resolveScope(
    courseId: string,
    academyId: string | undefined,
    tx: Prisma.TransactionClient,
  ) {
    if (academyId) {
      return { academyId, courseId };
    }

    return {
      academyId: await this.enrollments.getAcademyIdForCourse(courseId, tx),
      courseId,
    };
  }
}
