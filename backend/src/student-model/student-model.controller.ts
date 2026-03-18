import {
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard, OrgMembershipGuard, CurrentOrg } from '@/auth';
import { OrgContext } from '@/auth/guards/org-membership.guard';
import { EnrollmentService } from './enrollment.service';
import { StudentStateService } from './student-state.service';

@Controller('orgs/:orgId/courses/:courseId')
@UseGuards(SupabaseAuthGuard, OrgMembershipGuard)
export class StudentModelController {
  constructor(
    private enrollment: EnrollmentService,
    private studentState: StudentStateService,
  ) {}

  @Post('enroll')
  async enroll(
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.enrollment.enrollStudent(org.orgId, org.userId, courseId);
  }

  @Get('mastery')
  async getMastery(
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.studentState.getConceptStates(org.userId, courseId);
  }

  @Get('profile')
  async getProfile(
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    const states = await this.studentState.getConceptStates(org.userId, courseId);

    const counts = {
      mastered: 0,
      in_progress: 0,
      needs_review: 0,
      unstarted: 0,
    };

    for (const state of states) {
      const key = state.masteryState as keyof typeof counts;
      if (key in counts) counts[key]++;
    }

    const total = states.length;
    const diagnosticCompleted = await this.studentState.isDiagnosticCompleted(org.userId, courseId);
    return {
      totalConcepts: total,
      mastered: counts.mastered,
      inProgress: counts.in_progress,
      needsReview: counts.needs_review,
      unstarted: counts.unstarted,
      completionPercent: total > 0 ? (counts.mastered / total) * 100 : 0,
      diagnosticCompleted,
    };
  }
}
