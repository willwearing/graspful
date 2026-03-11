import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlanTier } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

export const MIN_PLAN_KEY = 'minPlan';

const PLAN_HIERARCHY: Record<PlanTier, number> = {
  free: 0,
  individual: 1,
  team: 2,
  enterprise: 3,
};

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const minPlan =
      this.reflector.get<PlanTier>(MIN_PLAN_KEY, context.getHandler()) ?? 'free';

    if (minPlan === 'free') return true;

    const request = context.switchToHttp().getRequest();
    const orgId = request.params.orgId;
    if (!orgId) throw new ForbiddenException('Missing org context');

    const subscription = await this.prisma.subscription.findUnique({
      where: { orgId },
    });

    const currentPlan: PlanTier = subscription?.plan ?? 'free';
    const isActive =
      subscription?.status === 'active' || subscription?.status === 'trialing';

    if (!isActive || PLAN_HIERARCHY[currentPlan] < PLAN_HIERARCHY[minPlan]) {
      throw new ForbiddenException(
        `This feature requires the ${minPlan} plan or higher`,
      );
    }

    return true;
  }
}
