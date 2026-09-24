import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard, OrgMembershipGuard, CurrentOrg, AcademyScopeGuard, RequireEnrollment } from '@/auth';
import type { OrgContext } from '@/auth/org-context';
import { LearningEngineService } from './learning-engine.service';

@Controller('orgs/:orgId/academies/:academyId')
@UseGuards(SupabaseAuthGuard, OrgMembershipGuard, AcademyScopeGuard)
@RequireEnrollment()
export class AcademyLearningEngineController {
  constructor(
    private engine: LearningEngineService,
  ) {}

  @Get('next-task')
  async getNextTask(
    @Param('academyId') academyId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.engine.getNextTask(org.userId, academyId);
  }

  @Get('study-session')
  async getStudySession(
    @Param('academyId') academyId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.engine.getStudySession(org.userId, academyId);
  }
}
