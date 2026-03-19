import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '../guards/supabase-auth.guard';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    return ctx.switchToHttp().getRequest().user;
  },
);
