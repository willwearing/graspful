import {
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard, OrgMembershipGuard, CurrentOrg } from '@/auth';
import type { OrgContext } from '@/auth/guards/org-membership.guard';
import { EnrollmentService } from './enrollment.service';
import { StudentStateService } from './student-state.service';
import { PrismaService } from '@/prisma/prisma.service';

@Controller('orgs/:orgId/academies/:academyId')
@UseGuards(SupabaseAuthGuard, OrgMembershipGuard)
export class AcademyStudentModelController {
  constructor(
    private enrollment: EnrollmentService,
    private studentState: StudentStateService,
    private prisma: PrismaService,
  ) {}

  @Post('enroll')
  async enroll(
    @Param('academyId') academyId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.enrollment.enrollInAcademy(org.orgId, org.userId, academyId);
  }

  @Get('mastery')
  async getMastery(
    @Param('academyId') academyId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.studentState.getConceptStatesForAcademy(org.userId, academyId);
  }

  @Get('course-mastery')
  async getCourseMastery(
    @Param('academyId') academyId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    const courseMap = await this.studentState.getAcademyCourseMasterySummary(
      org.userId,
      academyId,
    );

    // Enrich with course titles
    const courseIds = Array.from(courseMap.keys());
    const courses = await this.prisma.course.findMany({
      where: { id: { in: courseIds } },
      select: { id: true, name: true, sortOrder: true },
    });
    const courseInfo = new Map(courses.map((c) => [c.id, c]));

    return Array.from(courseMap.entries())
      .map(([courseId, stats]) => ({
        courseId,
        courseName: courseInfo.get(courseId)?.name ?? '',
        sortOrder: courseInfo.get(courseId)?.sortOrder ?? 0,
        ...stats,
        completionPercent:
          stats.total > 0
            ? Math.round((stats.mastered / stats.total) * 1000) / 10
            : 0,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  @Get('profile')
  async getProfile(
    @Param('academyId') academyId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    const [states, courseStates, diagnosticCompleted] = await Promise.all([
      this.studentState.getConceptStatesForAcademy(org.userId, academyId),
      this.prisma.studentCourseState.findMany({
        where: { userId: org.userId, course: { academyId } },
        select: { status: true },
      }),
      this.studentState.isDiagnosticCompleted(org.userId, academyId),
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
      activeCourses: courseStates.filter((state) => state.status === 'active')
        .length,
      completedCourses: courseStates.filter(
        (state) => state.status === 'completed',
      ).length,
    };
  }
}
