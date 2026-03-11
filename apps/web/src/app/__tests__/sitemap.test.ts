import { describe, it, expect } from "vitest";
import sitemap from "../sitemap";
import robots from "../robots";

describe("sitemap", () => {
  it("should include marketing pages", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls.some((u) => u.endsWith("/"))).toBe(false); // base URL has no trailing slash
    expect(urls.some((u) => u.includes("electricianprep.audio"))).toBe(true);
    expect(urls.some((u) => u.includes("/pricing"))).toBe(true);
    expect(urls.some((u) => u.includes("/sign-up"))).toBe(true);
  });

  it("should not include authenticated routes", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls.some((u) => u.includes("/dashboard"))).toBe(false);
    expect(urls.some((u) => u.includes("/study"))).toBe(false);
    expect(urls.some((u) => u.includes("/settings"))).toBe(false);
  });

  it("should set appropriate priorities", async () => {
    const entries = await sitemap();
    const home = entries.find((e) => !e.url.includes("/pricing") && !e.url.includes("/sign-up"));
    expect(home?.priority).toBe(1.0);
  });
});

describe("robots", () => {
  it("should disallow authenticated routes", async () => {
    const config = await robots();
    const rules = config.rules;
    const firstRule = Array.isArray(rules) ? rules[0] : rules;
    const disallowed = Array.isArray(firstRule.disallow)
      ? firstRule.disallow
      : [firstRule.disallow];
    expect(disallowed).toContain("/dashboard");
    expect(disallowed).toContain("/study");
    expect(disallowed).toContain("/auth");
  });

  it("should include sitemap URL", async () => {
    const config = await robots();
    expect(config.sitemap).toContain("sitemap.xml");
  });
});
