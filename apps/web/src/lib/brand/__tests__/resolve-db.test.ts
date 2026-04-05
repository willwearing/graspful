import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchBrandByDomain, clearBrandCache } from "../resolve-db";
import { defaultBrand } from "../defaults";

const makeMockApiResponse = (overrides: Record<string, unknown> = {}) => ({
  slug: "firefighter",
  name: "FirefighterPrep",
  domain: "firefighterprep.vercel.app",
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

    const result = await fetchBrandByDomain("firefighterprep.vercel.app");
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
    const result = await fetchBrandByDomain("firefighterprep.vercel.app");
    expect(result).toBeNull();
  });

  it("uses cache on subsequent calls", async () => {
    const mockBrand = makeMockApiResponse({ ogImageUrl: null });

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockBrand),
    });

    await fetchBrandByDomain("firefighterprep.vercel.app");
    await fetchBrandByDomain("firefighterprep.vercel.app");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("maps slug to id and ogImageUrl null to empty string", async () => {
    const mockBrand = makeMockApiResponse({ ogImageUrl: null });

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockBrand),
    });

    const result = await fetchBrandByDomain("firefighterprep.vercel.app");
    expect(result!.id).toBe("firefighter");
    expect(result!.ogImageUrl).toBe("");
  });

  describe("theme merge with defaults", () => {
    it("fills entire default theme when theme has preset only (no light/dark)", async () => {
      const mockBrand = makeMockApiResponse({
        theme: { preset: "blue" },
      });
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBrand),
      });
      const result = await fetchBrandByDomain("test-preset.com");
      expect(result!.theme.light.primary).toBe(defaultBrand.theme.light.primary);
      expect(result!.theme.dark.primary).toBe(defaultBrand.theme.dark.primary);
      expect(result!.theme.gradient).toEqual(defaultBrand.theme.gradient);
      expect(result!.theme.radius).toBe(defaultBrand.theme.radius);
    });

    it("fills gradient from defaults when theme has light/dark but no gradient", async () => {
      const mockBrand = makeMockApiResponse({
        theme: {
          light: { primary: "200 80% 50%" },
          dark: { primary: "200 80% 60%" },
          radius: "0.75rem",
        },
      });
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBrand),
      });
      const result = await fetchBrandByDomain("test-no-gradient.com");
      expect(result!.theme.gradient).toEqual(defaultBrand.theme.gradient);
      expect(result!.theme.light.primary).toBe("200 80% 50%");
      expect(result!.theme.radius).toBe("0.75rem");
    });

    it("fills missing color fields in light/dark from defaults", async () => {
      const mockBrand = makeMockApiResponse({
        theme: {
          light: { primary: "200 80% 50%", foreground: "0 0% 10%" },
          dark: { primary: "200 80% 60%" },
        },
      });
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBrand),
      });
      const result = await fetchBrandByDomain("test-partial-colors.com");
      expect(result!.theme.light.primary).toBe("200 80% 50%");
      expect(result!.theme.light.foreground).toBe("0 0% 10%");
      expect(result!.theme.light.popover).toBe(defaultBrand.theme.light.popover);
      expect(result!.theme.light.destructive).toBe(defaultBrand.theme.light.destructive);
      expect(result!.theme.dark.foreground).toBe(defaultBrand.theme.dark.foreground);
    });

    it("uses full custom theme as-is when all fields present", async () => {
      const fullTheme = {
        light: { ...defaultBrand.theme.light, primary: "120 60% 40%" },
        dark: { ...defaultBrand.theme.dark, primary: "120 60% 50%" },
        radius: "1rem",
        gradient: { start: "#FF0000", mid: "#00FF00", end: "#0000FF", accent: "#FFFF00" },
      };
      const mockBrand = makeMockApiResponse({ theme: fullTheme });
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBrand),
      });
      const result = await fetchBrandByDomain("test-full-theme.com");
      expect(result!.theme.gradient).toEqual(fullTheme.gradient);
      expect(result!.theme.radius).toBe("1rem");
      expect(result!.theme.light.primary).toBe("120 60% 40%");
    });
  });

  describe("pricing merge with defaults", () => {
    it("fills missing pricing fields from defaults", async () => {
      const mockBrand = makeMockApiResponse({
        pricing: { monthly: 9.99, currency: "EUR" },
      });
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBrand),
      });
      const result = await fetchBrandByDomain("test-pricing.com");
      expect(result!.pricing.monthly).toBe(9.99);
      expect(result!.pricing.currency).toBe("EUR");
      expect(result!.pricing.yearly).toBe(defaultBrand.pricing.yearly);
      expect(result!.pricing.trialDays).toBe(defaultBrand.pricing.trialDays);
    });
  });
});
