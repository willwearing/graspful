import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { ApiKeyGuard } from '../api-key/api-key.guard';

/**
 * Composite guard: accepts either a Supabase JWT or a `gsk_` API key.
 *
 * When an API key is used, it maps `request.apiKeyUser` into `request.user`
 * so downstream guards (OrgMembershipGuard) and decorators (CurrentUser)
 * see a consistent AuthUser shape.
 */
@Injectable()
export class JwtOrApiKeyGuard implements CanActivate {
  constructor(
    private supabaseGuard: SupabaseAuthGuard,
    private apiKeyGuard: ApiKeyGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    if (authHeader.startsWith('Bearer gsk_')) {
      // API key path
      const result = await this.apiKeyGuard.canActivate(context);
      if (!result) return false;

      // Normalize: set request.user from the API key's linked user
      const apiKeyUser = request.apiKeyUser;
      if (apiKeyUser) {
        request.user = {
          userId: apiKeyUser.id,
          email: apiKeyUser.email,
        };
      }

      return true;
    }

    // JWT path
    return this.supabaseGuard.canActivate(context);
  }
}
