import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@/prisma/prisma.service';
import { SubscriptionGuard, MIN_PLAN_KEY } from './subscription.guard';

describe('SubscriptionGuard', () => {
  let guard: SubscriptionGuard;
  let mockPrisma: any;
  let mockReflector: any;

  beforeEach(() => {
    mockPrisma = {
      subscription: {
        findUnique: jest.fn(),
      },
    };

    mockReflector = {
      get: jest.fn(),
    };

    guard = new SubscriptionGuard(
      mockPrisma as unknown as PrismaService,
      mockReflector as unknown as Reflector,
    );
  });

  function createContext(orgId: string) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          params: { orgId },
        }),
      }),
      getHandler: () => ({}),
    } as unknown as ExecutionContext;
  }

  it('should allow when no minimum plan is set (defaults to free)', async () => {
    mockReflector.get.mockReturnValue(undefined);

    const result = await guard.canActivate(createContext('org-1'));

    expect(result).toBe(true);
    expect(mockPrisma.subscription.findUnique).not.toHaveBeenCalled();
  });

  it('should allow when subscription meets minimum plan', async () => {
    mockReflector.get.mockReturnValue('individual');
    mockPrisma.subscription.findUnique.mockResolvedValue({
      plan: 'team',
      status: 'active',
    });

    const result = await guard.canActivate(createContext('org-1'));

    expect(result).toBe(true);
  });

  it('should allow trialing subscriptions', async () => {
    mockReflector.get.mockReturnValue('individual');
    mockPrisma.subscription.findUnique.mockResolvedValue({
      plan: 'individual',
      status: 'trialing',
    });

    const result = await guard.canActivate(createContext('org-1'));

    expect(result).toBe(true);
  });

  it('should deny when plan is too low', async () => {
    mockReflector.get.mockReturnValue('team');
    mockPrisma.subscription.findUnique.mockResolvedValue({
      plan: 'individual',
      status: 'active',
    });

    await expect(guard.canActivate(createContext('org-1'))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should deny when subscription is canceled', async () => {
    mockReflector.get.mockReturnValue('individual');
    mockPrisma.subscription.findUnique.mockResolvedValue({
      plan: 'individual',
      status: 'canceled',
    });

    await expect(guard.canActivate(createContext('org-1'))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should deny when no subscription exists and plan > free required', async () => {
    mockReflector.get.mockReturnValue('individual');
    mockPrisma.subscription.findUnique.mockResolvedValue(null);

    await expect(guard.canActivate(createContext('org-1'))).rejects.toThrow(
      ForbiddenException,
    );
  });
});
