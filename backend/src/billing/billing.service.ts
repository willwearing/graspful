import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlanTier } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class BillingService {
  private stripe!: Stripe;

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
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY.');
    }
    return this.stripe;
  }

  async getOrCreateCustomer(orgId: string): Promise<string> {
    const existing = await this.prisma.subscription.findUnique({
      where: { orgId },
    });

    if (existing) return existing.stripeCustomerId;

    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
    });

    const customer = await this.getStripe().customers.create({
      metadata: { orgId },
      name: org.name,
    });

    await this.prisma.subscription.create({
      data: {
        orgId,
        stripeCustomerId: customer.id,
        plan: 'free',
        status: 'active',
      },
    });

    return customer.id;
  }

  async createCheckoutSession(
    orgId: string,
    plan: 'individual' | 'team',
    interval: 'month' | 'year',
    successUrl: string,
    cancelUrl: string,
  ): Promise<string> {
    const customerId = await this.getOrCreateCustomer(orgId);

    const priceId = this.config.getOrThrow<string>(
      `STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}LY`,
    );

    const session = await this.getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { orgId, plan },
    });

    return session.url!;
  }

  async createPortalSession(orgId: string, returnUrl: string): Promise<string> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { orgId },
    });

    if (!subscription) {
      throw new Error('No subscription found for this organization');
    }

    const session = await this.getStripe().billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    });

    return session.url;
  }

  async getSubscription(orgId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { orgId },
    });

    if (!subscription) {
      return {
        plan: 'free' as PlanTier,
        status: 'active' as const,
        trialEndsAt: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        maxMembers: 1,
      };
    }

    return {
      plan: subscription.plan,
      status: subscription.status,
      trialEndsAt: subscription.trialEndsAt,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      maxMembers: subscription.maxMembers,
    };
  }

  async createLearnerCheckoutSession(
    orgId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<string> {
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    if (!org.stripeConnectAccountId) {
      throw new Error('Organization does not have Stripe Connect configured');
    }

    const session = await this.getStripe().checkout.sessions.create(
      {
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: { application_fee_percent: 30 },
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { orgId },
      },
      {
        stripeAccount: org.stripeConnectAccountId,
      },
    );

    return session.url!;
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    const obj = event.data.object as any;
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(obj);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(obj);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(obj);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(obj);
        break;
    }
  }

  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const secret = this.config.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');
    return this.getStripe().webhooks.constructEvent(payload, signature, secret);
  }

  private async handleCheckoutCompleted(session: any): Promise<void> {
    const orgId = session.metadata?.orgId;
    const plan = session.metadata?.plan as PlanTier | undefined;
    if (!orgId || !plan) return;

    const stripeSub: any = await this.getStripe().subscriptions.retrieve(
      session.subscription as string,
    );

    await this.prisma.subscription.upsert({
      where: { orgId },
      create: {
        orgId,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: stripeSub.id,
        plan,
        status: this.mapStripeStatus(stripeSub.status),
        currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
        maxMembers: plan === 'team' ? 10 : 1,
      },
      update: {
        stripeSubscriptionId: stripeSub.id,
        plan,
        status: this.mapStripeStatus(stripeSub.status),
        currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
        maxMembers: plan === 'team' ? 10 : 1,
      },
    });
  }

  private async handleSubscriptionUpdated(sub: any): Promise<void> {
    const existing = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: sub.id },
    });
    if (!existing) return;

    await this.prisma.subscription.update({
      where: { stripeSubscriptionId: sub.id },
      data: {
        status: this.mapStripeStatus(sub.status),
        currentPeriodStart: new Date(sub.current_period_start * 1000),
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        ...(sub.trial_end ? { trialEndsAt: new Date(sub.trial_end * 1000) } : {}),
      },
    });
  }

  private async handleSubscriptionDeleted(sub: any): Promise<void> {
    const existing = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: sub.id },
    });
    if (!existing) return;

    await this.prisma.subscription.update({
      where: { stripeSubscriptionId: sub.id },
      data: {
        status: 'canceled',
        plan: 'free',
        cancelAtPeriodEnd: false,
      },
    });
  }

  private async handlePaymentFailed(invoice: any): Promise<void> {
    const subId = invoice.subscription as string | null;
    if (!subId) return;

    const existing = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subId },
    });
    if (!existing) return;

    await this.prisma.subscription.update({
      where: { stripeSubscriptionId: subId },
      data: { status: 'past_due' },
    });
  }

  private mapStripeStatus(status: string) {
    const map: Record<string, string> = {
      trialing: 'trialing',
      active: 'active',
      past_due: 'past_due',
      canceled: 'canceled',
      unpaid: 'unpaid',
      incomplete: 'incomplete',
      incomplete_expired: 'canceled',
      paused: 'canceled',
    };
    return (map[status] ?? 'canceled') as any;
  }
}
