import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { StudentStateService } from '../student-state.service';

@Injectable()
export class AcademyProgressQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentState: StudentStateService,
  ) {}

  async getCourseMasterySummary(userId: string, academyId: string) {
    const courseMap = await this.studentState.getAcademyCourseMasterySummary(
      userId,
      academyId,
    );
    const courseIds = Array.from(courseMap.keys());
    const courses = await this.prisma.course.findMany({
      where: { id: { in: courseIds } },
      select: { id: true, name: true, sortOrder: true },
    });
    const courseInfo = new Map(courses.map((course) => [course.id, course]));

    return Array.from(courseMap.entries())
      .map(([courseId, stats]) => ({
        courseId,
        courseName: courseInfo.get(courseId)?.name ?? '',
        sortOrder: courseInfo.get(courseId)?.sortOrder ?? 0,
        ...stats,
        completionPercent:
          stats.total > 0 ? Math.round((stats.mastered / stats.total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getProfileSummary(userId: string, academyId: string) {
    const [states, courseStates, diagnosticCompleted] = await Promise.all([
      this.studentState.getConceptStatesForAcademy(userId, academyId),
      this.prisma.studentCourseState.findMany({
        where: { userId, course: { academyId } },
        select: { status: true },
      }),
      this.studentState.isDiagnosticCompleted(userId, academyId),
    ]);

    const counts = {
      mastered: 0,
      in_progress: 0,
      needs_review: 0,
      unstarted: 0,
    };

    for (const state of states) {
      const key = state.masteryState as keyof typeof counts;
      if (key in counts) {
        counts[key]++;
      }
    }

    const total = states.length;

    return {
      totalConcepts: total,
      mastered: counts.mastered,
      inProgress: counts.in_progress,
      needsReview: counts.needs_review,
      unstarted: counts.unstarted,
      completionPercent: total > 0 ? (counts.mastered / total) * 100 : 0,
      diagnosticCompleted,
      activeCourses: courseStates.filter((state) => state.status === 'active').length,
      completedCourses: courseStates.filter((state) => state.status === 'completed').length,
    };
  }
}
