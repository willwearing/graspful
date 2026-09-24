import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { ConnectService } from './connect.service';

const mockAccountsCreate = jest.fn();
const mockAccountLinksCreate = jest.fn();
jest.mock('stripe', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    accounts: { create: mockAccountsCreate }, accountLinks: { create: mockAccountLinksCreate },
  })),
}));

describe('ConnectService setup safety', () => {
  let service: ConnectService;
  let config: Record<string, string | undefined>;
  let prisma: { $transaction: jest.Mock; organization: Record<string, jest.Mock>; revenueEvent: Record<string, jest.Mock> };

  beforeEach(() => {
    jest.clearAllMocks();
    config = { APP_URL: 'https://app.graspful.test/', STRIPE_SECRET_KEY: 'sk_test_fixture', STRIPE_WEBHOOK_SECRET: 'whsec_fixture' };
    prisma = {
      $transaction: jest.fn(async (callback) => callback(prisma)),
      organization: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
      revenueEvent: { upsert: jest.fn(), aggregate: jest.fn(), findMany: jest.fn() },
    };
    service = new ConnectService(prisma as unknown as PrismaService, { get: (key: string) => config[key] } as ConfigService);
  });

  it.each(['APP_URL', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'])(
    'avoids account creation when %s is absent', async (key) => {
      delete config[key];
      await expect(service.createConnectAccount('org-1')).rejects.toMatchObject({ status: 503 });
      expect(mockAccountsCreate).not.toHaveBeenCalled();
      expect(mockAccountLinksCreate).not.toHaveBeenCalled();
      expect(prisma.organization.update).not.toHaveBeenCalled();
    },
  );

  it('builds absolute onboarding return URLs from APP_URL', async () => {
    prisma.organization.findUniqueOrThrow.mockResolvedValue({ stripeConnectAccountId: 'acct_test' });
    mockAccountLinksCreate.mockResolvedValue({ url: 'https://connect.stripe.com/test' });
    expect(await service.createConnectAccount('org-1')).toEqual({ url: 'https://connect.stripe.com/test' });
    expect(mockAccountLinksCreate).toHaveBeenCalledWith({
      account: 'acct_test', refresh_url: 'https://app.graspful.test/settings?connect=refresh',
      return_url: 'https://app.graspful.test/settings?connect=returned', type: 'account_onboarding',
    });
  });

  it('keeps free publishing available before payment setup', async () => {
    delete config.STRIPE_SECRET_KEY;
    expect(await service.isPublishAllowed('org-1', false)).toEqual({ allowed: true });
  });

  it('blocks paid publishing while platform payment setup is missing', async () => {
    delete config.STRIPE_WEBHOOK_SECRET;
    prisma.organization.findUniqueOrThrow.mockResolvedValue({ connectOnboardingComplete: true });
    expect(await service.isPublishAllowed('org-1', true)).toMatchObject({ allowed: false });
  });

  it('requires creator onboarding before paid publishing', async () => {
    prisma.organization.findUniqueOrThrow.mockResolvedValue({ connectOnboardingComplete: false });
    expect(await service.isPublishAllowed('org-1', true)).toMatchObject({ allowed: false });
    prisma.organization.findUniqueOrThrow.mockResolvedValue({ connectOnboardingComplete: true });
    expect(await service.isPublishAllowed('org-1', true)).toEqual({ allowed: true });
  });

  it('reports setup availability independently from stored onboarding state', async () => {
    delete config.STRIPE_SECRET_KEY;
    prisma.organization.findUniqueOrThrow.mockResolvedValue({ stripeConnectAccountId: 'acct_test', connectOnboardingComplete: true });
    expect(await service.getConnectStatus('org-1')).toEqual({
      setupAvailable: false, hasConnectAccount: true, onboardingComplete: true,
    });
  });

  it('returns organization totals while limiting recent event reads', async () => {
    prisma.revenueEvent.aggregate.mockResolvedValue({
      _sum: { grossAmount: 10000, platformFee: 3000, creatorPayout: 7000 },
      _count: { _all: 50 },
    });
    prisma.revenueEvent.findMany.mockResolvedValue([{ id: 'latest' }]);
    await expect(service.getRevenue('org-1')).resolves.toEqual({
      grossRevenue: 10000, platformFees: 3000, creatorEarnings: 7000,
      currency: 'usd', eventCount: 50, recentEvents: [{ id: 'latest' }],
    });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    });
    expect(prisma.revenueEvent.aggregate).toHaveBeenCalledWith({
      where: { orgId: 'org-1' },
      _sum: { grossAmount: true, platformFee: true, creatorPayout: true },
      _count: { _all: true },
    });
    expect(prisma.revenueEvent.findMany).toHaveBeenCalledWith({
      where: { orgId: 'org-1' }, orderBy: { createdAt: 'desc' }, take: 20,
    });
  });

  it('omits event reads for creator statistics that only need revenue totals', async () => {
    prisma.revenueEvent.aggregate.mockResolvedValue({
      _sum: { grossAmount: 1000, platformFee: 300, creatorPayout: 700 },
      _count: { _all: 1 },
    });
    await expect(service.getRevenue('org-1', { includeRecentEvents: false })).resolves.toMatchObject({
      creatorEarnings: 700, eventCount: 1, recentEvents: [],
    });
    expect(prisma.revenueEvent.findMany).not.toHaveBeenCalled();
  });

  it('returns zero revenue when the organization has no invoices', async () => {
    prisma.revenueEvent.aggregate.mockResolvedValue({
      _sum: { grossAmount: null, platformFee: null, creatorPayout: null },
      _count: { _all: 0 },
    });
    prisma.revenueEvent.findMany.mockResolvedValue([]);
    await expect(service.getRevenue('org-empty')).resolves.toEqual({
      grossRevenue: 0, platformFees: 0, creatorEarnings: 0,
      currency: 'usd', eventCount: 0, recentEvents: [],
    });
  });

  it('deduplicates invoice revenue on webhook retries', async () => {
    await service.recordRevenueEvent('org-1', 'in_test', 1000, 'usd');
    expect(prisma.revenueEvent.upsert).toHaveBeenCalledWith({
      where: { stripeInvoiceId: 'in_test' },
      create: { orgId: 'org-1', stripeInvoiceId: 'in_test', grossAmount: 1000, platformFee: 300, creatorPayout: 700, currency: 'usd', learnerId: undefined },
      update: {},
    });
  });
});
