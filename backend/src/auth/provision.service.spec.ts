import { ProvisionService } from './provision.service';

describe('ProvisionService', () => {
  const account = { userId: 'user-1', email: 'learner@example.com' };

  function setup(existing = false) {
    const posthog = { recordAccountCreated: jest.fn() };
    const tx = {
      organization: { create: jest.fn().mockResolvedValue({ id: 'org-1', slug: 'learner-example' }) },
      orgMembership: { create: jest.fn().mockResolvedValue({}) },
      brand: { upsert: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      user: { upsert: jest.fn().mockResolvedValue({}) },
      orgMembership: { findFirst: jest.fn().mockResolvedValue(existing ? { org: { id: 'org-1', slug: 'learner-example' } } : null) },
      organization: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)),
    };
    const service = new ProvisionService(prisma as any, posthog as any);
    return { service, prisma, tx, posthog };
  }

  it('creates a private workspace without a public brand and then emits the account event', async () => {
    const { service, prisma, tx, posthog } = setup();
    await expect(service.ensureUserOrg(account.userId, account.email)).resolves.toMatchObject({ created: true });
    expect(posthog.recordAccountCreated).toHaveBeenCalledWith({
      ...account, orgId: 'org-1', orgSlug: 'learner-example', source: 'provision',
    });
    expect(prisma.$transaction.mock.invocationCallOrder[0]).toBeLessThan(posthog.recordAccountCreated.mock.invocationCallOrder[0]);
    expect(tx.orgMembership.create).toHaveBeenCalledWith({
      data: { orgId: 'org-1', userId: account.userId, role: 'owner' },
    });
    expect(tx.brand.upsert).not.toHaveBeenCalled();
  });

  it('does not emit again on later provisioning or sign-in', async () => {
    const { service, prisma, tx, posthog } = setup(true);
    await expect(service.ensureUserOrg(account.userId, account.email)).resolves.toMatchObject({ created: false });
    expect(posthog.recordAccountCreated).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.brand.upsert).not.toHaveBeenCalled();
  });

  it('does not emit for a failed account transaction', async () => {
    const { service, tx, posthog } = setup();
    tx.orgMembership.create.mockRejectedValueOnce(new Error('Database unavailable'));
    await expect(service.ensureUserOrg(account.userId, account.email)).rejects.toThrow('Database unavailable');
    expect(posthog.recordAccountCreated).not.toHaveBeenCalled();
  });
});

describe('ProvisionService learner membership', () => {
  function setup({ org, brand }: { org: unknown; brand: unknown }) {
    const prisma = {
      organization: { findUnique: jest.fn().mockResolvedValue(org) },
      brand: { findFirst: jest.fn().mockResolvedValue(brand) },
      orgMembership: { upsert: jest.fn().mockResolvedValue({}) },
    };
    const service = new ProvisionService(prisma as any, {} as any);
    return { service, prisma };
  }

  it('adds a member role for an org with an active public site', async () => {
    const { service, prisma } = setup({ org: { id: 'org-1', isActive: true }, brand: { id: 'brand-1' } });
    await service.ensureLearnerMembership('user-1', 'academy');
    expect(prisma.brand.findFirst).toHaveBeenCalledWith({
      where: { orgSlug: 'academy', isActive: true },
      select: { id: true },
    });
    expect(prisma.orgMembership.upsert).toHaveBeenCalledWith({
      where: { orgId_userId: { orgId: 'org-1', userId: 'user-1' } },
      update: {},
      create: { orgId: 'org-1', userId: 'user-1', role: 'member' },
    });
  });

  it.each([
    ['the org does not exist', null, { id: 'brand-1' }],
    ['the org is archived', { id: 'org-1', isActive: false }, { id: 'brand-1' }],
    ['the org has no active site', { id: 'org-1', isActive: true }, null],
  ])('does not add membership when %s', async (_case, org, brand) => {
    const { service, prisma } = setup({ org, brand });
    await service.ensureLearnerMembership('user-1', 'private-org');
    expect(prisma.orgMembership.upsert).not.toHaveBeenCalled();
  });
});
