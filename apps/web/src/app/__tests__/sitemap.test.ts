import { describe, expect, it } from "vitest";
import sitemap from "../sitemap";
import robots from "../robots";
import {
  buildRobotsConfig,
  buildSitemapEntries,
  privatePageRobots,
} from "@/lib/seo/surface-indexing";

describe("sitemap", () => {
  it("includes marketing pages for the platform host", async () => {
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);
    expect(urls.some((url) => url.includes("graspful.ai") || url.includes("vercel.app"))).toBe(true);
    expect(urls.some((url) => url.includes("/pricing"))).toBe(true);
    expect(urls.some((url) => url.includes("/academies"))).toBe(true);
    expect(urls.some((url) => url.includes("/ai-course-builder"))).toBe(true);
    expect(urls.some((url) => url.includes("/docs/how-it-works"))).toBe(true);
    expect(
      urls.some((url) => url.includes("/docs/course-creation-guide")),
    ).toBe(true);
    expect(
      urls.some((url) => url.includes("/docs/concepts/mastery-learning")),
    ).toBe(true);
    expect(urls.some((url) => url.includes("/sign-up"))).toBe(false);
    expect(urls.some((url) => url.includes("/sign-in"))).toBe(false);
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
    expect(urls).toEqual(["https://firefighterprep.vercel.app"]);
  });

  it("omits sitemap entries entirely for the app host", () => {
    expect(buildSitemapEntries("https://app.graspful.ai", "app")).toEqual([]);
  });
});

describe("robots", () => {
  it("allows crawlers to read noindex directives on the platform host", async () => {
    const config = await robots();
    const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;
    expect(rules.allow).toBe("/");
    expect(rules.disallow).toBeUndefined();
  });

  it("lets crawlers read noindex directives on the app host", () => {
    const config = buildRobotsConfig("https://app.graspful.ai", "app");
    const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;
    expect(rules.allow).toBe("/");
    expect(rules.disallow).toBeUndefined();
    expect(config.sitemap).toBeUndefined();
  });

  it("lets crawlers read noindex directives on academy routes", () => {
    const config = buildRobotsConfig("https://firefighterprep.vercel.app", "academy");
    const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;
    expect(rules.allow).toBe("/");
    expect(rules.disallow).toBeUndefined();
  });

  it("includes a sitemap url", async () => {
    const config = await robots();
    expect(config.sitemap).toContain("sitemap.xml");
  });
});

describe("private page metadata", () => {
  it("keeps authenticated and control-plane pages out of search indexes", () => {
    expect(privatePageRobots).toMatchObject({
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    });
  });
});
