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
import { PostHogService } from '@/shared/application/posthog.service';
import { DiagnosticSessionService } from './diagnostic-session.service';
import type { DiagnosticAnswerInput } from './domain/diagnostic-session.types';

@Controller('orgs/:orgId/academies/:academyId/diagnostic')
@UseGuards(SupabaseAuthGuard, OrgMembershipGuard)
export class AcademyDiagnosticController {
  constructor(
    private diagnosticSession: DiagnosticSessionService,
    private posthog: PostHogService,
  ) {}

  @Post('start')
  async startDiagnostic(
    @Param('academyId') academyId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    const result = await this.diagnosticSession.startDiagnostic(
      org.orgId,
      org.userId,
      academyId,
    );
    this.posthog.capture({ distinctId: org.userId }, 'diagnostic started', {
      academy_id: academyId,
      org_id: org.orgId,
      session_id: result.sessionId,
    });
    return result;
  }

  @Post('answer')
  async submitAnswer(
    @Body() body: DiagnosticAnswerInput & { sessionId: string },
    @CurrentOrg() org: OrgContext,
  ) {
    return this.diagnosticSession.submitAnswer(body.sessionId, org.userId, {
      answer: body.answer,
      responseTimeMs: body.responseTimeMs,
    });
  }

  @Get('result/:sessionId')
  async getResult(
    @Param('sessionId') sessionId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    const result = await this.diagnosticSession.getResult(sessionId, org.userId);
    this.posthog.capture({ distinctId: org.userId }, 'diagnostic completed', {
      session_id: sessionId,
      org_id: org.orgId,
    });
    return result;
  }
}
