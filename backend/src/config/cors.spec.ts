import { buildStaticOrigins, isOriginAllowed, SELF_ORIGIN } from './cors';

describe('buildStaticOrigins', () => {
  it('always includes the API self origin', () => {
    const origins = buildStaticOrigins({ nodeEnv: 'production' });
    expect(origins.has(SELF_ORIGIN)).toBe(true);
  });

  it('includes local dev hosts outside production', () => {
    const origins = buildStaticOrigins({ nodeEnv: 'development' });
    expect(origins.has('http://localhost:3001')).toBe(true);
    expect(origins.has('http://127.0.0.1:3002')).toBe(true);
  });

  it('omits local dev hosts in production', () => {
    const origins = buildStaticOrigins({ nodeEnv: 'production' });
    expect(origins.has('http://localhost:3001')).toBe(false);
  });

  it('parses and trims ALLOWED_ORIGINS', () => {
    const origins = buildStaticOrigins({
      nodeEnv: 'production',
      allowedOrigins: ' https://a.example.com , https://b.example.com ',
    });
    expect(origins.has('https://a.example.com')).toBe(true);
    expect(origins.has('https://b.example.com')).toBe(true);
  });

  it('ignores empty entries in ALLOWED_ORIGINS', () => {
    const origins = buildStaticOrigins({
      nodeEnv: 'production',
      allowedOrigins: 'https://a.example.com,,',
    });
    expect(origins.has('')).toBe(false);
    expect(origins.has('https://a.example.com')).toBe(true);
  });
});

describe('isOriginAllowed', () => {
  const staticOrigins = buildStaticOrigins({ nodeEnv: 'production' });
  const brandDomains = new Set(['https://learn.example.com']);

  it('allows requests with no origin (server-to-server, curl)', () => {
    expect(isOriginAllowed(undefined, staticOrigins, brandDomains)).toBe(true);
  });

  it('allows the API self origin', () => {
    expect(isOriginAllowed(SELF_ORIGIN, staticOrigins, brandDomains)).toBe(true);
  });

  it('allows a known brand domain', () => {
    expect(
      isOriginAllowed('https://learn.example.com', staticOrigins, brandDomains),
    ).toBe(true);
  });

  it('rejects an unknown origin without throwing', () => {
    expect(() =>
      isOriginAllowed('https://evil.example.com', staticOrigins, brandDomains),
    ).not.toThrow();
    expect(
      isOriginAllowed('https://evil.example.com', staticOrigins, brandDomains),
    ).toBe(false);
  });
});
