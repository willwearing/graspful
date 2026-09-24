import { BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { RegistrationService } from './registration.service';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));

function setup() {
  const auth = {
    admin: {
      createUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      deleteUser: jest.fn().mockResolvedValue({ error: null }),
    },
  };
  jest.mocked(createClient).mockReturnValue({ auth } as any);
  const tx = {
    user: { upsert: jest.fn().mockResolvedValue({ id: 'user-1' }) },
    organization: {
      create: jest.fn(async ({ data }: { data: { slug: string } }) => ({ id: 'org-1', slug: data.slug })),
    },
    orgMembership: { create: jest.fn().mockResolvedValue({}) },
    apiKey: { create: jest.fn().mockResolvedValue({ id: 'key-1' }) },
  };
  const prisma = {
    organization: { findUnique: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  const apiKeys = { createKey: jest.fn() };
  const config = { getOrThrow: jest.fn((key: string) => key) };
  const posthog = { recordAccountCreated: jest.fn() };
  const service = new RegistrationService(prisma as any, apiKeys as any, config as any, posthog as any);
  jest.spyOn(service['logger'], 'error').mockImplementation();
  jest.spyOn(service['logger'], 'warn').mockImplementation();
  return { service, auth, prisma, tx, apiKeys, posthog };
}

describe('RegistrationService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('creates the authenticated user, owner membership, and hashed key in one transaction', async () => {
    const { service, auth, prisma, tx, apiKeys, posthog } = setup();

    const result = await service.register('Test+Owner@Example.com', 'valid-password');

    expect(result).toEqual({
      userId: 'user-1', orgSlug: 'test-owner-example', apiKey: expect.stringMatching(/^gsk_[a-f0-9]{64}$/),
    });
    expect(auth.admin.createUser).toHaveBeenCalledWith({
      email: 'Test+Owner@Example.com', password: 'valid-password', email_confirm: true,
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.user.upsert).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      update: { email: 'Test+Owner@Example.com' },
      create: { id: 'user-1', email: 'Test+Owner@Example.com' },
    });
    expect(tx.organization.create).toHaveBeenCalledWith({
      data: { slug: 'test-owner-example', name: 'Test Owner Example', niche: 'general' },
    });
    expect(tx.orgMembership.create).toHaveBeenCalledWith({
      data: { orgId: 'org-1', userId: 'user-1', role: 'owner' },
    });
    const keyData = tx.apiKey.create.mock.calls[0][0].data;
    expect(keyData).toEqual({
      orgId: 'org-1', userId: 'user-1', name: 'default',
      keyHash: createHash('sha256').update(result.apiKey).digest('hex'),
      keyPrefix: result.apiKey.slice(0, 12),
    });
    expect(JSON.stringify(keyData)).not.toContain(result.apiKey);
    expect(apiKeys.createKey).not.toHaveBeenCalled();
    expect(auth.admin.deleteUser).not.toHaveBeenCalled();
    expect(posthog.recordAccountCreated).toHaveBeenCalledWith({
      userId: 'user-1', email: 'Test+Owner@Example.com', orgId: 'org-1',
      orgSlug: 'test-owner-example', source: 'registration',
    });
    expect(tx.apiKey.create.mock.invocationCallOrder[0]).toBeLessThan(
      posthog.recordAccountCreated.mock.invocationCallOrder[0],
    );
  });

  it('creates a new organization when the generated slug already belongs to another account', async () => {
    const { service, prisma, tx } = setup();
    prisma.organization.findUnique.mockResolvedValue({ id: 'existing-org', slug: 'owner-example' });

    const result = await service.register('owner@example.com', 'valid-password');

    expect(result.orgSlug).toMatch(/^owner-example-[a-z0-9]+$/);
    expect(tx.orgMembership.create).toHaveBeenCalledWith({
      data: { orgId: 'org-1', userId: 'user-1', role: 'owner' },
    });
  });

  it.each([
    ['duplicate email', { message: 'User already registered' }, ConflictException, 'An account with this email already exists.'],
    ['invalid email', { message: 'invalid email format' }, BadRequestException, 'Invalid email address'],
    ['weak password', { message: 'Password is weak' }, BadRequestException, 'Password must be at least 8 characters'],
    ['password error', { message: 'Invalid password' }, BadRequestException, 'Password must be at least 8 characters'],
    ['rate limit', { message: 'Rate limit reached', status: 429 }, BadRequestException, 'Too many registration attempts.'],
    ['upstream failure', { message: 'Auth unavailable' }, InternalServerErrorException, 'Registration failed'],
  ])('handles %s without provisioning data or deleting an existing account', async (_description, error, exception, message) => {
    const { service, auth, prisma, posthog } = setup();
    auth.admin.createUser.mockResolvedValue({ data: { user: null }, error });

    const failure = service.register('owner@example.com', 'valid-password');
    await expect(failure).rejects.toBeInstanceOf(exception);
    await expect(failure).rejects.toThrow(message);

    expect(prisma.organization.findUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(auth.admin.deleteUser).not.toHaveBeenCalled();
    expect(posthog.recordAccountCreated).not.toHaveBeenCalled();
  });

  it('does not provision data after a remote authentication transport failure', async () => {
    const { service, auth, prisma, posthog } = setup();
    auth.admin.createUser.mockRejectedValue(new Error('Auth unavailable'));

    await expect(service.register('owner@example.com', 'valid-password')).rejects.toThrow('Auth unavailable');

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(auth.admin.deleteUser).not.toHaveBeenCalled();
    expect(posthog.recordAccountCreated).not.toHaveBeenCalled();
  });

  it('rejects a missing authenticated user without creating local records', async () => {
    const { service, auth, prisma } = setup();
    auth.admin.createUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(service.register('owner@example.com', 'valid-password')).rejects.toThrow(InternalServerErrorException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it.each(['user', 'organization', 'orgMembership', 'apiKey'] as const)(
    'removes the new remote identity when the %s transaction write fails',
    async (stage) => {
      const { service, auth, tx, posthog } = setup();
      const write = stage === 'user' ? tx.user.upsert : tx[stage].create;
      write.mockRejectedValueOnce(new Error('Database write failed'));

      await expect(service.register('owner@example.com', 'valid-password')).rejects.toThrow('Registration failed');

      expect(auth.admin.deleteUser).toHaveBeenCalledWith('user-1');
      expect(posthog.recordAccountCreated).not.toHaveBeenCalled();
    },
  );

  it('retains the registration failure when remote cleanup also fails', async () => {
    const { service, auth, tx } = setup();
    tx.user.upsert.mockRejectedValue(new Error('Database write failed'));
    auth.admin.deleteUser.mockRejectedValue(new Error('Cleanup failed'));

    await expect(service.register('owner@example.com', 'valid-password')).rejects.toThrow('Registration failed');

    expect(auth.admin.deleteUser).toHaveBeenCalledWith('user-1');
  });

  it('cleans up the remote identity when the organization lookup fails before the transaction', async () => {
    const { service, auth, prisma, posthog } = setup();
    prisma.organization.findUnique.mockRejectedValue(new Error('Database lookup failed'));

    await expect(service.register('owner@example.com', 'valid-password')).rejects.toThrow('Registration failed');

    expect(auth.admin.deleteUser).toHaveBeenCalledWith('user-1');
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(posthog.recordAccountCreated).not.toHaveBeenCalled();
  });

  it('preserves the committed account and credentials when analytics fails', async () => {
    const { service, auth, posthog } = setup();
    posthog.recordAccountCreated.mockImplementation(() => { throw new Error('Analytics unavailable'); });

    await expect(service.register('owner@example.com', 'valid-password')).resolves.toEqual({
      userId: 'user-1', orgSlug: 'owner-example', apiKey: expect.stringMatching(/^gsk_[a-f0-9]{64}$/),
    });

    expect(auth.admin.deleteUser).not.toHaveBeenCalled();
  });
});
