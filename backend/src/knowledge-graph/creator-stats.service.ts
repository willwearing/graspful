import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { activeConceptWhere } from './active-course-content';

export interface CreatorStats {
  students: number;
  avgCompletion: number;
  totalRevenue: number;
}

@Injectable()
export class CreatorStatsService {
  constructor(private prisma: PrismaService) {}

  async getStats(orgId: string): Promise<CreatorStats> {
    const [students, avgCompletion, totalRevenue] = await Promise.all([
      this.countStudents(orgId),
      this.calcAvgCompletion(orgId),
      this.calcTotalRevenue(orgId),
    ]);

    return { students, avgCompletion, totalRevenue };
  }

  /**
   * COUNT(DISTINCT userId) FROM CourseEnrollment WHERE course.orgId = orgId
   */
  private async countStudents(orgId: string): Promise<number> {
    const result = await this.prisma.courseEnrollment.findMany({
      where: { course: { orgId } },
      select: { userId: true },
      distinct: ['userId'],
    });
    return result.length;
  }

  /**
   * Average of (mastered concepts / total concepts) per enrollment.
   * Groups StudentConceptState by userId+courseId, computes mastered ratio,
   * then averages across all enrollment-level ratios.
   */
  private async calcAvgCompletion(orgId: string): Promise<number> {
    const states = await this.prisma.studentConceptState.findMany({
      where: {
        concept: activeConceptWhere({ course: { orgId } }),
      },
      select: {
        userId: true,
        masteryState: true,
        concept: {
          select: { courseId: true },
        },
      },
    });

    if (states.length === 0) return 0;

    // Group by (userId, courseId) and count total vs mastered
    const enrollmentMap = new Map<string, { total: number; mastered: number }>();
    for (const state of states) {
      const key = `${state.userId}:${state.concept.courseId}`;
      if (!enrollmentMap.has(key)) {
        enrollmentMap.set(key, { total: 0, mastered: 0 });
      }
      const entry = enrollmentMap.get(key)!;
      entry.total++;
      if (state.masteryState === 'mastered') {
        entry.mastered++;
      }
    }

    const ratios = Array.from(enrollmentMap.values()).map(
      (e) => (e.total > 0 ? e.mastered / e.total : 0),
    );

    return ratios.length > 0
      ? ratios.reduce((sum, r) => sum + r, 0) / ratios.length
      : 0;
  }

  /**
   * SUM(creatorPayout) FROM RevenueEvent WHERE orgId = orgId
   */
  private async calcTotalRevenue(orgId: string): Promise<number> {
    const result = await this.prisma.revenueEvent.aggregate({
      where: { orgId },
      _sum: { creatorPayout: true },
    });
    return result._sum.creatorPayout ?? 0;
  }
}
