import { GoneException, UnauthorizedException } from '@nestjs/common';
import { CliAuthService } from './cli-auth.service';

describe('CliAuthService', () => {
  let service: CliAuthService;
  let mockPrisma: any;
  let mockApiKeyService: any;
  let mockProvisionService: any;
  let mockConfig: any;

  beforeEach(() => {
    mockPrisma = {
      cliAuthSession: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      organization: {
        findUnique: jest.fn(),
      },
    };

    mockApiKeyService = {
      createKey: jest.fn().mockResolvedValue({ key: 'gsk_cli_key', id: 'key-1' }),
    };

    mockProvisionService = {
      ensureUserOrg: jest.fn().mockResolvedValue({ orgId: 'org-1', orgSlug: 'alpha-org', created: true }),
    };

    mockConfig = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'service-role-secret';
        throw new Error(`Unexpected config key ${key}`);
      }),
    };

    service = new CliAuthService(
      mockPrisma,
      mockApiKeyService,
      mockProvisionService,
      mockConfig,
    );
  });

  it('starts a sign-up flow with a token and expiry', async () => {
    const result = await service.start('sign-up');

    expect(result.token).toBeTruthy();
    expect(result.pollIntervalMs).toBe(2_000);
    expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(mockPrisma.cliAuthSession.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        mode: 'sign-up',
        tokenHash: expect.any(String),
      }),
    });
  });

  it('authorizes a session, provisions an org, and stores an encrypted API key', async () => {
    const start = await service.start('sign-in');
    mockPrisma.cliAuthSession.findUnique.mockResolvedValue({
      id: 'session-1',
      tokenHash: 'hash',
      mode: 'sign-in',
      userId: null,
      orgId: null,
      encryptedApiKey: null,
      authorizedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });

    const result = await service.authorize(start.token, 'user-1', 'user@example.com');

    expect(result).toEqual({ authorized: true, orgSlug: 'alpha-org' });
    expect(mockProvisionService.ensureUserOrg).toHaveBeenCalledWith('user-1', 'user@example.com');
    expect(mockApiKeyService.createKey).toHaveBeenCalledWith(
      'org-1',
      'user-1',
      expect.stringMatching(/^cli-alpha-org-/),
    );
    expect(mockPrisma.cliAuthSession.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: expect.objectContaining({
        userId: 'user-1',
        orgId: 'org-1',
        encryptedApiKey: expect.any(String),
      }),
    });
  });

  it('returns a decrypted API key once the session has been authorized', async () => {
    const start = await service.start('sign-in');
    mockPrisma.cliAuthSession.findUnique.mockResolvedValue({
      id: 'session-1',
      tokenHash: 'hash',
      mode: 'sign-in',
      userId: null,
      orgId: null,
      encryptedApiKey: null,
      authorizedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });

    await service.authorize(start.token, 'user-1', 'user@example.com');
    const encryptedApiKey = mockPrisma.cliAuthSession.update.mock.calls[0][0].data.encryptedApiKey;
    mockPrisma.cliAuthSession.findUnique.mockResolvedValue({
      id: 'session-1',
      tokenHash: 'hash',
      mode: 'sign-in',
      userId: 'user-1',
      orgId: 'org-1',
      encryptedApiKey,
      authorizedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });
    mockPrisma.organization.findUnique.mockResolvedValue({ slug: 'alpha-org' });

    const result = await service.exchange(start.token);

    expect(result).toEqual({
      status: 'complete',
      apiKey: 'gsk_cli_key',
      orgSlug: 'alpha-org',
      userId: 'user-1',
    });
  });

  it('returns pending before authorization completes', async () => {
    mockPrisma.cliAuthSession.findUnique.mockResolvedValue({
      id: 'session-1',
      tokenHash: 'hash',
      mode: 'sign-in',
      userId: null,
      orgId: null,
      encryptedApiKey: null,
      authorizedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(service.exchange('pending-token')).resolves.toEqual({ status: 'pending' });
  });

  it('returns expired for missing or expired sessions', async () => {
    mockPrisma.cliAuthSession.findUnique.mockResolvedValue(null);
    await expect(service.exchange('missing-token')).resolves.toEqual({ status: 'expired' });

    mockPrisma.cliAuthSession.findUnique.mockResolvedValue({
      id: 'session-1',
      tokenHash: 'hash',
      mode: 'sign-in',
      userId: null,
      orgId: null,
      encryptedApiKey: null,
      authorizedAt: null,
      expiresAt: new Date(Date.now() - 1_000),
    });
    await expect(service.exchange('expired-token')).resolves.toEqual({ status: 'expired' });
  });

  it('rejects authorization for invalid or expired tokens', async () => {
    mockPrisma.cliAuthSession.findUnique.mockResolvedValue(null);
    await expect(service.authorize('bad-token', 'user-1', 'user@example.com')).rejects.toThrow(
      UnauthorizedException,
    );

    mockPrisma.cliAuthSession.findUnique.mockResolvedValue({
      id: 'session-1',
      tokenHash: 'hash',
      mode: 'sign-in',
      userId: null,
      orgId: null,
      encryptedApiKey: null,
      authorizedAt: null,
      expiresAt: new Date(Date.now() - 1_000),
    });
    await expect(service.authorize('expired-token', 'user-1', 'user@example.com')).rejects.toThrow(
      GoneException,
    );
  });
});
