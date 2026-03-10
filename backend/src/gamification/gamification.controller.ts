import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard, OrgMembershipGuard, CurrentOrg, OrgContext } from '@/auth';
import { XPService } from './xp.service';
import { StreakService } from './streak.service';
import { LeaderboardService } from './leaderboard.service';
import { CompletionEstimateService } from './completion-estimate.service';

@Controller('orgs/:orgId/courses/:courseId')
@UseGuards(SupabaseAuthGuard, OrgMembershipGuard)
export class GamificationController {
  constructor(
    private xpService: XPService,
    private streakService: StreakService,
    private leaderboardService: LeaderboardService,
    private completionEstimate: CompletionEstimateService,
  ) {}

  @Get('xp')
  async getXPSummary(
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.xpService.getXPSummary(org.userId, courseId);
  }

  @Get('xp/weekly')
  async getWeeklyXP(
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.xpService.getWeeklyXPBreakdown(org.userId, courseId);
  }

  @Get('streak')
  async getStreak(
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.streakService.getStreakStatus(org.userId, courseId);
  }

  @Get('leaderboard')
  async getLeaderboard(
    @Param('orgId') orgId: string,
    @Param('courseId') courseId: string,
  ) {
    return this.leaderboardService.getWeeklyLeaderboard(orgId, courseId);
  }

  @Get('stats')
  async getStats(
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.completionEstimate.getEstimate(org.userId, courseId);
  }
}
