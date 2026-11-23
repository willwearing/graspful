/**
 * Paths that vulnerability scanners request and that no Graspful route uses:
 * dotfiles, server-side script extensions, WordPress and admin tools, OS paths
 * and path traversal. The proxy answers these with a small 404 so a scan does
 * not render the sign-in page for every probe.
 */
const DOTFILE_SEGMENT = /^\.(?!well-known$)/;
const SCRIPT_OR_SECRET_FILE = /\.(php\d?|phtml|asp|aspx|jsp|cgi|env|ini|sql|bak|old|swp|cfg|conf|log)$/i;
const CREDENTIALS_FILE = /credentials(\.(json|txt|ya?ml))?$/i;
const PROBE_SEGMENT = /^(wp-(admin|content|includes|json|login)|xmlrpc|cgi-bin|phpmyadmin|actuator|server-status)$/i;
const OS_ROOT_SEGMENT = /^(proc|etc|var|usr|root|vendor)$/i;

function decodePath(pathname: string): string {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

export function isProbePath(pathname: string): boolean {
  const path = decodePath(pathname);
  if (path.includes("..") || path.includes("\\")) return true;

  const segments = path.split("/").filter(Boolean);
  if (segments.length > 0 && OS_ROOT_SEGMENT.test(segments[0])) return true;

  return segments.some(
    (segment) =>
      DOTFILE_SEGMENT.test(segment) ||
      SCRIPT_OR_SECRET_FILE.test(segment) ||
      CREDENTIALS_FILE.test(segment) ||
      PROBE_SEGMENT.test(segment),
  );
}
