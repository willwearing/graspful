import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '@/prisma/prisma.service';
import { BillingService } from './billing.service';

const mockCheckoutCreate = jest.fn();
const mockPortalCreate = jest.fn();
const mockCustomersCreate = jest.fn();
const mockSubscriptionsRetrieve = jest.fn();
const mockConstructEvent = jest.fn();

jest.mock('stripe', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: mockCheckoutCreate } },
    billingPortal: { sessions: { create: mockPortalCreate } },
    customers: { create: mockCustomersCreate },
    subscriptions: { retrieve: mockSubscriptionsRetrieve },
    webhooks: { constructEvent: mockConstructEvent },
  })),
}));

// Fixtures preserve the v20 payload nesting. Only fields relevant to these handlers
// are included; Pick checks the contract without fabricating unrelated payment data.
const itemFixture = {
  id: 'si_test', object: 'subscription_item', current_period_start: 1788825600,
  current_period_end: 1791417600,
} satisfies Pick<Stripe.SubscriptionItem, 'id' | 'object' | 'current_period_start' | 'current_period_end'>;

function subscriptionFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub_test', object: 'subscription', status: 'active', customer: 'cus_test',
    cancel_at_period_end: false, trial_end: null,
    metadata: { orgId: 'org-1', plan: 'individual' },
    items: { object: 'list', data: [{ ...itemFixture }], has_more: false, url: '/v1/subscription_items?subscription=sub_test' },
    ...overrides,
  };
}

function eventFixture(type: Stripe.Event.Type, object: unknown): Stripe.Event {
  return {
    id: 'evt_test', object: 'event', api_version: '2026-02-25.clover', created: 1788825600,
    livemode: false, pending_webhooks: 1, request: null, type, data: { object },
  } as Stripe.Event;
}

describe('BillingService', () => {
  let service: BillingService;
  let prisma: { subscription: Record<string, jest.Mock>; organization: Record<string, jest.Mock> };
  let config: Record<string, string | undefined>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      subscription: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), upsert: jest.fn() },
      organization: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'org-1', name: 'Test Org' }) },
    };
    config = {
      APP_URL: 'https://app.graspful.test/', NODE_ENV: 'production',
      STRIPE_SECRET_KEY: 'sk_test_fixture', STRIPE_WEBHOOK_SECRET: 'whsec_fixture',
      STRIPE_PRICE_INDIVIDUAL_MONTHLY: 'price_ind_mo', STRIPE_PRICE_INDIVIDUAL_YEARLY: 'price_ind_yr',
      STRIPE_PRICE_TEAM_MONTHLY: 'price_team_mo', STRIPE_PRICE_TEAM_YEARLY: 'price_team_yr',
    };
    service = new BillingService(prisma as unknown as PrismaService, { get: (key: string) => config[key] } as ConfigService);
  });

  it('reuses an existing customer', async () => {
    prisma.subscription.findUnique.mockResolvedValue({ stripeCustomerId: 'cus_test' });
    expect(await service.getOrCreateCustomer('org-1')).toBe('cus_test');
    expect(mockCustomersCreate).not.toHaveBeenCalled();
  });

  it('creates a customer and free subscription row', async () => {
    prisma.subscription.findUnique.mockResolvedValue(null);
    mockCustomersCreate.mockResolvedValue({ id: 'cus_new' });
    expect(await service.getOrCreateCustomer('org-1')).toBe('cus_new');
    expect(prisma.subscription.create).toHaveBeenCalledWith({
      data: { orgId: 'org-1', stripeCustomerId: 'cus_new', plan: 'free', status: 'active' },
    });
  });

  it.each([
    ['individual', 'month', 'price_ind_mo'], ['individual', 'year', 'price_ind_yr'],
    ['team', 'month', 'price_team_mo'], ['team', 'year', 'price_team_yr'],
  ] as const)('creates %s %s checkout with absolute trusted URLs', async (plan, interval, price) => {
    prisma.subscription.findUnique.mockResolvedValue({ stripeCustomerId: 'cus_test' });
    mockCheckoutCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/test' });
    expect(await service.createCheckoutSession('org-1', plan, interval)).toBe('https://checkout.stripe.com/test');
    expect(mockCheckoutCreate).toHaveBeenCalledWith({
      customer: 'cus_test', mode: 'subscription', line_items: [{ price, quantity: 1 }],
      success_url: 'https://app.graspful.test/settings?billing=success',
      cancel_url: 'https://app.graspful.test/settings?billing=canceled',
      metadata: { orgId: 'org-1', plan }, subscription_data: { metadata: { orgId: 'org-1', plan } },
    });
  });

  it.each(['APP_URL', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PRICE_INDIVIDUAL_MONTHLY'])(
    'reports unavailable and avoids customer writes when %s is missing', async (key) => {
      delete config[key];
      service = new BillingService(prisma as unknown as PrismaService, { get: (key: string) => config[key] } as ConfigService);
      await expect(service.createCheckoutSession('org-1', 'individual', 'month')).rejects.toMatchObject({
        status: 503, response: { code: 'BILLING_UNAVAILABLE' },
      });
      expect((await service.getSubscription('org-1')).billing.checkoutAvailable).toBe(false);
      expect(mockCustomersCreate).not.toHaveBeenCalled();
      expect(prisma.subscription.create).not.toHaveBeenCalled();
      expect(mockCheckoutCreate).not.toHaveBeenCalled();
    },
  );

  it.each(['http://app.graspful.test', 'javascript:alert(1)', 'https://user:pass@app.graspful.test', 'https://app.graspful.test/path', 'invalid'])(
    'rejects invalid production APP_URL %s before any Stripe call', async (url) => {
      config.APP_URL = url;
      await expect(service.createCheckoutSession('org-1', 'individual', 'month')).rejects.toMatchObject({ status: 503 });
      expect(mockCheckoutCreate).not.toHaveBeenCalled();
      expect(mockCustomersCreate).not.toHaveBeenCalled();
    },
  );

  it('allows an explicitly configured local development origin', async () => {
    config.APP_URL = 'http://localhost:3001'; config.NODE_ENV = 'development';
    prisma.subscription.findUnique.mockResolvedValue({ stripeCustomerId: 'cus_test' });
    mockPortalCreate.mockResolvedValue({ url: 'https://billing.stripe.com/test' });
    await service.createPortalSession('org-1');
    expect(mockPortalCreate).toHaveBeenCalledWith({ customer: 'cus_test', return_url: 'http://localhost:3001/settings' });
  });

  it('uses the trusted settings URL for the customer portal', async () => {
    prisma.subscription.findUnique.mockResolvedValue({ stripeCustomerId: 'cus_test' });
    mockPortalCreate.mockResolvedValue({ url: 'https://billing.stripe.com/test' });
    expect(await service.createPortalSession('org-1')).toBe('https://billing.stripe.com/test');
    expect(mockPortalCreate).toHaveBeenCalledWith({ customer: 'cus_test', return_url: 'https://app.graspful.test/settings' });
  });

  it('reports portal unavailability without creating a session', async () => {
    delete config.STRIPE_WEBHOOK_SECRET;
    await expect(service.createPortalSession('org-1')).rejects.toMatchObject({ status: 503 });
    expect(mockPortalCreate).not.toHaveBeenCalled();
  });

  it('rejects portal access without a customer', async () => {
    prisma.subscription.findUnique.mockResolvedValue(null);
    await expect(service.createPortalSession('org-1')).rejects.toMatchObject({ status: 400 });
  });

  it('returns free status from a successful database lookup with independent billing availability', async () => {
    prisma.subscription.findUnique.mockResolvedValue(null);
    expect(await service.getSubscription('org-1')).toMatchObject({
      plan: 'free', status: 'active', billing: { checkoutAvailable: true, portalAvailable: false },
    });
  });

  it('preserves stored paid status while billing setup is unavailable', async () => {
    delete config.STRIPE_SECRET_KEY;
    prisma.subscription.findUnique.mockResolvedValue({ plan: 'team', status: 'past_due', stripeCustomerId: 'cus_test' });
    expect(await service.getSubscription('org-1')).toMatchObject({
      plan: 'team', status: 'past_due', billing: { checkoutAvailable: false, portalAvailable: false },
    });
  });

  it('propagates subscription read failures', async () => {
    prisma.subscription.findUnique.mockRejectedValue(new Error('Database unavailable'));
    await expect(service.getSubscription('org-1')).rejects.toThrow('Database unavailable');
  });

  it('reads checkout subscription periods from v20 items', async () => {
    mockSubscriptionsRetrieve.mockResolvedValue(subscriptionFixture());
    await service.handleWebhookEvent(eventFixture('checkout.session.completed', {
      object: 'checkout.session', metadata: { orgId: 'org-1', plan: 'individual' },
      customer: 'cus_test', subscription: 'sub_test', mode: 'subscription', payment_status: 'paid',
    }));
    const expected = {
      plan: 'individual', currentPeriodStart: new Date(itemFixture.current_period_start * 1000),
      currentPeriodEnd: new Date(itemFixture.current_period_end * 1000), cancelAtPeriodEnd: false, trialEndsAt: null,
    };
    expect(prisma.subscription.upsert).toHaveBeenCalledWith({
      where: { orgId: 'org-1' }, create: expect.objectContaining(expected), update: expect.objectContaining(expected),
    });
  });

  it('updates v20 periods and clears an ended trial', async () => {
    prisma.subscription.findUnique.mockResolvedValue({ id: 'row' });
    await service.handleWebhookEvent(eventFixture('customer.subscription.updated', subscriptionFixture({ cancel_at_period_end: true })));
    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { stripeSubscriptionId: 'sub_test' },
      data: {
        status: 'active', currentPeriodStart: new Date(itemFixture.current_period_start * 1000),
        currentPeriodEnd: new Date(itemFixture.current_period_end * 1000), cancelAtPeriodEnd: true, trialEndsAt: null,
      },
    });
  });

  it('rejects missing billing periods before writing invalid dates', async () => {
    prisma.subscription.findUnique.mockResolvedValue({ id: 'row' });
    await expect(service.handleWebhookEvent(eventFixture('customer.subscription.updated', subscriptionFixture({ items: { data: [] } }))))
      .rejects.toThrow('no valid billing period');
    expect(prisma.subscription.update).not.toHaveBeenCalled();
  });

  it('reads payment failure subscription IDs from v20 invoice parents', async () => {
    prisma.subscription.findUnique.mockResolvedValue({ id: 'row' });
    const parent = {
      type: 'subscription_details', quote_details: null,
      subscription_details: { metadata: { orgId: 'org-1' }, subscription: 'sub_test' },
    } satisfies Stripe.Invoice.Parent;
    await service.handleWebhookEvent(eventFixture('invoice.payment_failed', { id: 'in_test', object: 'invoice', parent }));
    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { stripeSubscriptionId: 'sub_test' }, data: { status: 'past_due' },
    });
  });

  it('handles an expanded invoice subscription', async () => {
    prisma.subscription.findUnique.mockResolvedValue({ id: 'row' });
    await service.handleWebhookEvent(eventFixture('invoice.payment_failed', {
      parent: { type: 'subscription_details', subscription_details: { subscription: subscriptionFixture() } },
    }));
    expect(prisma.subscription.findUnique).toHaveBeenCalledWith({ where: { stripeSubscriptionId: 'sub_test' } });
  });

  it('ignores non-subscription invoices', async () => {
    await service.handleWebhookEvent(eventFixture('invoice.payment_failed', { id: 'in_test', parent: null }));
    expect(prisma.subscription.findUnique).not.toHaveBeenCalled();
  });

  it('downgrades a deleted subscription', async () => {
    prisma.subscription.findUnique.mockResolvedValue({ id: 'row' });
    await service.handleWebhookEvent(eventFixture('customer.subscription.deleted', subscriptionFixture({ status: 'canceled' })));
    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { stripeSubscriptionId: 'sub_test' }, data: { status: 'canceled', plan: 'free', cancelAtPeriodEnd: false },
    });
  });

  it('ignores a deleted subscription that does not belong to the platform', async () => {
    prisma.subscription.findUnique.mockResolvedValue(null);
    await service.handleWebhookEvent(eventFixture('customer.subscription.deleted', subscriptionFixture()));
    expect(prisma.subscription.update).not.toHaveBeenCalled();
  });

  it('keeps connected-account events out of platform subscription handling', async () => {
    await service.handleWebhookEvent({
      ...eventFixture('customer.subscription.updated', subscriptionFixture()), account: 'acct_test',
    });
    expect(prisma.subscription.findUnique).not.toHaveBeenCalled();
    expect(prisma.subscription.update).not.toHaveBeenCalled();
  });

  it('ignores unsupported checkout plans before Stripe retrieval', async () => {
    await service.handleWebhookEvent(eventFixture('checkout.session.completed', {
      metadata: { orgId: 'org-1', plan: 'enterprise' }, subscription: 'sub_test', customer: 'cus_test',
    }));
    expect(mockSubscriptionsRetrieve).not.toHaveBeenCalled();
    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
  });

  it('does not create a learner payment session before Connect onboarding completes', async () => {
    prisma.organization.findUniqueOrThrow.mockResolvedValue({ stripeConnectAccountId: 'acct_test', connectOnboardingComplete: false });
    await expect(service.createLearnerCheckoutSession('org-1', 'price_course', '/settings', '/settings'))
      .rejects.toMatchObject({ status: 503 });
    expect(mockCheckoutCreate).not.toHaveBeenCalled();
  });

  it('rejects external learner return URLs', async () => {
    await expect(service.createLearnerCheckoutSession('org-1', 'price_course', '//attacker.test', '/settings'))
      .rejects.toMatchObject({ status: 503 });
    expect(mockCheckoutCreate).not.toHaveBeenCalled();
  });

  it('reports unconfigured webhook verification as unavailable', () => {
    delete config.STRIPE_WEBHOOK_SECRET;
    expect(() => service.constructWebhookEvent(Buffer.from('{}'), 'sig')).toThrow('Paid subscriptions are not available yet');
    expect(mockConstructEvent).not.toHaveBeenCalled();
  });
});
