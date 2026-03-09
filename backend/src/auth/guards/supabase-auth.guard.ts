import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

export interface AuthUser {
  userId: string;
  email: string;
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);

    try {
      const payload = jwt.verify(token, this.config.get('SUPABASE_JWT_SECRET')!, {
        algorithms: ['HS256'],
        audience: 'authenticated',
      }) as jwt.JwtPayload;

      if (!payload.sub) {
        throw new UnauthorizedException('Token missing subject');
      }

      request.user = {
        userId: payload.sub,
        email: payload.email,
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
