import { SetMetadata } from '@nestjs/common';
import { PlanTier } from '@prisma/client';
import { MIN_PLAN_KEY } from '../guards/subscription.guard';

export const MinPlan = (plan: PlanTier) => SetMetadata(MIN_PLAN_KEY, plan);
