import { SupabaseAuthGuard, AuthUser } from './supabase-auth.guard';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

const TEST_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long';

function createMockContext(authHeader?: string): ExecutionContext {
  const request = { headers: { authorization: authHeader }, user: undefined as AuthUser | undefined };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

function createGuard(): SupabaseAuthGuard {
  const configService = { get: (key: string) => key === 'SUPABASE_JWT_SECRET' ? TEST_SECRET : undefined } as ConfigService;
  return new SupabaseAuthGuard(configService);
}

function signToken(payload: object): string {
  return jwt.sign(payload, TEST_SECRET, { algorithm: 'HS256', audience: 'authenticated' });
}

describe('SupabaseAuthGuard', () => {
  let guard: SupabaseAuthGuard;

  beforeEach(() => {
    guard = createGuard();
  });

  it('should throw UnauthorizedException when no authorization header', () => {
    const ctx = createMockContext();
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when header does not start with Bearer', () => {
    const ctx = createMockContext('Basic abc123');
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException for invalid token', () => {
    const ctx = createMockContext('Bearer invalid.token.here');
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when token has wrong audience', () => {
    const token = jwt.sign({ sub: 'user-1', email: 'test@example.com' }, TEST_SECRET, {
      algorithm: 'HS256',
      audience: 'wrong-audience',
    });
    const ctx = createMockContext(`Bearer ${token}`);
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when token is missing sub', () => {
    const token = jwt.sign({ email: 'test@example.com' }, TEST_SECRET, {
      algorithm: 'HS256',
      audience: 'authenticated',
    });
    const ctx = createMockContext(`Bearer ${token}`);
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('should return true and set request.user for valid token', () => {
    const token = signToken({ sub: 'user-123', email: 'test@example.com' });
    const ctx = createMockContext(`Bearer ${token}`);
    const result = guard.canActivate(ctx);
    expect(result).toBe(true);

    const request = ctx.switchToHttp().getRequest();
    expect(request.user).toEqual({
      userId: 'user-123',
      email: 'test@example.com',
    });
  });

  it('should throw UnauthorizedException for expired token', () => {
    const token = jwt.sign(
      { sub: 'user-123', email: 'test@example.com', exp: Math.floor(Date.now() / 1000) - 3600 },
      TEST_SECRET,
      { algorithm: 'HS256', audience: 'authenticated' },
    );
    const ctx = createMockContext(`Bearer ${token}`);
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});
