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

@Controller('orgs/:orgId/academies/:academyId/diagnostic')
@UseGuards(SupabaseAuthGuard, OrgMembershipGuard)
export class AcademyDiagnosticController {
  constructor(private diagnosticSession: DiagnosticSessionService) {}

  @Get('start')
  async startDiagnostic(
    @Param('academyId') academyId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.diagnosticSession.startDiagnostic(
      org.orgId,
      org.userId,
      academyId,
    );
  }

  @Post('answer')
  async submitAnswer(
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
    @Param('sessionId') sessionId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.diagnosticSession.getResult(sessionId, org.userId);
  }
}
