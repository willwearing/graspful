import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtOrApiKeyGuard, OrgMembershipGuard, CurrentOrg } from '@/auth';
import type { OrgContext } from '@/auth/guards/org-membership.guard';
import { MinRole } from '@/auth/decorators/min-role.decorator';
import { ConnectService } from './connect.service';

@Controller('orgs/:orgId/billing')
@UseGuards(JwtOrApiKeyGuard, OrgMembershipGuard)
export class ConnectController {
  constructor(private connect: ConnectService) {}

  @Post('connect-onboarding')
  @MinRole('admin')
  async createConnectOnboarding(@CurrentOrg() org: OrgContext) {
    return this.connect.createConnectAccount(org.orgId);
  }

  @Get('connect-status')
  async getConnectStatus(@CurrentOrg() org: OrgContext) {
    return this.connect.getConnectStatus(org.orgId);
  }

  @Get('revenue')
  @MinRole('admin')
  async getRevenue(@CurrentOrg() org: OrgContext) {
    return this.connect.getRevenue(org.orgId);
  }
}
