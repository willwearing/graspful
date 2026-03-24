import { Controller, Get, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard, OrgMembershipGuard, CurrentOrg } from '@/auth';
import type { OrgContext } from '@/auth/guards/org-membership.guard';
import { CreatorStatsService, CreatorStats } from './creator-stats.service';

@Controller('orgs/:orgId/creator')
@UseGuards(SupabaseAuthGuard, OrgMembershipGuard)
export class CreatorController {
  constructor(private creatorStats: CreatorStatsService) {}

  @Get('stats')
  async getStats(@CurrentOrg() org: OrgContext): Promise<CreatorStats> {
    return this.creatorStats.getStats(org.orgId);
  }
}
