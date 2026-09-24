import { OrgMembershipGuard, MIN_ROLE_KEY } from './org-membership.guard';
import type { OrgContext } from '@/auth/org-context';
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
    getClass: () => class TestController {},
  } as unknown as ExecutionContext;
}

describe('OrgMembershipGuard', () => {
  it('should throw ForbiddenException when user is missing', async () => {
    const guard = new OrgMembershipGuard(createMockPrisma(null), new Reflector());
    const ctx = createMockContext(undefined, '00000000-0000-0000-0000-000000000001');
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when orgId is missing', async () => {
    const guard = new OrgMembershipGuard(createMockPrisma(null), new Reflector());
    const ctx = createMockContext({ userId: 'user-1', email: 'a@b.com' }, undefined);
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user is not a member', async () => {
    const guard = new OrgMembershipGuard(createMockPrisma(null), new Reflector());
    const ctx = createMockContext({ userId: 'user-1', email: 'a@b.com' }, '00000000-0000-0000-0000-000000000001');
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('rejects an API key used against a different org', async () => {
    const prisma = createMockPrisma({ role: 'owner' });
    const guard = new OrgMembershipGuard(prisma, new Reflector());
    const ctx = createMockContext(
      { userId: 'user-1', email: 'a@b.com', apiKeyOrgId: '00000000-0000-0000-0000-000000000002' },
      '00000000-0000-0000-0000-000000000001',
    );
    await expect(guard.canActivate(ctx)).rejects.toThrow('API key is not valid for this organization');
    expect(prisma.orgMembership.findUnique).not.toHaveBeenCalled();
  });

  it('allows an API key on the org it was minted for', async () => {
    const guard = new OrgMembershipGuard(createMockPrisma({ role: 'admin' }), new Reflector());
    const ctx = createMockContext(
      { userId: 'user-1', email: 'a@b.com', apiKeyOrgId: '00000000-0000-0000-0000-000000000001' },
      '00000000-0000-0000-0000-000000000001',
    );
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('should allow member when no minRole is set', async () => {
    const guard = new OrgMembershipGuard(createMockPrisma({ role: 'member' }), new Reflector());
    const ctx = createMockContext({ userId: 'user-1', email: 'a@b.com' }, '00000000-0000-0000-0000-000000000001');
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(ctx.switchToHttp().getRequest().orgContext).toEqual({
      userId: 'user-1',
      email: 'a@b.com',
      orgId: '00000000-0000-0000-0000-000000000001',
      role: 'member',
    });
  });

  it('should throw ForbiddenException when member tries admin-only route', async () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('admin');
    const guard = new OrgMembershipGuard(createMockPrisma({ role: 'member' }), reflector);
    const ctx = createMockContext({ userId: 'user-1', email: 'a@b.com' }, '00000000-0000-0000-0000-000000000001');
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should allow owner on admin-only route', async () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('admin');
    const guard = new OrgMembershipGuard(createMockPrisma({ role: 'owner' }), reflector);
    const ctx = createMockContext({ userId: 'user-1', email: 'a@b.com' }, '00000000-0000-0000-0000-000000000001');
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('should allow admin on admin-only route', async () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('admin');
    const guard = new OrgMembershipGuard(createMockPrisma({ role: 'admin' }), reflector);
    const ctx = createMockContext({ userId: 'user-1', email: 'a@b.com' }, '00000000-0000-0000-0000-000000000001');
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('should throw when admin tries owner-only route', async () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('owner');
    const guard = new OrgMembershipGuard(createMockPrisma({ role: 'admin' }), reflector);
    const ctx = createMockContext({ userId: 'user-1', email: 'a@b.com' }, '00000000-0000-0000-0000-000000000001');
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });
});

describe('OrgMembershipGuard role metadata inheritance', () => {
  const user = { userId: 'user-1', email: 'a@b.com' };
  const orgId = '00000000-0000-0000-0000-000000000001';

  it('enforces a controller-level minimum role', async () => {
    class AdminController { action() {} }
    Reflect.defineMetadata(MIN_ROLE_KEY, 'admin', AdminController);
    const context = createMockContext(user, orgId);
    context.getClass = (() => AdminController) as ExecutionContext['getClass'];
    context.getHandler = () => AdminController.prototype.action;
    const guard = new OrgMembershipGuard(createMockPrisma({ role: 'member' }), new Reflector());
    await expect(guard.canActivate(context)).rejects.toThrow('Insufficient role');
  });

  it('allows a handler role to override the controller role', async () => {
    class AdminController { action() {} }
    Reflect.defineMetadata(MIN_ROLE_KEY, 'admin', AdminController);
    Reflect.defineMetadata(MIN_ROLE_KEY, 'member', AdminController.prototype.action);
    const context = createMockContext(user, orgId);
    context.getClass = (() => AdminController) as ExecutionContext['getClass'];
    context.getHandler = () => AdminController.prototype.action;
    const guard = new OrgMembershipGuard(createMockPrisma({ role: 'member' }), new Reflector());
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('resolves a slug before checking membership and populating org context', async () => {
    const prisma = createMockPrisma({ role: 'admin' });
    prisma.organization = { findUnique: jest.fn().mockResolvedValue({ id: orgId }) };
    const guard = new OrgMembershipGuard(prisma, new Reflector());
    const context = createMockContext(user, 'org-slug');
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(prisma.orgMembership.findUnique).toHaveBeenCalledWith({ where: { orgId_userId: { orgId, userId: user.userId } } });
    expect(context.switchToHttp().getRequest().orgContext.orgId).toBe(orgId);
  });
});
