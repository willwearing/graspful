import { describe, expect, it } from "vitest";
import {
  getDefaultAuthRedirectPath,
  getHostSurface,
  getRequestHost,
  normalizeHost,
  decideRoute,
  isPublicRoute,
} from "@/lib/hosts";

describe("hosts", () => {
  it("normalizes forwarded hosts and strips ports", () => {
    expect(normalizeHost("App.Graspful.ai:3001")).toBe("app.graspful.ai");
    expect(normalizeHost("graspful.ai:3001, proxy.internal")).toBe("graspful.ai");
  });

  it("resolves request host from x-forwarded-host before host", () => {
    const headers = new Headers({
      host: "localhost:3001",
      "x-forwarded-host": "firefighterprep.vercel.app",
    });

    expect(getRequestHost(headers)).toBe("firefighterprep.vercel.app");
  });

  it("classifies platform, app, academy, and local hosts", () => {
    expect(getHostSurface("graspful.ai")).toBe("platform");
    expect(getHostSurface("app.graspful.ai")).toBe("app");
    expect(getHostSurface("firefighterprep.vercel.app")).toBe("academy");
    expect(getHostSurface("localhost:3001")).toBe("local");
  });

  it("uses control-plane redirects for platform and app auth", () => {
    expect(getDefaultAuthRedirectPath("platform")).toBe("/creator");
    expect(getDefaultAuthRedirectPath("app")).toBe("/creator");
    expect(getDefaultAuthRedirectPath("academy")).toBe("/dashboard");
  });
});

describe("host route policy", () => {
  it.each(["local", "platform", "app", "academy"] as const)("allows auth recovery on the %s surface", (surface) => {
    for (const pathname of ["/sign-in", "/auth/callback", "/auth/confirm", "/forgot-password", "/reset-password"]) {
      expect(isPublicRoute(pathname, surface)).toBe(true);
    }
    expect(isPublicRoute("/settings", surface)).toBe(false);
    expect(isPublicRoute("/sign-in-unrelated", surface)).toBe(false);
  });

  it.each([
    ["platform", "/docs/quickstart", false, "next", null],
    ["platform", "/learn/org/courses/course", false, "redirect", "/sign-in?redirect=%2Flearn%2Forg%2Fcourses%2Fcourse"],
    ["platform", "/learn/org/courses/course", true, "next", null],
    ["platform", "/creator", true, "redirect", "https://app.graspful.ai/creator"],
    ["app", "/", false, "redirect", "/sign-in"],
    ["app", "/", true, "redirect", "/creator"],
    ["app", "/docs/quickstart", false, "redirect", "https://graspful.ai/docs/quickstart"],
    ["app", "/learn/org", true, "redirect", "https://graspful.ai/learn/org"],
    ["app", "/dashboard", true, "redirect", "/creator"],
    ["app", "/creator/manage", true, "next", null],
    ["academy", "/", false, "next", null],
    ["academy", "/dashboard", false, "redirect", "/sign-in?redirect=%2Fdashboard"],
    ["academy", "/dashboard", true, "next", null],
    ["academy", "/creator", true, "redirect", "https://app.graspful.ai/creator"],
    ["academy", "/creator", false, "redirect", "https://app.graspful.ai/sign-in?redirect=%2Fcreator"],
    ["academy", "/learn/org", false, "redirect", "https://graspful.ai/sign-in?redirect=%2Flearn%2Forg"],
  ] as const)("routes %s %s with authenticated=%s", (surface, pathname, authenticated, action, to) => {
    const decision = decideRoute(pathname, authenticated, {
      surface, currentUrl: new URL(`https://example.com${pathname}`),
    });
    expect(decision).toEqual(to ? { action, to } : { action });
  });

  it("selects the local creator or learner experience from the brand", () => {
    expect(decideRoute("/", true, { brandId: "graspful" })).toEqual({ action: "redirect", to: "/creator" });
    expect(decideRoute("/", true, { brandId: "electrician" })).toEqual({ action: "redirect", to: "/dashboard" });
    expect(decideRoute("/creator", true, { brandId: "electrician" })).toEqual({ action: "redirect", to: "/dashboard" });
  });
});
