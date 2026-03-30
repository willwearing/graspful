import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtOrApiKeyGuard, OrgMembershipGuard, CurrentOrg } from '@/auth';
import type { OrgContext } from '@/auth/guards/org-membership.guard';
import { MinRole } from '@/auth/decorators/min-role.decorator';
import { PostHogService } from '@/shared/application/posthog.service';
import { BillingService } from './billing.service';

@Controller('orgs/:orgId/billing')
@UseGuards(JwtOrApiKeyGuard, OrgMembershipGuard)
export class BillingController {
  constructor(
    private billing: BillingService,
    private posthog: PostHogService,
  ) {}

  @Post('checkout')
  @MinRole('admin')
  async createCheckout(
    @CurrentOrg() org: OrgContext,
    @Body() body: { plan: 'individual' | 'team'; interval?: 'month' | 'year'; returnUrl?: string },
  ) {
    const baseUrl = this.sanitizeReturnUrl(body.returnUrl) || 'http://localhost:3001';
    const url = await this.billing.createCheckoutSession(
      org.orgId,
      body.plan,
      body.interval ?? 'month',
      `${baseUrl}/settings?billing=success`,
      `${baseUrl}/settings?billing=canceled`,
    );
    this.posthog.capture({ distinctId: org.userId }, 'checkout started', {
      org_id: org.orgId,
      plan: body.plan,
      interval: body.interval ?? 'month',
    });
    return { url };
  }

  @Post('portal')
  @MinRole('admin')
  async createPortal(
    @CurrentOrg() org: OrgContext,
    @Body() body: { returnUrl?: string },
  ) {
    const returnUrl = this.sanitizeReturnUrl(body.returnUrl) || 'http://localhost:3001/settings';
    const url = await this.billing.createPortalSession(org.orgId, returnUrl);
    return { url };
  }

  /** Validate returnUrl to prevent open redirect. Must start with / and not //. */
  private sanitizeReturnUrl(url?: string): string | undefined {
    if (!url) return undefined;
    if (url.startsWith('/') && !url.startsWith('//')) return url;
    return '/dashboard';
  }

  @Get('subscription')
  async getSubscription(@CurrentOrg() org: OrgContext) {
    return this.billing.getSubscription(org.orgId);
  }
}
