const PROBE_ORIGIN = 'https://redirect-check.invalid';

/**
 * Returns `raw` only when it is a same-origin path, otherwise `fallback`.
 * Parsing with a probe origin catches the tricks a prefix check misses:
 * `//evil.com`, `/\evil.com`, and tabs or newlines that browsers strip.
 */
export function safeRedirectPath(raw: string | null | undefined, fallback: string): string {
  if (!raw || !raw.startsWith('/') || raw.includes('\\')) return fallback;

  try {
    const url = new URL(raw, PROBE_ORIGIN);
    if (url.origin !== PROBE_ORIGIN) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
