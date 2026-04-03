import { describe, expect, it } from "vitest";
import sitemap from "../sitemap";
import robots from "../robots";
import { buildRobotsConfig, buildSitemapEntries } from "@/lib/seo/surface-indexing";

describe("sitemap", () => {
  it("includes marketing pages for the platform host", async () => {
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);
    expect(urls.some((url) => url.includes("graspful.ai") || url.includes("vercel.app"))).toBe(true);
    expect(urls.some((url) => url.includes("/pricing"))).toBe(true);
    expect(urls.some((url) => url.includes("/sign-up"))).toBe(true);
  });

  it("excludes authenticated routes from the platform sitemap", async () => {
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);
    expect(urls.some((url) => url.includes("/dashboard"))).toBe(false);
    expect(urls.some((url) => url.includes("/study"))).toBe(false);
    expect(urls.some((url) => url.includes("/settings"))).toBe(false);
  });

  it("reduces academy sitemaps to academy-facing pages", () => {
    const entries = buildSitemapEntries("https://firefighterprep.vercel.app", "academy");
    const urls = entries.map((entry) => entry.url);
    expect(urls).toEqual([
      "https://firefighterprep.vercel.app",
      "https://firefighterprep.vercel.app/sign-up",
      "https://firefighterprep.vercel.app/sign-in",
    ]);
  });

  it("omits sitemap entries entirely for the app host", () => {
    expect(buildSitemapEntries("https://app.graspful.ai", "app")).toEqual([]);
  });
});

describe("robots", () => {
  it("disallows authenticated routes on the platform host", async () => {
    const config = await robots();
    const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;
    const disallowed = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow];
    expect(disallowed).toContain("/dashboard");
    expect(disallowed).toContain("/study");
    expect(disallowed).toContain("/auth");
    expect(disallowed).toContain("/creator");
  });

  it("locks down the app host from indexing", () => {
    const config = buildRobotsConfig("https://app.graspful.ai", "app");
    const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;
    expect(rules.disallow).toBe("/");
  });

  it("keeps academy robots focused on academy content", () => {
    const config = buildRobotsConfig("https://firefighterprep.vercel.app", "academy");
    const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;
    const allowed = Array.isArray(rules.allow) ? rules.allow : [rules.allow];
    const disallowed = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow];
    expect(allowed).toContain("/");
    expect(disallowed).toContain("/pricing");
    expect(disallowed).toContain("/creator");
  });

  it("includes a sitemap url", async () => {
    const config = await robots();
    expect(config.sitemap).toContain("sitemap.xml");
  });
});
