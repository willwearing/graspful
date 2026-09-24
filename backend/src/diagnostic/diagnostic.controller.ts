import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard, OrgMembershipGuard, CurrentOrg, CurrentCourse, CourseScopeGuard, RequireEnrollment } from '@/auth';
import type { CourseContext } from '@/auth/guards/course-scope.guard';
import type { OrgContext } from '@/auth/org-context';
import { DiagnosticSessionService } from './diagnostic-session.service';
import { SubmitDiagnosticAnswerDto } from './dto/submit-diagnostic-answer.dto';

/** @deprecated Use AcademyDiagnosticController instead. Kept as compatibility shim. */
@Controller('orgs/:orgId/courses/:courseId/diagnostic')
@UseGuards(SupabaseAuthGuard, OrgMembershipGuard, CourseScopeGuard)
@RequireEnrollment()
export class DiagnosticController {
  constructor(private diagnosticSession: DiagnosticSessionService) {}

  @Post('start')
  async startDiagnostic(
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.diagnosticSession.startDiagnosticForCourse(
      org.orgId,
      org.userId,
      courseId,
    );
  }

  @Post('answer')
  async submitAnswer(
    @CurrentCourse() course: CourseContext,
    @Body() body: SubmitDiagnosticAnswerDto,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.diagnosticSession.submitAnswer(body.sessionId, org.userId, {
      answer: body.answer,
      responseTimeMs: body.responseTimeMs,
    }, course.academyId);
  }

  @Get('result/:sessionId')
  async getResult(
    @CurrentCourse() course: CourseContext,
    @Param('sessionId') sessionId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.diagnosticSession.getResult(sessionId, org.userId, course.academyId);
  }
}
