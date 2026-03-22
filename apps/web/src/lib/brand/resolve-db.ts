import type { BrandConfig } from "./config";

const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:3000";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  brand: BrandConfig | null;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export function clearBrandCache() {
  cache.clear();
}

export async function fetchBrandByDomain(
  domain: string,
): Promise<BrandConfig | null> {
  const now = Date.now();
  const cached = cache.get(domain);
  if (cached && cached.expiresAt > now) {
    return cached.brand;
  }

  try {
    const res = await fetch(
      `${BACKEND_URL}/brands/by-domain/${encodeURIComponent(domain)}`,
      {
        next: { revalidate: 300 },
      },
    );

    if (!res.ok) {
      cache.set(domain, { brand: null, expiresAt: now + CACHE_TTL_MS });
      return null;
    }

    const data = await res.json();
    const brand: BrandConfig = {
      id: data.slug,
      name: data.name,
      domain: data.domain,
      tagline: data.tagline,
      logoUrl: data.logoUrl,
      faviconUrl: data.faviconUrl,
      ogImageUrl: data.ogImageUrl || "",
      orgSlug: data.orgSlug,
      theme: data.theme,
      landing: data.landing,
      seo: data.seo,
      pricing: data.pricing,
      contentScope: data.contentScope,
    };

    cache.set(domain, { brand, expiresAt: now + CACHE_TTL_MS });
    return brand;
  } catch {
    return null;
  }
}
