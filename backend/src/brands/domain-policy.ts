const PLATFORM_APEXES = ['graspful.ai', 'graspful.com'];
const PLATFORM_SUFFIX = '.graspful.ai';

/** Subdomains of graspful.ai that serve the platform itself. */
const RESERVED_SUBDOMAINS = new Set([
  'www', 'app', 'api', 'admin', 'auth', 'docs', 'blog', 'status', 'mail',
  'dashboard', 'staging', 'dev', 'cdn', 'static', 'assets', 'help', 'support',
]);

const HOSTNAME_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/**
 * Lowercases and trims a brand domain, and rewrites the legacy `.graspful.com`
 * suffix to the canonical `.graspful.ai`. Custom domains keep their host.
 */
export function normalizeBrandDomain(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/\.$/, '')
    .replace(/\.graspful\.com$/, PLATFORM_SUFFIX);
}

export function isValidHostname(domain: string): boolean {
  return HOSTNAME_RE.test(domain);
}

/**
 * True for hosts that route to the Graspful platform rather than a creator
 * academy: the apex, platform subdomains, nested graspful.ai subdomains, and
 * Vercel deployment hosts.
 */
export function isReservedDomain(domain: string): boolean {
  if (PLATFORM_APEXES.includes(domain) || domain.endsWith('.vercel.app')) {
    return true;
  }
  if (!domain.endsWith(PLATFORM_SUFFIX)) return false;

  const label = domain.slice(0, -PLATFORM_SUFFIX.length);
  return label.includes('.') || RESERVED_SUBDOMAINS.has(label);
}
