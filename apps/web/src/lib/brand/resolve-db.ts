import type { BrandConfig } from "./config";

// Ensure the base URL always includes the /api/v1 prefix.
// BACKEND_INTERNAL_URL may be bare (e.g. http://backend:3000).
function resolveBackendUrl(): string {
  const raw = (
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:3000"
  ).trim();
  return raw.endsWith("/api/v1") ? raw : `${raw.replace(/\/$/, "")}/api/v1`;
}

const BACKEND_URL = resolveBackendUrl();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  brand: BrandConfig | null;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export function clearBrandCache() {
  cache.clear();
}

export async function fetchBrandBySlug(
  slug: string,
): Promise<BrandConfig | null> {
  const now = Date.now();
  const cacheKey = `slug:${slug}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.brand;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(
      `${BACKEND_URL}/brands/${encodeURIComponent(slug)}`,
      {
        next: { revalidate: 300 },
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);

    if (!res.ok) {
      cache.set(cacheKey, { brand: null, expiresAt: now + CACHE_TTL_MS });
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

    cache.set(cacheKey, { brand, expiresAt: now + CACHE_TTL_MS });
    return brand;
  } catch {
    return null;
  }
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(
      `${BACKEND_URL}/brands/by-domain/${encodeURIComponent(domain)}`,
      {
        next: { revalidate: 300 },
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);

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
