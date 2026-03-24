import { AuthRegisterController, RegisterDto } from './auth-register.controller';
import {
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('AuthRegisterController', () => {
  let controller: AuthRegisterController;
  let mockPrisma: any;
  let mockApiKeyService: any;
  let mockConfig: any;
  let mockSupabaseAdmin: any;
  let mockTx: any;

  beforeEach(() => {
    mockSupabaseAdmin = {
      createUser: jest.fn(),
      deleteUser: jest.fn().mockResolvedValue({}),
    };

    mockTx = {
      user: {
        create: jest.fn(),
      },
      organization: {
        create: jest.fn(),
      },
      orgMembership: {
        create: jest.fn(),
      },
    };

    mockPrisma = {
      organization: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn(async (fn: any) => fn(mockTx)),
    };

    mockApiKeyService = {
      createKey: jest.fn(),
    };

    mockConfig = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'SUPABASE_URL') return 'https://test.supabase.co';
        if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'test-key';
        return '';
      }),
    };

    controller = new AuthRegisterController(
      mockPrisma,
      mockApiKeyService,
      mockConfig,
    );

    // Override the supabase client's admin API
    (controller as any).supabase = {
      auth: { admin: mockSupabaseAdmin },
    };
  });

  it('registers a new user and returns userId, orgSlug, apiKey', async () => {
    mockSupabaseAdmin.createUser.mockResolvedValue({
      data: { user: { id: 'sup-user-1' } },
      error: null,
    });

    mockTx.user.create.mockResolvedValue({
      id: 'sup-user-1',
      email: 'will@example.com',
    });

    mockTx.organization.create.mockResolvedValue({
      id: 'org-1',
      slug: 'will-example',
    });

    mockTx.orgMembership.create.mockResolvedValue({
      id: 'mem-1',
      role: 'owner',
    });

    mockApiKeyService.createKey.mockResolvedValue({
      key: 'gsk_abc123',
      id: 'key-1',
    });

    const body: RegisterDto = {
      email: 'will@example.com',
      password: 'securepassword',
    };

    const result = await controller.register(body);

    expect(result.userId).toBe('sup-user-1');
    expect(result.orgSlug).toBe('will-example');
    expect(result.apiKey).toBe('gsk_abc123');

    expect(mockSupabaseAdmin.createUser).toHaveBeenCalledWith({
      email: 'will@example.com',
      password: 'securepassword',
      email_confirm: true,
    });

    expect(mockTx.user.create).toHaveBeenCalledWith({
      data: { id: 'sup-user-1', email: 'will@example.com' },
    });

    expect(mockTx.organization.create).toHaveBeenCalledWith({
      data: {
        slug: 'will-example',
        name: 'will example',
        niche: 'general',
      },
    });

    expect(mockTx.orgMembership.create).toHaveBeenCalledWith({
      data: {
        orgId: 'org-1',
        userId: 'sup-user-1',
        role: 'owner',
      },
    });

    expect(mockApiKeyService.createKey).toHaveBeenCalledWith(
      'org-1',
      'sup-user-1',
      'default',
    );

    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it('throws ConflictException when Supabase reports user already registered', async () => {
    mockSupabaseAdmin.createUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered' },
    });

    await expect(
      controller.register({
        email: 'existing@example.com',
        password: 'password123',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('throws InternalServerErrorException for other Supabase errors', async () => {
    mockSupabaseAdmin.createUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Some unknown error' },
    });

    await expect(
      controller.register({
        email: 'test@example.com',
        password: 'password123',
      }),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it('appends suffix when org slug already exists', async () => {
    mockSupabaseAdmin.createUser.mockResolvedValue({
      data: { user: { id: 'sup-user-2' } },
      error: null,
    });

    // Slug collision: findUnique returns existing org
    mockPrisma.organization.findUnique.mockResolvedValue({ slug: 'will-example' });

    mockTx.user.create.mockResolvedValue({
      id: 'sup-user-2',
      email: 'will@example.com',
    });

    mockTx.organization.create.mockResolvedValue({
      id: 'org-2',
      slug: 'will-example-abc1',
    });

    mockTx.orgMembership.create.mockResolvedValue({ id: 'mem-2' });
    mockApiKeyService.createKey.mockResolvedValue({ key: 'gsk_def456', id: 'key-2' });

    const result = await controller.register({
      email: 'will@example.com',
      password: 'securepassword',
    });

    // The slug passed to organization.create should have a suffix
    const createCall = mockTx.organization.create.mock.calls[0][0];
    expect(createCall.data.slug).toMatch(/^will-example-.+/);
    expect(result.apiKey).toBe('gsk_def456');
  });

  it('cleans up Supabase user if transaction fails', async () => {
    mockSupabaseAdmin.createUser.mockResolvedValue({
      data: { user: { id: 'sup-user-3' } },
      error: null,
    });

    mockPrisma.$transaction.mockRejectedValue(new Error('DB error'));

    await expect(
      controller.register({
        email: 'fail@example.com',
        password: 'password123',
      }),
    ).rejects.toThrow(InternalServerErrorException);

    expect(mockSupabaseAdmin.deleteUser).toHaveBeenCalledWith('sup-user-3');
  });

  it('generates correct org slug from email', () => {
    const emailToSlug = (controller as any).emailToOrgSlug.bind(controller);

    expect(emailToSlug('will@example.com')).toBe('will-example');
    expect(emailToSlug('john.doe@my-company.io')).toBe('john-doe-my-company');
    expect(emailToSlug('ADMIN@Test.org')).toBe('admin-test');
  });
});
