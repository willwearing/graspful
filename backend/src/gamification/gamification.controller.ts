import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard, OrgMembershipGuard, CurrentOrg, CourseScopeGuard, RequireEnrollment } from '@/auth';
import type { OrgContext } from '@/auth/org-context';
import { XPService } from './xp.service';
import { StreakService } from './streak.service';
import { LeaderboardService } from './leaderboard.service';
import { CompletionEstimateService } from './completion-estimate.service';
import { CourseProgressReadService } from './course-progress-read.service';

@Controller('orgs/:orgId/courses/:courseId')
@UseGuards(SupabaseAuthGuard, OrgMembershipGuard, CourseScopeGuard)
@RequireEnrollment()
export class GamificationController {
  constructor(
    private xpService: XPService,
    private streakService: StreakService,
    private leaderboardService: LeaderboardService,
    private completionEstimate: CompletionEstimateService,
    private courseProgressReads: CourseProgressReadService,
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
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.leaderboardService.getWeeklyLeaderboard(org.orgId, courseId, org.userId);
  }

  @Get('stats')
  async getStats(
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.completionEstimate.getEstimate(org.userId, courseId);
  }

  @Get('graph')
  async getGraph(
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.courseProgressReads.getGraph(org.userId, courseId, org.orgId);
  }
}
