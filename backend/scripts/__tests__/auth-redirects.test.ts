import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const config = readFileSync(new URL("../../../supabase/config.toml", import.meta.url), "utf8");
const seed = readFileSync(new URL("../../prisma/seeds/brands.ts", import.meta.url), "utf8");
const redirects = config.match(/additional_redirect_urls\s*=\s*\[([\s\S]*?)\]/)?.[1] || "";
const domains = [...seed.matchAll(/domain:\s*"([^"]+)"/g)].map((match) => match[1]);

describe("Production auth redirect configuration", () => {
  test.each(domains)("permits confirmation and recovery on %s", (domain) => {
    const permitted = redirects.includes(`"https://${domain}/**"`) ||
      (domain.endsWith(".graspful.ai") && redirects.includes('"https://*.graspful.ai/**"'));
    expect(permitted).toBe(true);
  });

  test("permits new Graspful subdomains without permitting arbitrary Vercel projects", () => {
    expect(redirects).toContain('"https://*.graspful.ai/**"');
    expect(redirects).not.toContain('"https://*.vercel.app/**"');
  });
});
