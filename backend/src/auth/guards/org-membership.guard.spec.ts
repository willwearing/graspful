import { OrgMembershipGuard, OrgContext, MIN_ROLE_KEY } from './org-membership.guard';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

function createMockPrisma(membership: { role: string } | null) {
  return {
    orgMembership: {
      findUnique: jest.fn().mockResolvedValue(membership),
    },
  } as any;
}

function createMockContext(user: any, orgId: string | undefined): ExecutionContext {
  const request = { user, params: { orgId }, orgContext: undefined as OrgContext | undefined };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
  } as unknown as ExecutionContext;
}

describe('OrgMembershipGuard', () => {
  it('should throw ForbiddenException when user is missing', async () => {
    const guard = new OrgMembershipGuard(createMockPrisma(null), new Reflector());
    const ctx = createMockContext(undefined, 'org-1');
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when orgId is missing', async () => {
    const guard = new OrgMembershipGuard(createMockPrisma(null), new Reflector());
    const ctx = createMockContext({ userId: 'user-1', email: 'a@b.com' }, undefined);
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user is not a member', async () => {
    const guard = new OrgMembershipGuard(createMockPrisma(null), new Reflector());
    const ctx = createMockContext({ userId: 'user-1', email: 'a@b.com' }, 'org-1');
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should allow member when no minRole is set', async () => {
    const guard = new OrgMembershipGuard(createMockPrisma({ role: 'member' }), new Reflector());
    const ctx = createMockContext({ userId: 'user-1', email: 'a@b.com' }, 'org-1');
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(ctx.switchToHttp().getRequest().orgContext).toEqual({
      userId: 'user-1',
      email: 'a@b.com',
      orgId: 'org-1',
      role: 'member',
    });
  });

  it('should throw ForbiddenException when member tries admin-only route', async () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'get').mockReturnValue('admin');
    const guard = new OrgMembershipGuard(createMockPrisma({ role: 'member' }), reflector);
    const ctx = createMockContext({ userId: 'user-1', email: 'a@b.com' }, 'org-1');
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should allow owner on admin-only route', async () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'get').mockReturnValue('admin');
    const guard = new OrgMembershipGuard(createMockPrisma({ role: 'owner' }), reflector);
    const ctx = createMockContext({ userId: 'user-1', email: 'a@b.com' }, 'org-1');
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('should allow admin on admin-only route', async () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'get').mockReturnValue('admin');
    const guard = new OrgMembershipGuard(createMockPrisma({ role: 'admin' }), reflector);
    const ctx = createMockContext({ userId: 'user-1', email: 'a@b.com' }, 'org-1');
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('should throw when admin tries owner-only route', async () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'get').mockReturnValue('owner');
    const guard = new OrgMembershipGuard(createMockPrisma({ role: 'admin' }), reflector);
    const ctx = createMockContext({ userId: 'user-1', email: 'a@b.com' }, 'org-1');
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });
});
