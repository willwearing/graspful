import { describe, expect, it } from "vitest";
import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import { isAuthPage, isMarketingRoute } from "@/lib/hosts";
import { CDN_CACHE_CONTROL, cdnCacheHeaders } from "../cdn-cache";

const matchers = cdnCacheHeaders().map(({ source }) => getPathMatch(source));

function isCdnCached(pathname: string): boolean {
  return matchers.some((match) => match(pathname) !== false);
}

describe("CDN cache policy", () => {
  it.each([
    "/pricing",
    "/agents",
    "/ai-course-builder",
    "/academies",
    "/academies/posthog-tam",
    "/docs",
    "/docs/quickstart",
    "/docs/concepts/gamification",
  ])("caches the shared marketing page %s at the edge", (pathname) => {
    expect(isCdnCached(pathname)).toBe(true);
  });

  it.each([
    // The homepage bootstraps a per-visitor distinct ID for the experiment.
    "/",
    "/sign-in",
    "/sign-up",
    "/cli-auth",
    "/forgot-password",
    "/reset-password",
    "/auth/callback",
    "/dashboard",
    "/creator",
    "/creator/courses",
    "/browse",
    "/study/course-1",
    "/learn/acme/academies/intro",
    "/settings",
    "/api/health",
    "/docsearch",
  ])("never caches %s", (pathname) => {
    expect(isCdnCached(pathname)).toBe(false);
  });

  it("only caches public marketing routes, never auth pages", () => {
    for (const { source } of cdnCacheHeaders()) {
      const base = source.replace("/:path*", "");
      expect(isMarketingRoute(base)).toBe(true);
      expect(isAuthPage(base)).toBe(false);
    }
  });

  it("targets only Vercel's CDN so browsers keep revalidating", () => {
    for (const { headers } of cdnCacheHeaders()) {
      expect(headers).toEqual([{ key: "Vercel-CDN-Cache-Control", value: CDN_CACHE_CONTROL }]);
    }
    expect(CDN_CACHE_CONTROL).toMatch(/^s-maxage=\d+, stale-while-revalidate=\d+$/);
  });
});
