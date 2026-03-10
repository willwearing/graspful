import type { BrandConfig } from "./config";
import { defaultBrand, firefighterBrand, electricianBrand } from "./defaults";

/** In-memory brand registry. Phase 7 uses hardcoded brands; future phases fetch from DB. */
const brandsByDomain = new Map<string, BrandConfig>([
  ["firefighterprep.audio", firefighterBrand],
  ["electricianprep.audio", electricianBrand],
]);

const brandsById = new Map<string, BrandConfig>([
  ["firefighter", firefighterBrand],
  ["electrician", electricianBrand],
]);

export async function resolveBrand(hostname: string): Promise<BrandConfig> {
  const host = hostname.split(":")[0];

  // Development: localhost resolves via DEV_BRAND_ID env var
  if (host === "localhost" || host === "127.0.0.1") {
    const devBrandId =
      typeof process !== "undefined"
        ? process.env.DEV_BRAND_ID || "firefighter"
        : "firefighter";
    return brandsById.get(devBrandId) ?? defaultBrand;
  }

  // Production: resolve by domain
  return brandsByDomain.get(host) ?? defaultBrand;
}
