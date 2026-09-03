/** The API's own public origin. Same-host requests must never be rejected. */
export const SELF_ORIGIN = 'https://api.graspful.ai';

const LOCAL_DEV_ORIGINS = [
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3002',
];

/** Build the set of always-allowed static origins from the environment. */
export function buildStaticOrigins(opts: {
  nodeEnv: string;
  allowedOrigins?: string;
}): Set<string> {
  const localOrigins = opts.nodeEnv === 'production' ? [] : LOCAL_DEV_ORIGINS;
  return new Set(
    [SELF_ORIGIN, ...localOrigins, ...(opts.allowedOrigins?.split(',') ?? [])]
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

/** Decide whether an origin is permitted. */
export function isOriginAllowed(
  origin: string | undefined,
  staticOrigins: ReadonlySet<string>,
  brandDomains: ReadonlySet<string>,
): boolean {
  if (!origin) return true;
  if (staticOrigins.has(origin)) return true;
  return brandDomains.has(origin);
}
