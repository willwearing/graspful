import { describe, expect, it } from 'bun:test';
import { safeRedirectPath } from '../safe-redirect';

describe('safeRedirectPath', () => {
  it.each([
    ['/dashboard', '/dashboard'],
    ['/cli-auth?mode=sign-up&x=1#token=abc', '/cli-auth?mode=sign-up&x=1#token=abc'],
  ])('keeps same-origin path %s', (raw, expected) => {
    expect(safeRedirectPath(raw, '/home')).toBe(expected);
  });

  it.each([
    null,
    '',
    'dashboard',
    'https://evil.com',
    '//evil.com',
    '/\\evil.com',
    '/\t/evil.com',
    '/\n/evil.com',
    'javascript:alert(1)',
  ])('falls back for %p', (raw) => {
    expect(safeRedirectPath(raw, '/home')).toBe('/home');
  });
});
