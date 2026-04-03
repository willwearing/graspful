import { describe, expect, it } from "vitest";
import {
  getDefaultAuthRedirectPath,
  getHostSurface,
  getRequestHost,
  normalizeHost,
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
