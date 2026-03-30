import {
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard, OrgMembershipGuard, CurrentOrg } from '@/auth';
import type { OrgContext } from '@/auth/guards/org-membership.guard';
import { PostHogService } from '@/shared/application/posthog.service';
import { EnrollmentService } from './enrollment.service';
import { StudentStateService } from './student-state.service';
import { AcademyProgressQueryService } from './queries/academy-progress.query';

@Controller('orgs/:orgId/academies/:academyId')
@UseGuards(SupabaseAuthGuard, OrgMembershipGuard)
export class AcademyStudentModelController {
  constructor(
    private enrollment: EnrollmentService,
    private studentState: StudentStateService,
    private academyProgressQuery: AcademyProgressQueryService,
    private posthog: PostHogService,
  ) {}

  @Post('enroll')
  async enroll(
    @Param('academyId') academyId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    const result = await this.enrollment.enrollInAcademy(org.orgId, org.userId, academyId);
    this.posthog.capture({ distinctId: org.userId }, 'student enrolled', {
      academy_id: academyId,
      org_id: org.orgId,
    });
    return result;
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
    return this.academyProgressQuery.getCourseMasterySummary(
      org.userId,
      academyId,
    );
  }

  @Get('profile')
  async getProfile(
    @Param('academyId') academyId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.academyProgressQuery.getProfileSummary(org.userId, academyId);
  }
}
