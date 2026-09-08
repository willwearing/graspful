import { ProvisionService } from './provision.service';

describe('ProvisionService first-account event', () => {
  const account = { userId: 'user-1', email: 'learner@example.com' };

  function setup(existing = false) {
    const posthog = { recordAccountCreated: jest.fn() };
    const domains = { addDomain: jest.fn().mockResolvedValue({}) };
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
    const service = new ProvisionService(prisma as any, domains as any, posthog as any);
    return { service, prisma, tx, posthog };
  }

  it('emits only after the first organization transaction succeeds', async () => {
    const { service, prisma, posthog } = setup();
    await expect(service.ensureUserOrg(account.userId, account.email)).resolves.toMatchObject({ created: true });
    expect(posthog.recordAccountCreated).toHaveBeenCalledWith({
      ...account, orgId: 'org-1', orgSlug: 'learner-example', source: 'provision',
    });
    expect(prisma.$transaction.mock.invocationCallOrder[0]).toBeLessThan(posthog.recordAccountCreated.mock.invocationCallOrder[0]);
  });

  it('does not emit again on later provisioning or sign-in', async () => {
    const { service, posthog } = setup(true);
    await expect(service.ensureUserOrg(account.userId, account.email)).resolves.toMatchObject({ created: false });
    expect(posthog.recordAccountCreated).not.toHaveBeenCalled();
  });

  it('does not emit for a failed account transaction', async () => {
    const { service, tx, posthog } = setup();
    tx.brand.upsert.mockRejectedValueOnce(new Error('Database unavailable'));
    await expect(service.ensureUserOrg(account.userId, account.email)).rejects.toThrow('Database unavailable');
    expect(posthog.recordAccountCreated).not.toHaveBeenCalled();
  });
});
