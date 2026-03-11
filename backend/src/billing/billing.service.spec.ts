import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { BillingService } from './billing.service';

// Mock Stripe
const mockCheckoutCreate = jest.fn();
const mockPortalCreate = jest.fn();
const mockCustomersCreate = jest.fn();
const mockSubscriptionsRetrieve = jest.fn();
const mockConstructEvent = jest.fn();

jest.mock('stripe', () => {
  const MockStripe = jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: mockCheckoutCreate } },
    billingPortal: { sessions: { create: mockPortalCreate } },
    customers: { create: mockCustomersCreate },
    subscriptions: { retrieve: mockSubscriptionsRetrieve },
    webhooks: { constructEvent: mockConstructEvent },
  }));
  return { __esModule: true, default: MockStripe };
});

describe('BillingService', () => {
  let service: BillingService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      subscription: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      organization: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'org-1', name: 'Test Org' }),
      },
    };

    const mockConfig = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          STRIPE_SECRET_KEY: 'sk_test_123',
          STRIPE_WEBHOOK_SECRET: 'whsec_123',
        };
        return values[key];
      }),
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string> = {
          STRIPE_SECRET_KEY: 'sk_test_123',
          STRIPE_WEBHOOK_SECRET: 'whsec_123',
          STRIPE_PRICE_INDIVIDUAL_MONTHLY: 'price_ind_mo',
          STRIPE_PRICE_INDIVIDUAL_YEARLY: 'price_ind_yr',
          STRIPE_PRICE_TEAM_MONTHLY: 'price_team_mo',
          STRIPE_PRICE_TEAM_YEARLY: 'price_team_yr',
        };
        return values[key];
      }),
    } as unknown as ConfigService;

    service = new BillingService(
      mockPrisma as unknown as PrismaService,
      mockConfig,
    );

    jest.clearAllMocks();
  });

  describe('getOrCreateCustomer', () => {
    it('should return existing customer ID', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        stripeCustomerId: 'cus_existing',
      });

      const result = await service.getOrCreateCustomer('org-1');
      expect(result).toBe('cus_existing');
      expect(mockCustomersCreate).not.toHaveBeenCalled();
    });

    it('should create new customer and subscription when none exists', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      mockCustomersCreate.mockResolvedValue({ id: 'cus_new' });
      mockPrisma.subscription.create.mockResolvedValue({});

      const result = await service.getOrCreateCustomer('org-1');

      expect(result).toBe('cus_new');
      expect(mockCustomersCreate).toHaveBeenCalledWith({
        metadata: { orgId: 'org-1' },
        name: 'Test Org',
      });
      expect(mockPrisma.subscription.create).toHaveBeenCalledWith({
        data: {
          orgId: 'org-1',
          stripeCustomerId: 'cus_new',
          plan: 'free',
          status: 'active',
        },
      });
    });
  });

  describe('createCheckoutSession', () => {
    it('should create a Stripe checkout session', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        stripeCustomerId: 'cus_1',
      });
      mockCheckoutCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/xxx' });

      const url = await service.createCheckoutSession(
        'org-1',
        'individual',
        'month',
        'https://app.com/success',
        'https://app.com/cancel',
      );

      expect(url).toBe('https://checkout.stripe.com/xxx');
      expect(mockCheckoutCreate).toHaveBeenCalledWith({
        customer: 'cus_1',
        mode: 'subscription',
        line_items: [{ price: 'price_ind_mo', quantity: 1 }],
        success_url: 'https://app.com/success',
        cancel_url: 'https://app.com/cancel',
        metadata: { orgId: 'org-1', plan: 'individual' },
      });
    });
  });

  describe('createPortalSession', () => {
    it('should create a Stripe portal session', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        stripeCustomerId: 'cus_1',
      });
      mockPortalCreate.mockResolvedValue({ url: 'https://billing.stripe.com/xxx' });

      const url = await service.createPortalSession('org-1', 'https://app.com/settings');

      expect(url).toBe('https://billing.stripe.com/xxx');
    });

    it('should throw when no subscription exists', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      await expect(service.createPortalSession('org-1', 'https://app.com'))
        .rejects.toThrow('No subscription found');
    });
  });

  describe('getSubscription', () => {
    it('should return free plan when no subscription exists', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      const result = await service.getSubscription('org-1');

      expect(result.plan).toBe('free');
      expect(result.status).toBe('active');
    });

    it('should return existing subscription details', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        plan: 'individual',
        status: 'active',
        trialEndsAt: null,
        currentPeriodEnd: new Date('2026-04-10'),
        cancelAtPeriodEnd: false,
        maxMembers: 1,
      });

      const result = await service.getSubscription('org-1');

      expect(result.plan).toBe('individual');
      expect(result.status).toBe('active');
    });
  });

  describe('handleWebhookEvent', () => {
    it('should handle checkout.session.completed', async () => {
      mockSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_1',
        status: 'active',
        current_period_start: 1700000000,
        current_period_end: 1702600000,
      });
      mockPrisma.subscription.upsert.mockResolvedValue({});

      await service.handleWebhookEvent({
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { orgId: 'org-1', plan: 'individual' },
            customer: 'cus_1',
            subscription: 'sub_1',
          },
        },
      } as any);

      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orgId: 'org-1' },
          create: expect.objectContaining({ plan: 'individual' }),
          update: expect.objectContaining({ plan: 'individual' }),
        }),
      );
    });

    it('should handle customer.subscription.deleted', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ id: 'sub-row' });
      mockPrisma.subscription.update.mockResolvedValue({});

      await service.handleWebhookEvent({
        type: 'customer.subscription.deleted',
        data: {
          object: { id: 'sub_1' },
        },
      } as any);

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'sub_1' },
        data: { status: 'canceled', plan: 'free', cancelAtPeriodEnd: false },
      });
    });

    it('should handle invoice.payment_failed', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ id: 'sub-row' });
      mockPrisma.subscription.update.mockResolvedValue({});

      await service.handleWebhookEvent({
        type: 'invoice.payment_failed',
        data: {
          object: { subscription: 'sub_1' },
        },
      } as any);

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'sub_1' },
        data: { status: 'past_due' },
      });
    });

    it('should ignore events with no matching subscription', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      await service.handleWebhookEvent({
        type: 'customer.subscription.deleted',
        data: { object: { id: 'sub_unknown' } },
      } as any);

      expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
    });
  });
});
