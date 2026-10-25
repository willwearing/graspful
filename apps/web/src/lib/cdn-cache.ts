/**
 * Marketing pages that render the same HTML for every visitor on a host.
 * Vercel's CDN caches them at the edge. The cache key includes the host and
 * deployment, so each brand gets its own entries and every deploy starts fresh.
 *
 * Keep out of this list:
 * - `/`: the homepage experiment bootstraps a per-visitor distinct ID into the HTML.
 * - Auth pages: the proxy redirects signed-in visitors and they handle tokens.
 * - App and learner routes: they render per-user data.
 */
export const CDN_CACHED_MARKETING_PATHS = [
  "/pricing",
  "/agents",
  "/ai-course-builder",
  "/academies/:path*",
  "/docs/:path*",
] as const;

/** Serve from the edge for 5 minutes, then refresh in the background for up to a day. */
export const CDN_CACHE_CONTROL = "s-maxage=300, stale-while-revalidate=86400";

export function cdnCacheHeaders() {
  return CDN_CACHED_MARKETING_PATHS.map((source) => ({
    source,
    // Next.js marks these dynamic pages private for browsers. This header only
    // reaches Vercel's CDN, so browsers keep revalidating on every visit.
    headers: [{ key: "Vercel-CDN-Cache-Control", value: CDN_CACHE_CONTROL }],
  }));
}
