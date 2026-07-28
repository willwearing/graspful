/**
 * CORS origin resolution.
 *
 * The set of allowed origins is composed from three sources:
 *  1. The API's own origin (`SELF_ORIGIN`) — legitimate same-host requests.
 *  2. Static origins: local dev app hosts (non-production only) + the
 *     `ALLOWED_ORIGINS` env var.
 *  3. Brand domains loaded from the DB at request time (cached in `main.ts`).
 *
 * Rejections are NOT errors: an origin that isn't allowed is a normal outcome
 * of cross-origin traffic (browsers probe, other hosts call in), so the origin
 * callback returns `false` rather than throwing. Throwing produced a plain
 * `Error` that the exception filter treated as an unhandled 500 and shipped to
 * error tracking, creating noise for expected cross-origin requests.
 */

/** The API's own public origin. Same-host requests must never be rejected. */
export const SELF_ORIGIN = 'https://api.graspful.ai';

const LOCAL_DEV_ORIGINS = [
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3002',
];

/**
 * Build the set of always-allowed static origins from the environment.
 * Includes the API's own origin plus, outside production, the local dev hosts.
 */
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

/**
 * Decide whether an origin is permitted. A missing origin (server-to-server,
 * curl, same-origin navigations) is always allowed.
 */
export function isOriginAllowed(
  origin: string | undefined,
  staticOrigins: Set<string>,
  brandDomains: Set<string>,
): boolean {
  if (!origin) return true;
  if (staticOrigins.has(origin)) return true;
  return brandDomains.has(origin);
}
