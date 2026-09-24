import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard, OrgMembershipGuard, CurrentOrg } from '@/auth';
import type { OrgContext } from '@/auth';
import { XPService } from './xp.service';
import { StreakService } from './streak.service';
import { LeaderboardService } from './leaderboard.service';
import { CompletionEstimateService } from './completion-estimate.service';
import { CourseProgressReadService } from './course-progress-read.service';
import { StudentStateService } from '@/student-model/student-state.service';

@Controller('orgs/:orgId/academies/:academyId')
@UseGuards(SupabaseAuthGuard, OrgMembershipGuard)
export class AcademyGamificationController {
  constructor(
    private xpService: XPService,
    private streakService: StreakService,
    private leaderboardService: LeaderboardService,
    private completionEstimate: CompletionEstimateService,
    private courseProgressReads: CourseProgressReadService,
    private studentState: StudentStateService,
  ) {}

  @Get('xp')
  async getXPSummary(
    @Param('academyId') academyId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.xpService.getAcademyXPSummary(org.userId, academyId);
  }

  @Get('xp/weekly')
  async getWeeklyXP(
    @Param('academyId') academyId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.xpService.getAcademyWeeklyXPBreakdown(org.userId, academyId);
  }

  @Get('streak')
  async getStreak(
    @Param('academyId') academyId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.streakService.getAcademyStreakStatus(org.userId, academyId);
  }

  @Get('leaderboard')
  async getLeaderboard(
    @Param('academyId') academyId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    await this.studentState.assertAcademyAccess(org.userId, org.orgId, academyId);
    return this.leaderboardService.getAcademyWeeklyLeaderboard(org.orgId, academyId);
  }

  @Get('stats')
  async getStats(
    @Param('academyId') academyId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.completionEstimate.getAcademyEstimate(org.userId, academyId);
  }

  @Get('graph')
  async getGraph(
    @Param('academyId') academyId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.courseProgressReads.getAcademyGraph(org.userId, academyId, org.orgId);
  }
}
