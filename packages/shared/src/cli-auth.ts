/** Crockford base32 without I, L, O, U so codes are easy to read aloud. */
const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Short code derived from a CLI auth session token. The terminal and the
 * /cli-auth page both show it, so the person approving in the browser can
 * confirm the request came from their own terminal. Uses Web Crypto so it
 * runs in Node 18+ and the browser.
 */
export async function cliAuthConfirmationCode(token: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token),
  );
  const chars = Array.from(new Uint8Array(digest).slice(0, 8), (byte) => CODE_ALPHABET[byte % 32]);
  return `${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`;
}
