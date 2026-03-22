import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard, OrgMembershipGuard, CurrentOrg } from '@/auth';
import type { OrgContext } from '@/auth/guards/org-membership.guard';
import { DiagnosticSessionService } from './diagnostic-session.service';

/** @deprecated Use AcademyDiagnosticController instead. Kept as compatibility shim. */
@Controller('orgs/:orgId/courses/:courseId/diagnostic')
@UseGuards(SupabaseAuthGuard, OrgMembershipGuard)
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
    @Param('courseId') courseId: string,
    @Body() body: { sessionId: string; answer: any; responseTimeMs: number },
    @CurrentOrg() org: OrgContext,
  ) {
    return this.diagnosticSession.submitAnswer(body.sessionId, org.userId, {
      answer: body.answer,
      responseTimeMs: body.responseTimeMs,
    });
  }

  @Get('result/:sessionId')
  async getResult(
    @Param('courseId') courseId: string,
    @Param('sessionId') sessionId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.diagnosticSession.getResult(sessionId, org.userId);
  }
}
