import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchBrandByDomain, clearBrandCache } from "../resolve-db";

const makeMockApiResponse = (overrides: Record<string, unknown> = {}) => ({
  slug: "firefighter",
  name: "FirefighterPrep",
  domain: "firefighterprep.audio",
  tagline: "Pass Your Exam",
  logoUrl: "/logo.svg",
  faviconUrl: "/favicon.ico",
  ogImageUrl: "/og.png",
  orgSlug: "firefighter-prep",
  theme: { light: {}, dark: {}, radius: "0.5rem" },
  landing: {
    hero: { headline: "H", subheadline: "S", ctaText: "C" },
    features: { heading: "", subheading: "", items: [] },
    howItWorks: { heading: "", items: [] },
    faq: [],
    bottomCta: { headline: "", subheadline: "" },
  },
  seo: { title: "", description: "", keywords: [] },
  pricing: { monthly: 14.99, yearly: 149, currency: "USD", trialDays: 7 },
  contentScope: { courseIds: [] },
  ...overrides,
});

describe("fetchBrandByDomain", () => {
  beforeEach(() => {
    clearBrandCache();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches brand from API and returns BrandConfig", async () => {
    const mockBrand = makeMockApiResponse();

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockBrand),
    });

    const result = await fetchBrandByDomain("firefighterprep.audio");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("firefighter");
    expect(result!.name).toBe("FirefighterPrep");
  });

  it("returns null when API returns 404", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });
    const result = await fetchBrandByDomain("unknown.com");
    expect(result).toBeNull();
  });

  it("returns null when API is unreachable", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("ECONNREFUSED"),
    );
    const result = await fetchBrandByDomain("firefighterprep.audio");
    expect(result).toBeNull();
  });

  it("uses cache on subsequent calls", async () => {
    const mockBrand = makeMockApiResponse({ ogImageUrl: null });

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockBrand),
    });

    await fetchBrandByDomain("firefighterprep.audio");
    await fetchBrandByDomain("firefighterprep.audio");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("maps slug to id and ogImageUrl null to empty string", async () => {
    const mockBrand = makeMockApiResponse({ ogImageUrl: null });

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockBrand),
    });

    const result = await fetchBrandByDomain("firefighterprep.audio");
    expect(result!.id).toBe("firefighter");
    expect(result!.ogImageUrl).toBe("");
  });
});
