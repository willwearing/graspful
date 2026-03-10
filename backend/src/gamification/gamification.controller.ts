import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard, OrgMembershipGuard, CurrentOrg, OrgContext } from '@/auth';
import { PrismaService } from '@/prisma/prisma.service';
import { XPService } from './xp.service';
import { StreakService } from './streak.service';
import { LeaderboardService } from './leaderboard.service';
import { CompletionEstimateService } from './completion-estimate.service';

@Controller('orgs/:orgId/courses/:courseId')
@UseGuards(SupabaseAuthGuard, OrgMembershipGuard)
export class GamificationController {
  constructor(
    private prisma: PrismaService,
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

  @Get('graph')
  async getGraph(
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    const [concepts, edges] = await Promise.all([
      this.prisma.concept.findMany({
        where: { courseId },
        select: { id: true, name: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.prerequisiteEdge.findMany({
        where: {
          sourceConcept: { courseId },
        },
        select: { sourceConceptId: true, targetConceptId: true },
      }),
    ]);

    // Get mastery states for this user
    const states = await this.prisma.studentConceptState.findMany({
      where: { userId: org.userId, conceptId: { in: concepts.map((c) => c.id) } },
      select: { conceptId: true, masteryState: true },
    });
    const stateMap = new Map(states.map((s) => [s.conceptId, s.masteryState]));

    return {
      concepts: concepts.map((c) => ({
        id: c.id,
        name: c.name,
        masteryState: stateMap.get(c.id) ?? 'unstarted',
      })),
      edges: edges.map((e) => ({
        sourceConceptId: e.sourceConceptId,
        targetConceptId: e.targetConceptId,
      })),
    };
  }
}
