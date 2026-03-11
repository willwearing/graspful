import { SupabaseAuthGuard, AuthUser } from './supabase-auth.guard';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { exportJWK, generateKeyPair, SignJWT, FlattenedJWSInput, JWSHeaderParameters } from 'jose';

let privateKey: CryptoKey;
let mockJwks: any;

beforeAll(async () => {
  const keys = await generateKeyPair('ES256');
  privateKey = keys.privateKey;
  const publicJwk = await exportJWK(keys.publicKey);
  publicJwk.kid = 'test-kid';
  publicJwk.alg = 'ES256';
  publicJwk.use = 'sig';

  // Mock JWKS function that returns the public key
  mockJwks = async (protectedHeader: JWSHeaderParameters, _token: FlattenedJWSInput) => {
    if (protectedHeader.kid === 'test-kid') {
      return keys.publicKey;
    }
    throw new Error('Unknown kid');
  };
});

function createMockContext(authHeader?: string): ExecutionContext {
  const request = { headers: { authorization: authHeader }, user: undefined as AuthUser | undefined };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

function createGuard(): SupabaseAuthGuard {
  const configService = {
    get: (key: string) => key === 'SUPABASE_URL' ? 'https://test.supabase.co' : undefined,
  } as ConfigService;
  const guard = new SupabaseAuthGuard(configService);
  // Inject test JWKS instead of remote fetch
  guard.setJwks(mockJwks);
  return guard;
}

async function signToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'ES256', kid: 'test-kid' })
    .setAudience('authenticated')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);
}

describe('SupabaseAuthGuard', () => {
  let guard: SupabaseAuthGuard;

  beforeEach(() => {
    guard = createGuard();
  });

  it('should throw UnauthorizedException when no authorization header', async () => {
    const ctx = createMockContext();
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when header does not start with Bearer', async () => {
    const ctx = createMockContext('Basic abc123');
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException for invalid token', async () => {
    const ctx = createMockContext('Bearer invalid.token.here');
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when token has wrong audience', async () => {
    const token = await new SignJWT({ sub: 'user-1', email: 'test@example.com' })
      .setProtectedHeader({ alg: 'ES256', kid: 'test-kid' })
      .setAudience('wrong-audience')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);
    const ctx = createMockContext(`Bearer ${token}`);
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when token is missing sub', async () => {
    const token = await new SignJWT({ email: 'test@example.com' })
      .setProtectedHeader({ alg: 'ES256', kid: 'test-kid' })
      .setAudience('authenticated')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);
    const ctx = createMockContext(`Bearer ${token}`);
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should return true and set request.user for valid token', async () => {
    const token = await signToken({ sub: 'user-123', email: 'test@example.com' });
    const ctx = createMockContext(`Bearer ${token}`);
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);

    const request = ctx.switchToHttp().getRequest();
    expect(request.user).toEqual({
      userId: 'user-123',
      email: 'test@example.com',
    });
  });

  it('should throw UnauthorizedException for expired token', async () => {
    const token = await new SignJWT({ sub: 'user-123', email: 'test@example.com' })
      .setProtectedHeader({ alg: 'ES256', kid: 'test-kid' })
      .setAudience('authenticated')
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(privateKey);
    const ctx = createMockContext(`Bearer ${token}`);
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });
});
