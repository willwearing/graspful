import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtOrApiKeyGuard } from './jwt-or-apikey.guard';

function mockExecutionContext(authHeader?: string): ExecutionContext {
  const request: any = {
    headers: authHeader ? { authorization: authHeader } : {},
    user: undefined,
    apiKeyOrg: undefined,
    apiKeyUser: undefined,
    orgId: undefined,
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
    getArgs: () => [request],
    getArgByIndex: (idx: number) => [request][idx],
    switchToRpc: () => ({} as any),
    switchToWs: () => ({} as any),
    getType: () => 'http' as any,
  } as unknown as ExecutionContext;
}

describe('JwtOrApiKeyGuard', () => {
  let guard: JwtOrApiKeyGuard;
  let mockSupabaseGuard: any;
  let mockApiKeyGuard: any;

  beforeEach(() => {
    mockSupabaseGuard = {
      canActivate: jest.fn(),
    };
    mockApiKeyGuard = {
      canActivate: jest.fn(),
    };

    guard = new JwtOrApiKeyGuard(mockSupabaseGuard, mockApiKeyGuard);
  });

  it('throws UnauthorizedException when no Authorization header', async () => {
    const ctx = mockExecutionContext();
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when Authorization is not Bearer', async () => {
    const ctx = mockExecutionContext('Basic abc123');
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('delegates to ApiKeyGuard when token starts with gsk_', async () => {
    mockApiKeyGuard.canActivate.mockImplementation((ctx: ExecutionContext) => {
      const req = ctx.switchToHttp().getRequest();
      req.apiKeyUser = { id: 'user-1', email: 'test@example.com' };
      req.apiKeyOrg = { id: 'org-1' };
      req.orgId = 'org-1';
      return true;
    });

    const ctx = mockExecutionContext('Bearer gsk_abc123');
    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(mockApiKeyGuard.canActivate).toHaveBeenCalledWith(ctx);
    expect(mockSupabaseGuard.canActivate).not.toHaveBeenCalled();

    // Verify request.user was set from apiKeyUser
    const req = ctx.switchToHttp().getRequest();
    expect(req.user).toEqual({ userId: 'user-1', email: 'test@example.com' });
  });

  it('delegates to SupabaseAuthGuard for regular JWT tokens', async () => {
    mockSupabaseGuard.canActivate.mockResolvedValue(true);

    const ctx = mockExecutionContext('Bearer eyJhbGciOiJSUzI1NiJ9.test');
    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(mockSupabaseGuard.canActivate).toHaveBeenCalledWith(ctx);
    expect(mockApiKeyGuard.canActivate).not.toHaveBeenCalled();
  });

  it('returns false when API key guard returns false', async () => {
    mockApiKeyGuard.canActivate.mockResolvedValue(false);

    const ctx = mockExecutionContext('Bearer gsk_invalid');
    const result = await guard.canActivate(ctx);

    expect(result).toBe(false);
  });

  it('propagates errors from SupabaseAuthGuard', async () => {
    mockSupabaseGuard.canActivate.mockRejectedValue(
      new UnauthorizedException('Invalid or expired token'),
    );

    const ctx = mockExecutionContext('Bearer eyJhbGciOiJSUzI1NiJ9.expired');
    await expect(guard.canActivate(ctx)).rejects.toThrow('Invalid or expired token');
  });
});
