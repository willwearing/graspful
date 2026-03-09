import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { OrgContext } from '../guards/org-membership.guard';

export const CurrentOrg = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): OrgContext => {
    return ctx.switchToHttp().getRequest().orgContext;
  },
);
