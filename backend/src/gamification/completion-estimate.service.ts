import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { CompletionEstimate } from '@graspful/shared';
import { EnrollmentService } from '@/student-model/enrollment.service';
import { StudentStateService } from '@/student-model/student-state.service';
import { activeConceptWhere } from '@/knowledge-graph/active-course-content';

// Average XP per concept (based on XP awards table: lesson ~15 + review ~4 = ~19)
const AVG_XP_PER_CONCEPT = 19;

@Injectable()
export class CompletionEstimateService {
  constructor(
    private prisma: PrismaService,
    private studentState: StudentStateService,
    private enrollments: EnrollmentService,
  ) {}

  async getAcademyEstimate(
    userId: string,
    academyId: string,
  ): Promise<CompletionEstimate> {
    const enrollment = await this.enrollments.requireAcademyEnrollment(userId, academyId);
    const [totalConcepts, masteredConcepts] = await Promise.all([
      this.prisma.concept.count({
        where: activeConceptWhere({ course: { academyId } }),
      }),
      this.studentState.countMasteredConcepts(userId, { academyId }),
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
        dailyXPTarget: enrollment.dailyXPTarget,
      };
    }

    const totalXP = enrollment.totalXPEarned;
    const enrolledAt = enrollment.createdAt;
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
      dailyXPTarget: enrollment.dailyXPTarget,
    };
  }

  async getEstimate(userId: string, courseId: string): Promise<CompletionEstimate> {
    const academyId = await this.enrollments.getAcademyIdForCourse(courseId);
    return this.getAcademyEstimate(userId, academyId);
  }
}
