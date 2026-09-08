import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlanTier, SubscriptionStatus } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '@/prisma/prisma.service';
import { PLATFORM_FEE_PERCENT } from './connect.service';
import { billingConfigured, billingReturnUrl, billingUnavailable } from './billing-configuration';

@Injectable()
export class BillingService {
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
    if (!this.stripe) {
      throw billingUnavailable();
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
  ): Promise<string> {
    const priceId = this.config.get<string>(this.priceConfigKey(plan, interval));
    if (!billingConfigured(this.config) || !priceId?.startsWith('price_')) {
      throw billingUnavailable();
    }
    const successUrl = billingReturnUrl(this.config, '/settings?billing=success');
    const cancelUrl = billingReturnUrl(this.config, '/settings?billing=canceled');
    const customerId = await this.getOrCreateCustomer(orgId);

    const session = await this.getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { orgId, plan },
      subscription_data: { metadata: { orgId, plan } },
    });

    if (!session.url) {
      throw new Error('Stripe checkout session was created but did not return a URL');
    }

    return session.url;
  }

  async createPortalSession(orgId: string): Promise<string> {
    if (!billingConfigured(this.config)) {
      throw billingUnavailable('Subscription management is not available yet.');
    }
    const returnUrl = billingReturnUrl(this.config, '/settings');
    const subscription = await this.prisma.subscription.findUnique({
      where: { orgId },
    });

    if (!subscription) {
      throw new BadRequestException('No subscription found for this organization');
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

    const billing = {
      checkoutAvailable: billingConfigured(this.config) && Boolean(
        this.config.get<string>(this.priceConfigKey('individual', 'month'))?.startsWith('price_'),
      ),
      portalAvailable: billingConfigured(this.config) && Boolean(subscription?.stripeCustomerId),
    };

    if (!subscription) {
      return {
        billing,
        plan: 'free' as PlanTier,
        status: 'active' as const,
        trialEndsAt: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        maxMembers: 1,
      };
    }

    return {
      billing,
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
    if (!billingConfigured(this.config)) throw billingUnavailable();
    successUrl = billingReturnUrl(this.config, successUrl);
    cancelUrl = billingReturnUrl(this.config, cancelUrl);

    // Stripe validates the price against this connected account.
    if (!priceId || !priceId.startsWith('price_')) {
      throw new BadRequestException('Invalid price ID format');
    }

    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    if (!org.stripeConnectAccountId || !org.connectOnboardingComplete) {
      throw billingUnavailable('Payments for this academy are not available yet.');
    }

    const session = await this.getStripe().checkout.sessions.create(
      {
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: { application_fee_percent: PLATFORM_FEE_PERCENT, metadata: { orgId } },
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { orgId },
      },
      {
        stripeAccount: org.stripeConnectAccountId,
      },
    );

    if (!session.url) {
      throw new Error('Stripe checkout session was created but did not return a URL');
    }

    return session.url;
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    // Connected-account payments belong to academies.
    if (event.account) return;
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;
    }
  }

  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret?.trim()) throw billingUnavailable();
    return this.getStripe().webhooks.constructEvent(payload, signature, secret);
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const orgId = session.metadata?.orgId;
    const plan = session.metadata?.plan;
    const subscriptionId = this.stripeId(session.subscription);
    const customerId = this.stripeId(session.customer);
    if (!orgId || (plan !== 'individual' && plan !== 'team') || !subscriptionId || !customerId) return;

    const stripeSub = await this.getStripe().subscriptions.retrieve(subscriptionId);
    const period = this.subscriptionPeriod(stripeSub);

    await this.prisma.subscription.upsert({
      where: { orgId },
      create: {
        orgId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: stripeSub.id,
        plan,
        status: this.mapStripeStatus(stripeSub.status),
        ...period,
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        trialEndsAt: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
        maxMembers: plan === 'team' ? 10 : 1,
      },
      update: {
        stripeSubscriptionId: stripeSub.id,
        plan,
        status: this.mapStripeStatus(stripeSub.status),
        ...period,
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        trialEndsAt: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
        maxMembers: plan === 'team' ? 10 : 1,
      },
    });
  }

  private async handleSubscriptionUpdated(sub: Stripe.Subscription): Promise<void> {
    const existing = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: sub.id },
    });
    if (!existing) return;

    await this.prisma.subscription.update({
      where: { stripeSubscriptionId: sub.id },
      data: {
        status: this.mapStripeStatus(sub.status),
        ...this.subscriptionPeriod(sub),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
      },
    });
  }

  private async handleSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
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

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subId = this.stripeId(invoice.parent?.subscription_details?.subscription);
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

  private priceConfigKey(plan: 'individual' | 'team', interval: 'month' | 'year'): string {
    return `STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}LY`;
  }

  private stripeId(value: string | { id: string } | null | undefined): string | null {
    return typeof value === 'string' ? value : value?.id ?? null;
  }

  private subscriptionPeriod(subscription: Stripe.Subscription) {
    // Stripe v20 exposes billing periods on subscription items.
    const items = subscription.items.data;
    if (!items.length || items.some((item) =>
      !Number.isFinite(item.current_period_start) || !Number.isFinite(item.current_period_end) ||
      item.current_period_end < item.current_period_start,
    )) {
      throw new Error('Stripe subscription has no valid billing period');
    }
    return {
      currentPeriodStart: new Date(Math.min(...items.map((item) => item.current_period_start)) * 1000),
      currentPeriodEnd: new Date(Math.max(...items.map((item) => item.current_period_end)) * 1000),
    };
  }

  private mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
    const map: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
      trialing: 'trialing',
      active: 'active',
      past_due: 'past_due',
      canceled: 'canceled',
      unpaid: 'unpaid',
      incomplete: 'incomplete',
      incomplete_expired: 'canceled',
      paused: 'canceled',
    };
    return map[status];
  }
}
