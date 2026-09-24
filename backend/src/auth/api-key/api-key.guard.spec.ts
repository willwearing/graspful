import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';

function setup(authorization?: unknown) {
  const request = { headers: { authorization } } as Record<string, any>;
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  const apiKeyService = { validateKey: jest.fn() };
  const guard = new ApiKeyGuard(apiKeyService as any);
  return { guard, request, context, apiKeyService };
}

describe('ApiKeyGuard', () => {
  it.each([
    ['missing', undefined],
    ['duplicate authorization headers', ['Bearer gsk_first', 'Bearer gsk_second']],
    ['a non-string header', 123],
    ['empty', ''],
    ['basic authentication', 'Basic gsk_secret'],
    ['a JWT', 'Bearer eyJhbGciOiJIUzI1NiJ9.payload.signature'],
    ['an unprefixed key', 'Bearer secret'],
    ['a key without the Bearer scheme', 'gsk_secret'],
  ])('rejects %s credentials before looking up a key', async (_description, header) => {
    const { guard, request, context, apiKeyService } = setup(header);

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);

    expect(apiKeyService.validateKey).not.toHaveBeenCalled();
    expect(request.apiKeyUser).toBeUndefined();
    expect(request.apiKeyOrgId).toBeUndefined();
  });

  it('rejects a revoked, expired, or unknown key without attaching an identity', async () => {
    const { guard, request, context, apiKeyService } = setup('Bearer gsk_invalid');
    apiKeyService.validateKey.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow('Invalid API key');

    expect(apiKeyService.validateKey).toHaveBeenCalledWith('gsk_invalid');
    expect(request.apiKeyOrg).toBeUndefined();
    expect(request.apiKeyUser).toBeUndefined();
    expect(request.apiKeyOrgId).toBeUndefined();
  });

  it('attaches the validated key owner and organization for downstream scope checks', async () => {
    const { guard, request, context, apiKeyService } = setup('Bearer gsk_valid');
    const user = { id: 'user-1', email: 'owner@example.com' };
    const org = { id: 'org-1', slug: 'academy' };
    apiKeyService.validateKey.mockResolvedValue({ id: 'key-1', user, org, orgId: org.id });
    request.params = { orgId: 'another-org' };
    request.body = { userId: 'another-user', orgId: 'another-org' };

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(request.apiKeyUser).toEqual(user);
    expect(request.apiKeyOrg).toEqual(org);
    expect(request.apiKeyOrgId).toBe('org-1');
  });

  it('does not authenticate when the key store is unavailable', async () => {
    const { guard, request, context, apiKeyService } = setup('Bearer gsk_valid');
    apiKeyService.validateKey.mockRejectedValue(new Error('Database unavailable'));

    await expect(guard.canActivate(context)).rejects.toThrow('Database unavailable');

    expect(request.apiKeyUser).toBeUndefined();
    expect(request.apiKeyOrgId).toBeUndefined();
  });
});
