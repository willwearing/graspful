import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '@/prisma/prisma.service';
import { billingConfigured, billingReturnUrl, billingUnavailable } from './billing-configuration';

/** Platform fee percentage applied to learner subscriptions via Stripe Connect */
export const PLATFORM_FEE_PERCENT = 30;

@Injectable()
export class ConnectService {
  private stripe?: Stripe;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (secretKey) {
      this.stripe = new Stripe(secretKey);
    }
  }

  private getStripe(): Stripe {
    if (!this.stripe) throw billingUnavailable('Payment setup is not available yet.');
    return this.stripe;
  }

  async createConnectAccount(orgId: string): Promise<{ url: string }> {
    if (!billingConfigured(this.config)) throw billingUnavailable('Payment setup is not available yet.');
    const refreshUrl = billingReturnUrl(this.config, '/settings?connect=refresh');
    const returnUrl = billingReturnUrl(this.config, '/settings?connect=returned');
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: orgId } });

    if (org.stripeConnectAccountId) {
      const accountLink = await this.getStripe().accountLinks.create({
        account: org.stripeConnectAccountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });
      return { url: accountLink.url };
    }

    const account = await this.getStripe().accounts.create({
      type: 'express',
      metadata: { orgId, orgSlug: org.slug },
    });

    await this.prisma.organization.update({
      where: { id: orgId },
      data: { stripeConnectAccountId: account.id },
    });

    const accountLink = await this.getStripe().accountLinks.create({
      account: account.id,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return { url: accountLink.url };
  }

  async handleAccountUpdated(account: Stripe.Account): Promise<void> {
    if (!account.id) return;
    const org = await this.prisma.organization.findFirst({
      where: { stripeConnectAccountId: account.id },
    });
    if (!org) return;

    const isComplete = !!(account.charges_enabled && account.payouts_enabled);
    await this.prisma.organization.update({
      where: { id: org.id },
      data: { connectOnboardingComplete: isComplete },
    });
  }

  async getConnectStatus(orgId: string) {
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    return {
      setupAvailable: billingConfigured(this.config),
      hasConnectAccount: !!org.stripeConnectAccountId,
      onboardingComplete: org.connectOnboardingComplete,
    };
  }

  async getRevenue(orgId: string) {
    const events = await this.prisma.revenueEvent.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });

    const totals = events.reduce(
      (acc, e) => ({
        grossRevenue: acc.grossRevenue + e.grossAmount,
        platformFees: acc.platformFees + e.platformFee,
        creatorEarnings: acc.creatorEarnings + e.creatorPayout,
      }),
      { grossRevenue: 0, platformFees: 0, creatorEarnings: 0 },
    );

    return { ...totals, currency: 'usd', eventCount: events.length, recentEvents: events.slice(0, 20) };
  }

  async recordRevenueEvent(
    orgId: string,
    stripeInvoiceId: string,
    grossAmountCents: number,
    currency: string,
    learnerId?: string,
  ): Promise<void> {
    // Note: actual fee collected by Stripe may differ slightly due to rounding
    const platformFee = Math.round(grossAmountCents * (PLATFORM_FEE_PERCENT / 100));
    const creatorPayout = grossAmountCents - platformFee;

    // Stripe retries webhook deliveries. One invoice must produce one revenue row.
    await this.prisma.revenueEvent.upsert({
      where: { stripeInvoiceId },
      create: { orgId, stripeInvoiceId, grossAmount: grossAmountCents, platformFee, creatorPayout, currency, learnerId },
      update: {},
    });
  }

  async isPublishAllowed(orgId: string, hasPricing: boolean): Promise<{ allowed: boolean; reason?: string }> {
    if (!hasPricing) return { allowed: true };
    if (!billingConfigured(this.config)) {
      return { allowed: false, reason: 'Payments are not available yet. Complete the platform Stripe setup before publishing paid courses.' };
    }
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    if (!org.connectOnboardingComplete) {
      return { allowed: false, reason: 'Stripe Connect onboarding must be completed before publishing paid courses.' };
    }
    return { allowed: true };
  }
}
