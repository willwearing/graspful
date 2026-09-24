// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CookieOptions } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

const { createServerClient } = vi.hoisted(() => ({ createServerClient: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient }));

type CookieWrite = { name: string; value: string; options?: CookieOptions };
interface CookieAdapter {
  getAll(): Array<{ name: string; value: string }>;
  setAll(cookies: CookieWrite[]): void;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-test-key");
});
afterEach(() => vi.unstubAllEnvs());

function request(cookie = "sb-auth-token=expired; preference=compact") {
  return new NextRequest("http://localhost:3002/creator/manage/course-id", {
    headers: { cookie },
  });
}

function authClient(user: { id: string } | null, update?: (cookies: CookieAdapter) => void) {
  createServerClient.mockImplementation((_url, _key, { cookies }: { cookies: CookieAdapter }) => ({
    auth: {
      getUser: async () => {
        update?.(cookies);
        return { data: { user } };
      },
    },
  }));
}

describe("site session middleware", () => {
  it("redirects anonymous requests to sign-in while preserving the destination", async () => {
    authClient(null);
    const response = await middleware(request(""));
    expect(response.status).toBe(307);
    expect(response.headers.get("location"))
      .toBe("http://localhost:3002/sign-in?redirect=%2Fcreator%2Fmanage%2Fcourse-id");
    expect(response.cookies.getAll()).toEqual([]);
  });

  it("forwards refreshed credentials to server rendering and the browser", async () => {
    authClient({ id: "user-id" }, (cookies) => {
      expect(cookies.getAll()).toContainEqual({ name: "sb-auth-token", value: "expired" });
      cookies.setAll([{ name: "sb-auth-token", value: "refreshed", options: {
        path: "/", httpOnly: true, secure: true, sameSite: "lax", maxAge: 3600,
      } }]);
      expect(cookies.getAll()).toContainEqual({ name: "sb-auth-token", value: "refreshed" });
    });
    const incoming = request();
    const response = await middleware(incoming);
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(incoming.cookies.get("sb-auth-token")?.value).toBe("refreshed");
    expect(response.headers.get("x-middleware-request-cookie"))
      .toBe("sb-auth-token=refreshed; preference=compact");
    expect(response.cookies.get("sb-auth-token")).toMatchObject({
      value: "refreshed", path: "/", httpOnly: true, secure: true, sameSite: "lax", maxAge: 3600,
    });
  });

  it("keeps expired-session cookie clearing on the sign-in redirect", async () => {
    authClient(null, (cookies) => {
      cookies.setAll([{ name: "sb-auth-token", value: "", options: {
        path: "/", httpOnly: true, secure: true, sameSite: "lax", maxAge: 0,
      } }]);
    });
    const incoming = request();
    const response = await middleware(incoming);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/sign-in?redirect=");
    expect(incoming.cookies.get("sb-auth-token")?.value).toBe("");
    expect(response.cookies.get("sb-auth-token")).toMatchObject({
      value: "", maxAge: 0, path: "/", httpOnly: true, secure: true, sameSite: "lax",
    });
  });

  it("preserves cookies from multiple refresh writes when redirecting", async () => {
    authClient(null, (cookies) => {
      cookies.setAll([{ name: "sb-auth-token.0", value: "", options: { path: "/", maxAge: 0 } }]);
      cookies.setAll([{ name: "sb-auth-token.1", value: "", options: { path: "/", maxAge: 0 } }]);
    });
    const response = await middleware(request("sb-auth-token.0=old-first; sb-auth-token.1=old-second"));
    expect(response.cookies.get("sb-auth-token.0")).toMatchObject({ value: "", maxAge: 0 });
    expect(response.cookies.get("sb-auth-token.1")).toMatchObject({ value: "", maxAge: 0 });
  });

  it("keeps the latest value when a refresh writes a cookie twice", async () => {
    authClient({ id: "user-id" }, (cookies) => {
      cookies.setAll([{ name: "sb-auth-token", value: "intermediate", options: { path: "/" } }]);
      cookies.setAll([{ name: "sb-auth-token", value: "latest", options: { path: "/", httpOnly: true } }]);
    });
    const response = await middleware(request());
    expect(response.headers.get("x-middleware-request-cookie")).toContain("sb-auth-token=latest");
    expect(response.cookies.get("sb-auth-token")).toMatchObject({ value: "latest", httpOnly: true });
  });
});
