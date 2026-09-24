import {
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard, OrgMembershipGuard, CurrentOrg, CourseScopeGuard, RequireEnrollment } from '@/auth';
import type { OrgContext } from '@/auth/org-context';
import { EnrollmentService } from './enrollment.service';
import { StudentStateService } from './student-state.service';
import { SectionExamService } from '@/assessment/section-exam.service';

/** @deprecated Use AcademyStudentModelController instead. Kept as compatibility shim. */
@Controller('orgs/:orgId/courses/:courseId')
@UseGuards(SupabaseAuthGuard, OrgMembershipGuard, CourseScopeGuard)
@RequireEnrollment()
export class StudentModelController {
  constructor(
    private enrollment: EnrollmentService,
    private studentState: StudentStateService,
    private sectionExamService: SectionExamService,
  ) {}

  @Post('enroll')
  @RequireEnrollment(false)
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

  @Get('sections')
  async getSectionStates(
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.sectionExamService.getSectionStates(org.userId, courseId);
  }

  @Get('profile')
  async getProfile(
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    const [profile, sectionStates] = await Promise.all([
      this.studentState.getProfileSummary(org.userId, courseId),
      this.sectionExamService.getSectionStates(org.userId, courseId),
    ]);

    return {
      ...profile,
      certifiedSections: sectionStates.filter((s) => s.status === 'certified').length,
      examReadySections: sectionStates.filter((s) => s.status === 'exam_ready').length,
    };
  }
}
