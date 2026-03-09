import { GlobalAdminGuard } from './global-admin.guard';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

function createMockPrisma(dbUser: { isGlobalAdmin: boolean } | null) {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue(dbUser),
    },
  } as any;
}

function createMockContext(user: any): ExecutionContext {
  const request = { user };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('GlobalAdminGuard', () => {
  it('should throw ForbiddenException when no user on request', async () => {
    const guard = new GlobalAdminGuard(createMockPrisma(null));
    const ctx = createMockContext(undefined);
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user not found in DB', async () => {
    const guard = new GlobalAdminGuard(createMockPrisma(null));
    const ctx = createMockContext({ userId: 'user-1' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user is not global admin', async () => {
    const guard = new GlobalAdminGuard(createMockPrisma({ isGlobalAdmin: false }));
    const ctx = createMockContext({ userId: 'user-1' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should return true when user is global admin', async () => {
    const guard = new GlobalAdminGuard(createMockPrisma({ isGlobalAdmin: true }));
    const ctx = createMockContext({ userId: 'user-1' });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });
});
