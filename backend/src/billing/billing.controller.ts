import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard, OrgMembershipGuard, CurrentOrg } from '@/auth';
import { OrgContext } from '@/auth/guards/org-membership.guard';
import { MinRole } from '@/auth/decorators/min-role.decorator';
import { BillingService } from './billing.service';

@Controller('api/v1/orgs/:orgId/billing')
@UseGuards(SupabaseAuthGuard, OrgMembershipGuard)
export class BillingController {
  constructor(private billing: BillingService) {}

  @Post('checkout')
  @MinRole('admin')
  async createCheckout(
    @CurrentOrg() org: OrgContext,
    @Body() body: { plan: 'individual' | 'team'; interval?: 'month' | 'year'; returnUrl?: string },
  ) {
    const baseUrl = body.returnUrl || 'http://localhost:3001';
    const url = await this.billing.createCheckoutSession(
      org.orgId,
      body.plan,
      body.interval ?? 'month',
      `${baseUrl}/settings?billing=success`,
      `${baseUrl}/settings?billing=canceled`,
    );
    return { url };
  }

  @Post('portal')
  @MinRole('admin')
  async createPortal(
    @CurrentOrg() org: OrgContext,
    @Body() body: { returnUrl?: string },
  ) {
    const returnUrl = body.returnUrl || 'http://localhost:3001/settings';
    const url = await this.billing.createPortalSession(org.orgId, returnUrl);
    return { url };
  }

  @Get('subscription')
  async getSubscription(@CurrentOrg() org: OrgContext) {
    return this.billing.getSubscription(org.orgId);
  }
}
