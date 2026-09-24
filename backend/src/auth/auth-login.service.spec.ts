import { UnauthorizedException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { AuthLoginService } from './auth-login.service';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));

function setup() {
  const auth = {
    signInWithPassword: jest.fn().mockResolvedValue({
      data: { user: { id: 'authenticated-user' } },
      error: null,
    }),
  };
  jest.mocked(createClient).mockReturnValue({ auth } as any);
  const provision = {
    ensureUserOrg: jest.fn().mockResolvedValue({ orgId: 'owned-org', orgSlug: 'my-academy' }),
  };
  const apiKeys = { createKey: jest.fn().mockResolvedValue({ id: 'key-1', key: 'gsk_new-key' }) };
  const config = { getOrThrow: jest.fn((key: string) => key) };
  const service = new AuthLoginService(provision as any, apiKeys as any, config as any);
  jest.spyOn(service['logger'], 'warn').mockImplementation();
  return { service, auth, provision, apiKeys };
}

describe('AuthLoginService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('issues a scoped CLI key only after authentication and organization provisioning', async () => {
    const { service, auth, provision, apiKeys } = setup();

    await expect(service.login('owner@example.com', 'correct-password')).resolves.toEqual({
      apiKey: 'gsk_new-key', orgSlug: 'my-academy', userId: 'authenticated-user',
    });

    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'owner@example.com', password: 'correct-password',
    });
    expect(provision.ensureUserOrg).toHaveBeenCalledWith('authenticated-user', 'owner@example.com');
    expect(apiKeys.createKey).toHaveBeenCalledWith(
      'owned-org', 'authenticated-user', expect.stringMatching(/^cli-login-/),
    );
    expect(auth.signInWithPassword.mock.invocationCallOrder[0]).toBeLessThan(
      provision.ensureUserOrg.mock.invocationCallOrder[0],
    );
    expect(provision.ensureUserOrg.mock.invocationCallOrder[0]).toBeLessThan(
      apiKeys.createKey.mock.invocationCallOrder[0],
    );
  });

  it.each([
    ['unknown account', { message: 'User not found' }, null],
    ['incorrect password', { message: 'Invalid login credentials' }, null],
    ['authentication error with user data', { message: 'Email not confirmed' }, { id: 'unverified-user' }],
    ['missing user data', null, null],
  ])('rejects %s without revealing account details or issuing credentials', async (_description, error, user) => {
    const { service, auth, provision, apiKeys } = setup();
    auth.signInWithPassword.mockResolvedValue({ data: { user }, error });

    await expect(service.login('owner@example.com', 'wrong-password')).rejects.toEqual(
      new UnauthorizedException('Invalid email or password'),
    );

    expect(provision.ensureUserOrg).not.toHaveBeenCalled();
    expect(apiKeys.createKey).not.toHaveBeenCalled();
  });

  it('does not issue credentials when organization provisioning fails', async () => {
    const { service, provision, apiKeys } = setup();
    provision.ensureUserOrg.mockRejectedValue(new Error('Provisioning failed'));

    await expect(service.login('owner@example.com', 'correct-password')).rejects.toThrow('Provisioning failed');

    expect(apiKeys.createKey).not.toHaveBeenCalled();
  });

  it('does not return a successful login when key creation fails', async () => {
    const { service, apiKeys } = setup();
    apiKeys.createKey.mockRejectedValue(new Error('Key creation failed'));

    await expect(service.login('owner@example.com', 'correct-password')).rejects.toThrow('Key creation failed');
  });

  it('does not provision an account after an authentication transport failure', async () => {
    const { service, auth, provision, apiKeys } = setup();
    auth.signInWithPassword.mockRejectedValue(new Error('Auth unavailable'));

    await expect(service.login('owner@example.com', 'correct-password')).rejects.toThrow('Auth unavailable');

    expect(provision.ensureUserOrg).not.toHaveBeenCalled();
    expect(apiKeys.createKey).not.toHaveBeenCalled();
  });
});
