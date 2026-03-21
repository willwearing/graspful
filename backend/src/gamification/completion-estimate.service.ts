import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface CompletionEstimate {
  completionPercent: number;
  totalConcepts: number;
  masteredConcepts: number;
  remainingConcepts: number;
  averageDailyXP: number;
  estimatedWeeksRemaining: number | null;
  dailyXPTarget: number;
}

// Average XP per concept (based on XP awards table: lesson ~15 + review ~4 = ~19)
const AVG_XP_PER_CONCEPT = 19;

@Injectable()
export class CompletionEstimateService {
  constructor(private prisma: PrismaService) {}

  async getAcademyEstimate(
    userId: string,
    academyId: string,
  ): Promise<CompletionEstimate> {
    const [totalConcepts, masteredConcepts, enrollment] = await Promise.all([
      this.prisma.concept.count({
        where: { course: { academyId } },
      }),
      this.prisma.studentConceptState.count({
        where: {
          userId,
          concept: { course: { academyId } },
          masteryState: 'mastered',
        },
      }),
      this.prisma.academyEnrollment.findUnique({
        where: { userId_academyId: { userId, academyId } },
      }),
    ]);

    const completionPercent =
      totalConcepts > 0 ? Math.round((masteredConcepts / totalConcepts) * 100) : 0;

    const remainingConcepts = totalConcepts - masteredConcepts;

    if (completionPercent >= 100) {
      return {
        completionPercent: 100,
        totalConcepts,
        masteredConcepts,
        remainingConcepts: 0,
        averageDailyXP: 0,
        estimatedWeeksRemaining: 0,
        dailyXPTarget: enrollment?.dailyXPTarget ?? 40,
      };
    }

    const totalXP = enrollment?.totalXPEarned ?? 0;
    const enrolledAt = enrollment?.createdAt ?? new Date();
    const daysSinceEnrollment = Math.max(
      1,
      Math.ceil((Date.now() - enrolledAt.getTime()) / (1000 * 60 * 60 * 24)),
    );

    const averageDailyXP = totalXP / daysSinceEnrollment;

    let estimatedWeeksRemaining: number | null = null;
    if (averageDailyXP > 0) {
      const estimatedRemainingXP = remainingConcepts * AVG_XP_PER_CONCEPT;
      const estimatedDaysRemaining = estimatedRemainingXP / averageDailyXP;
      estimatedWeeksRemaining = Math.round((estimatedDaysRemaining / 7) * 10) / 10;
    }

    return {
      completionPercent,
      totalConcepts,
      masteredConcepts,
      remainingConcepts,
      averageDailyXP: Math.round(averageDailyXP * 10) / 10,
      estimatedWeeksRemaining,
      dailyXPTarget: enrollment?.dailyXPTarget ?? 40,
    };
  }

  async getEstimate(userId: string, courseId: string): Promise<CompletionEstimate> {
    const [totalConcepts, masteredConcepts, enrollment] = await Promise.all([
      this.prisma.concept.count({ where: { courseId } }),
      this.prisma.studentConceptState.count({
        where: { userId, concept: { courseId }, masteryState: 'mastered' },
      }),
      this.prisma.courseEnrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
      }),
    ]);

    const completionPercent =
      totalConcepts > 0 ? Math.round((masteredConcepts / totalConcepts) * 100) : 0;

    const remainingConcepts = totalConcepts - masteredConcepts;

    if (completionPercent >= 100) {
      return {
        completionPercent: 100,
        totalConcepts,
        masteredConcepts,
        remainingConcepts: 0,
        averageDailyXP: 0,
        estimatedWeeksRemaining: 0,
        dailyXPTarget: enrollment?.dailyXPTarget ?? 40,
      };
    }

    const totalXP = enrollment?.totalXPEarned ?? 0;
    const enrolledAt = enrollment?.createdAt ?? new Date();
    const daysSinceEnrollment = Math.max(
      1,
      Math.ceil((Date.now() - enrolledAt.getTime()) / (1000 * 60 * 60 * 24)),
    );

    const averageDailyXP = totalXP / daysSinceEnrollment;

    let estimatedWeeksRemaining: number | null = null;
    if (averageDailyXP > 0) {
      const estimatedRemainingXP = remainingConcepts * AVG_XP_PER_CONCEPT;
      const estimatedDaysRemaining = estimatedRemainingXP / averageDailyXP;
      estimatedWeeksRemaining = Math.round((estimatedDaysRemaining / 7) * 10) / 10;
    }

    return {
      completionPercent,
      totalConcepts,
      masteredConcepts,
      remainingConcepts,
      averageDailyXP: Math.round(averageDailyXP * 10) / 10,
      estimatedWeeksRemaining,
      dailyXPTarget: enrollment?.dailyXPTarget ?? 40,
    };
  }
}
