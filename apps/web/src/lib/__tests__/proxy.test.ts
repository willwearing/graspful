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

describe("routing proxy", () => {
  it("preserves refreshed auth cookies on a redirect without a brand cookie or header", async () => {
    createServerClient.mockImplementation((_url, _key, { cookies }) => ({
      auth: {
        getUser: async () => {
          cookies.setAll([{ name: "sb-auth-token", value: "refreshed", options: { path: "/", httpOnly: true } }]);
          return { data: { user: { id: "user" } } };
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
    createServerClient.mockReturnValue({ auth: { getUser: async () => ({ data: { user: { id: "user" } } }) } });
    const response = await proxy(new NextRequest("http://localhost:3001/", {
      headers: { host: "localhost:3001", cookie: "dev-brand-override=electrician" },
    }));
    expect(response.headers.get("location")).toBe("http://localhost:3001/dashboard");
    expect(resolveBrand).toHaveBeenCalledWith("localhost", "dev-brand-override=electrician");
  });

  it("keeps an anonymous academy landing page public", async () => {
    createServerClient.mockReturnValue({ auth: { getUser: async () => ({ data: { user: null } }) } });
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
        getUser: async () => {
          cookies.setAll([{ name: "sb-auth-token.0", value: "first", options: { path: "/", httpOnly: true, sameSite: "lax" } }]);
          cookies.setAll([{ name: "sb-auth-token.1", value: "second", options: { path: "/", secure: true } }]);
          return { data: { user: { id: "user" } } };
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

});
