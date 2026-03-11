import {
  CanActivate,
  ExecutionContext,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, FlattenedJWSInput, JWSHeaderParameters, GetKeyFunction } from 'jose';

export interface AuthUser {
  userId: string;
  email: string;
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate, OnModuleInit {
  private jwks!: GetKeyFunction<JWSHeaderParameters, FlattenedJWSInput>;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const supabaseUrl = this.config.get('SUPABASE_URL');
    this.jwks = createRemoteJWKSet(
      new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`),
    );
  }

  /** Allow injecting a custom JWKS for testing */
  setJwks(jwks: GetKeyFunction<JWSHeaderParameters, FlattenedJWSInput>) {
    this.jwks = jwks;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);

    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        audience: 'authenticated',
      });

      if (!payload.sub) {
        throw new UnauthorizedException('Token missing subject');
      }

      request.user = {
        userId: payload.sub,
        email: payload.email as string,
      } satisfies AuthUser;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
