import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { OrgContext } from '@/auth/org-context';

export const CurrentOrg = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): OrgContext => {
    return ctx.switchToHttp().getRequest().orgContext;
  },
);
