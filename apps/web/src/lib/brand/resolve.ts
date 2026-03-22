import { headers } from "next/headers";
import type { BrandConfig } from "./config";
import { defaultBrand, firefighterBrand, electricianBrand, javascriptBrand, posthogBrand } from "./defaults";
import { fetchBrandByDomain } from "./resolve-db";

/** In-memory brand registry. Phase 7 uses hardcoded brands; future phases fetch from DB. */
const brandsByDomain = new Map<string, BrandConfig>([
  ["firefighterprep.audio", firefighterBrand],
  ["electricianprep.audio", electricianBrand],
  ["jsprep.audio", javascriptBrand],
  ["posthog-tam.audio", posthogBrand],
]);

export const brandsById = new Map<string, BrandConfig>([
  ["firefighter", firefighterBrand],
  ["electrician", electricianBrand],
  ["javascript", javascriptBrand],
  ["posthog", posthogBrand],
]);

/**
 * Resolve the active brand from hostname.
 *
 * In dev, checks for a `dev-brand-override` cookie first (set by the DevBrandSwitcher widget),
 * then falls back to the DEV_BRAND_ID env var, then to the default brand.
 *
 * Pass cookieHeader when calling from middleware/server context to enable cookie override.
 */
export async function resolveBrand(
  hostname: string,
  cookieHeader?: string | null,
): Promise<BrandConfig> {
  const host = hostname.split(":")[0];

  // Development: check cookie override, then env var
  if (host === "localhost" || host === "127.0.0.1") {
    // Check dev-brand-override cookie
    if (cookieHeader) {
      const match = cookieHeader.match(/dev-brand-override=([^;]+)/);
      if (match) {
        const overrideBrand = brandsById.get(match[1]);
        if (overrideBrand) return overrideBrand;
      }
    }

    const devBrandId =
      typeof process !== "undefined"
        ? process.env.DEV_BRAND_ID || "firefighter"
        : "firefighter";
    return brandsById.get(devBrandId) ?? defaultBrand;
  }

  // Production: try database first, fall back to hardcoded map
  const dbBrand = await fetchBrandByDomain(host);
  if (dbBrand) return dbBrand;
  return brandsByDomain.get(host) ?? defaultBrand;
}

/**
 * Server Component helper — reads hostname and cookies from Next.js headers automatically.
 * Use this in page components instead of manually plumbing headers.
 */
export async function resolvePageBrand(): Promise<BrandConfig> {
  const headersList = await headers();
  const hostname = headersList.get("host") || "localhost";
  const cookieHeader = headersList.get("cookie");
  return resolveBrand(hostname, cookieHeader);
}
