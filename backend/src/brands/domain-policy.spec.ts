import { isReservedDomain, isValidHostname, normalizeBrandDomain } from './domain-policy';

describe('domain policy', () => {
  it('normalizes case, whitespace, trailing dots and the legacy suffix', () => {
    expect(normalizeBrandDomain(' Prep.Graspful.com. ')).toBe('prep.graspful.ai');
    expect(normalizeBrandDomain('learn.example.com')).toBe('learn.example.com');
  });

  it.each(['learn.example.com', 'my-academy.graspful.ai'])('accepts hostname %s', (d) => {
    expect(isValidHostname(d)).toBe(true);
  });

  it.each(['https://x.com', 'x.com/path', 'localhost', '-bad.com', 'a..b.com'])('rejects %s', (d) => {
    expect(isValidHostname(d)).toBe(false);
  });

  it.each(['graspful.ai', 'graspful.com', 'www.graspful.ai', 'api.graspful.ai', 'x.app.graspful.ai', 'anything.vercel.app'])(
    'reserves %s',
    (d) => expect(isReservedDomain(d)).toBe(true),
  );

  it.each(['my-academy.graspful.ai', 'learn.example.com'])('does not reserve %s', (d) => {
    expect(isReservedDomain(d)).toBe(false);
  });
});
