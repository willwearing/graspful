// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

const { createServerClient, resolveBrand } = vi.hoisted(() => ({ createServerClient: vi.fn(), resolveBrand: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient }));
vi.mock("@/lib/brand/resolve", () => ({ resolveBrand }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-test-key");
  resolveBrand.mockResolvedValue({ id: "graspful" });
});
afterEach(() => vi.unstubAllEnvs());

function signedIn() {
  return { auth: { getClaims: async () => ({ data: { claims: { sub: "user" } }, error: null }) } };
}

function anonymous() {
  return { auth: { getClaims: async () => ({ data: null, error: null }) } };
}

function request(url: string, init: { cookie?: string } = {}) {
  const host = new URL(url).host;
  return new NextRequest(url, { headers: { host, ...(init.cookie ? { cookie: init.cookie } : {}) } });
}

describe("routing proxy", () => {
  it("preserves refreshed auth cookies on a redirect without a brand cookie or header", async () => {
    createServerClient.mockImplementation((_url, _key, { cookies }) => ({
      auth: {
        getClaims: async () => {
          cookies.setAll([{ name: "sb-auth-token", value: "refreshed", options: { path: "/", httpOnly: true } }]);
          return { data: { claims: { sub: "user" } } };
        },
      },
    }));

    const response = await proxy(new NextRequest("http://app.graspful.ai/sign-in", { headers: { host: "app.graspful.ai" } }));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://app.graspful.ai/creator");
    expect(response.cookies.get("sb-auth-token")).toMatchObject({ value: "refreshed", httpOnly: true });
    expect(response.cookies.has("brand-id")).toBe(false);
    expect(response.headers.has("x-brand-id")).toBe(false);
    expect(resolveBrand).not.toHaveBeenCalled();
  });

  it("uses the brand only for local routing", async () => {
    resolveBrand.mockResolvedValue({ id: "electrician" });
    createServerClient.mockReturnValue(signedIn());
    const response = await proxy(new NextRequest("http://localhost:3001/", {
      headers: { host: "localhost:3001", cookie: "dev-brand-override=electrician" },
    }));
    expect(response.headers.get("location")).toBe("http://localhost:3001/dashboard");
    expect(resolveBrand).toHaveBeenCalledWith("localhost", "dev-brand-override=electrician");
  });

  it("keeps an anonymous academy landing page public", async () => {
    createServerClient.mockReturnValue(anonymous());
    const response = await proxy(new NextRequest("https://academy.example.com/", { headers: { host: "academy.example.com" } }));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
  it.each([
    { pathname: "/creator", status: 200 },
    { pathname: "/sign-in", status: 307 },
  ])("preserves all cookie refresh batches for $pathname", async ({ pathname, status }) => {
    createServerClient.mockImplementation((_url, _key, { cookies }) => ({
      auth: {
        getClaims: async () => {
          cookies.setAll([{ name: "sb-auth-token.0", value: "first", options: { path: "/", httpOnly: true, sameSite: "lax" } }]);
          cookies.setAll([{ name: "sb-auth-token.1", value: "second", options: { path: "/", secure: true } }]);
          return { data: { claims: { sub: "user" } } };
        },
      },
    }));
    const request = new NextRequest(`http://app.graspful.ai${pathname}`, {
      headers: { host: "app.graspful.ai", cookie: "sb-auth-token.0=old; preference=compact" },
    });
    const response = await proxy(request);
    expect(response.status).toBe(status);
    expect(response.cookies.get("sb-auth-token.0")).toMatchObject({ value: "first", httpOnly: true, sameSite: "lax" });
    expect(response.cookies.get("sb-auth-token.1")).toMatchObject({ value: "second", secure: true });
    expect(request.cookies.get("sb-auth-token.0")?.value).toBe("first");
    expect(request.cookies.get("sb-auth-token.1")?.value).toBe("second");
    if (status === 200) {
      expect(response.headers.get("x-middleware-request-cookie")).toBe("sb-auth-token.0=first; preference=compact; sb-auth-token.1=second");
    } else {
      expect(response.headers.get("location")).toBe("http://app.graspful.ai/creator");
    }
  });

  describe("shared marketing pages", () => {
    it.each([
      "https://graspful.ai/",
      "https://graspful.ai/pricing",
      "https://graspful.ai/docs/quickstart",
      "https://graspful.ai/academies",
      "https://graspful.ai/cli-auth",
      "https://academy.example.com/",
    ])("serves %s without reading the session or setting cookies", async (url) => {
      const response = await proxy(request(url, { cookie: "sb-auth-token=expired" }));

      expect(createServerClient).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.headers.get("x-middleware-next")).toBe("1");
      expect(response.headers.get("set-cookie")).toBeNull();
    });

    it("redirects app-host marketing paths to the platform without reading the session", async () => {
      const response = await proxy(request("https://app.graspful.ai/pricing"));

      expect(createServerClient).not.toHaveBeenCalled();
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("https://graspful.ai/pricing");
    });

    it("redirects academy-host platform pages without reading the session", async () => {
      const response = await proxy(request("https://academy.example.com/docs"));

      expect(createServerClient).not.toHaveBeenCalled();
      expect(response.headers.get("location")).toBe("https://graspful.ai/docs");
    });
  });

  describe("routes that depend on the session", () => {
    it.each([
      { url: "https://graspful.ai/sign-in", anonymous: null, signedIn: "https://app.graspful.ai/creator" },
      { url: "https://app.graspful.ai/", anonymous: "https://app.graspful.ai/sign-in", signedIn: "https://app.graspful.ai/creator" },
      { url: "https://app.graspful.ai/creator", anonymous: "https://app.graspful.ai/sign-in?redirect=%2Fcreator", signedIn: null },
      { url: "https://graspful.ai/learn/acme", anonymous: "https://graspful.ai/sign-in?redirect=%2Flearn%2Facme", signedIn: null },
      { url: "https://academy.example.com/dashboard", anonymous: "https://academy.example.com/sign-in?redirect=%2Fdashboard", signedIn: null },
      { url: "https://academy.example.com/sign-in", anonymous: null, signedIn: "https://academy.example.com/dashboard" },
    ])("routes $url by session", async ({ url, anonymous: anonymousTarget, signedIn: signedInTarget }) => {
      for (const [client, target] of [[anonymous(), anonymousTarget], [signedIn(), signedInTarget]] as const) {
        createServerClient.mockReset().mockReturnValue(client);

        const response = await proxy(request(url));

        expect(createServerClient).toHaveBeenCalledOnce();
        if (target) {
          expect(response.status).toBe(307);
          expect(response.headers.get("location")).toBe(target);
        } else {
          expect(response.status).toBe(200);
        }
      }
    });

    it("treats an invalid or missing JWT as signed out", async () => {
      createServerClient.mockReturnValue({
        auth: { getClaims: async () => ({ data: null, error: new Error("invalid JWT") }) },
      });

      const response = await proxy(request("https://app.graspful.ai/creator"));

      expect(response.headers.get("location")).toBe("https://app.graspful.ai/sign-in?redirect=%2Fcreator");
    });
  });
});
