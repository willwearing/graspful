import { RegistrationService } from './registration.service';
import { AuthRegisterController, RegisterDto } from './auth-register.controller';
import {
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('RegistrationService', () => {
  let service: RegistrationService;
  let mockPrisma: any;
  let mockApiKeyService: any;
  let mockConfig: any;
  let mockVercelDomains: any;
  let mockSupabaseAdmin: any;
  let mockTx: any;

  beforeEach(() => {
    mockSupabaseAdmin = {
      createUser: jest.fn(),
      deleteUser: jest.fn().mockResolvedValue({}),
    };

    mockTx = {
      user: {
        upsert: jest.fn(),
      },
      organization: {
        create: jest.fn(),
      },
      orgMembership: {
        create: jest.fn(),
      },
      brand: {
        create: jest.fn().mockResolvedValue({}),
      },
      apiKey: {
        create: jest.fn().mockResolvedValue({}),
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

    mockVercelDomains = {
      addDomain: jest.fn().mockResolvedValue({ name: 'test.graspful.ai', verified: false }),
    };

    service = new RegistrationService(
      mockPrisma,
      mockApiKeyService,
      mockConfig,
      mockVercelDomains,
    );

    // Override the supabase client's admin API
    (service as any).supabase = {
      auth: { admin: mockSupabaseAdmin },
    };
  });

  it('registers a new user and returns userId, orgSlug, apiKey', async () => {
    mockSupabaseAdmin.createUser.mockResolvedValue({
      data: { user: { id: 'sup-user-1' } },
      error: null,
    });

    mockTx.user.upsert.mockResolvedValue({
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

    const result = await service.register('will@example.com', 'securepassword');

    expect(result.userId).toBe('sup-user-1');
    expect(result.orgSlug).toBe('will-example');
    expect(result.apiKey).toMatch(/^gsk_/);

    expect(mockSupabaseAdmin.createUser).toHaveBeenCalledWith({
      email: 'will@example.com',
      password: 'securepassword',
      email_confirm: true,
    });

    expect(mockTx.user.upsert).toHaveBeenCalledWith({
      where: { id: 'sup-user-1' },
      update: { email: 'will@example.com' },
      create: { id: 'sup-user-1', email: 'will@example.com' },
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

    expect(mockTx.brand.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        slug: 'will-example',
        orgSlug: 'will-example',
      }),
    });

    expect(mockTx.apiKey.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orgId: 'org-1',
        userId: 'sup-user-1',
        name: 'default',
      }),
    });

    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it('throws ConflictException when Supabase reports user already registered', async () => {
    mockSupabaseAdmin.createUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered' },
    });

    await expect(
      service.register('existing@example.com', 'password123'),
    ).rejects.toThrow(ConflictException);
  });

  it('throws InternalServerErrorException for other Supabase errors', async () => {
    mockSupabaseAdmin.createUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Some unknown error' },
    });

    await expect(
      service.register('test@example.com', 'password123'),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it('appends suffix when org slug already exists', async () => {
    mockSupabaseAdmin.createUser.mockResolvedValue({
      data: { user: { id: 'sup-user-2' } },
      error: null,
    });

    // Slug collision: findUnique returns existing org
    mockPrisma.organization.findUnique.mockResolvedValue({ slug: 'will-example' });

    mockTx.user.upsert.mockResolvedValue({
      id: 'sup-user-2',
      email: 'will@example.com',
    });

    mockTx.organization.create.mockResolvedValue({
      id: 'org-2',
      slug: 'will-example-abc1',
    });

    mockTx.orgMembership.create.mockResolvedValue({ id: 'mem-2' });

    const result = await service.register('will@example.com', 'securepassword');

    // The slug passed to organization.create should have a suffix
    const createCall = mockTx.organization.create.mock.calls[0][0];
    expect(createCall.data.slug).toMatch(/^will-example-.+/);
    expect(result.apiKey).toMatch(/^gsk_/);
  });

  it('cleans up Supabase user if transaction fails', async () => {
    mockSupabaseAdmin.createUser.mockResolvedValue({
      data: { user: { id: 'sup-user-3' } },
      error: null,
    });

    mockPrisma.$transaction.mockRejectedValue(new Error('DB error'));

    await expect(
      service.register('fail@example.com', 'password123'),
    ).rejects.toThrow(InternalServerErrorException);

    expect(mockSupabaseAdmin.deleteUser).toHaveBeenCalledWith('sup-user-3');
  });

  it('generates correct org slug from email', () => {
    const emailToSlug = (service as any).emailToOrgSlug.bind(service);

    expect(emailToSlug('will@example.com')).toBe('will-example');
    expect(emailToSlug('john.doe@my-company.io')).toBe('john-doe-my-company');
    expect(emailToSlug('ADMIN@Test.org')).toBe('admin-test');
  });
});

describe('AuthRegisterController', () => {
  it('delegates to RegistrationService', async () => {
    const mockRegistration = {
      register: jest.fn().mockResolvedValue({
        userId: 'u1',
        orgSlug: 'test-org',
        apiKey: 'gsk_123',
      }),
    };

    const controller = new AuthRegisterController(mockRegistration as any);

    const body: RegisterDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    const result = await controller.register(body);

    expect(mockRegistration.register).toHaveBeenCalledWith('test@example.com', 'password123');
    expect(result).toEqual({ userId: 'u1', orgSlug: 'test-org', apiKey: 'gsk_123' });
  });
});
