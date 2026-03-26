import type { BrandConfig } from "./config";
import { defaultBrand } from "./defaults";

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

/** Map raw API response to BrandConfig, filling defaults for missing nested fields. */
function mapToBrandConfig(data: Record<string, unknown>): BrandConfig {
  const landing = (data.landing || {}) as Record<string, unknown>;
  const hero = (landing.hero || {}) as Record<string, string>;
  const features = (landing.features || {}) as Record<string, unknown>;
  const howItWorks = (landing.howItWorks || {}) as Record<string, unknown>;
  const bottomCta = (landing.bottomCta || {}) as Record<string, string>;

  return {
    id: data.slug as string,
    name: data.name as string,
    domain: data.domain as string,
    tagline: (data.tagline as string) || "",
    logoUrl: (data.logoUrl as string) || "/icon.svg",
    faviconUrl: (data.faviconUrl as string) || "/favicon.ico",
    ogImageUrl: (data.ogImageUrl as string) || "",
    orgSlug: (data.orgSlug as string) || "",
    theme: data.theme && typeof data.theme === "object" && "light" in (data.theme as object)
      ? data.theme as BrandConfig["theme"]
      : defaultBrand.theme,
    landing: {
      hero: {
        headline: hero.headline || (data.name as string) || "",
        subheadline: hero.subheadline || "",
        ctaText: hero.ctaText || "Start Learning",
      },
      features: {
        heading: (features.heading as string) || "Features",
        subheading: (features.subheading as string) || "",
        items: (features.items as BrandConfig["landing"]["features"]["items"]) || [],
      },
      howItWorks: {
        heading: (howItWorks.heading as string) || "How it works",
        items: (howItWorks.items as BrandConfig["landing"]["howItWorks"]["items"]) || [],
      },
      faq: (landing.faq as BrandConfig["landing"]["faq"]) || [],
      bottomCta: {
        headline: bottomCta.headline || "Ready to start learning?",
        subheadline: bottomCta.subheadline || "Begin your adaptive learning journey today.",
      },
    },
    seo: {
      title: ((data.seo as Record<string, unknown>)?.title as string) || (data.name as string) || "",
      description: ((data.seo as Record<string, unknown>)?.description as string) || "",
      keywords: ((data.seo as Record<string, unknown>)?.keywords as string[]) || [],
    },
    pricing: data.pricing && typeof data.pricing === "object" && "monthly" in (data.pricing as object)
      ? data.pricing as BrandConfig["pricing"]
      : defaultBrand.pricing,
    contentScope: data.contentScope && typeof data.contentScope === "object" && "courseIds" in (data.contentScope as object)
      ? data.contentScope as BrandConfig["contentScope"]
      : { courseIds: [] },
  };
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
    const brand = mapToBrandConfig(data);

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
    const brand = mapToBrandConfig(data);

    cache.set(domain, { brand, expiresAt: now + CACHE_TTL_MS });
    return brand;
  } catch {
    return null;
  }
}
