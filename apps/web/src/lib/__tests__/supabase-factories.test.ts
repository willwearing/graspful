import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseBrowserClient, hasSupabaseBrowserEnv } from "@graspful/creator-ui/supabase-client";
import { createSupabaseServerClient } from "@graspful/creator-ui/supabase-server";
import * as webBrowser from "@/lib/supabase/client";
import * as webServer from "@/lib/supabase/server";
import * as siteBrowser from "../../../../site/src/lib/supabase/client";
import * as siteServer from "../../../../site/src/lib/supabase/server";

const { createBrowserClient, createServerClient, cookies, cookieStore } = vi.hoisted(() => ({
  createBrowserClient: vi.fn(), createServerClient: vi.fn(), cookies: vi.fn(),
  cookieStore: { getAll: vi.fn(), set: vi.fn() },
}));
vi.mock("@supabase/ssr", () => ({ createBrowserClient, createServerClient }));
vi.mock("next/headers", () => ({ cookies }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  cookies.mockResolvedValue(cookieStore);
});
afterEach(() => vi.unstubAllEnvs());

describe("shared Supabase browser factory", () => {
  it("keeps both app entrypoints on the shared implementation", () => {
    expect(webBrowser.createSupabaseBrowserClient).toBe(createSupabaseBrowserClient);
    expect(siteBrowser.createSupabaseBrowserClient).toBe(createSupabaseBrowserClient);
    expect(siteBrowser.hasSupabaseBrowserEnv).toBe(hasSupabaseBrowserEnv);
  });

  it("creates a browser client with the current public environment", () => {
    const client = { auth: {} };
    createBrowserClient.mockReturnValue(client);
    expect(hasSupabaseBrowserEnv()).toBe(true);
    expect(createSupabaseBrowserClient()).toBe(client);
    expect(createBrowserClient).toHaveBeenCalledExactlyOnceWith("http://localhost:54321", "test-anon-key");
    expect(cookies).not.toHaveBeenCalled();
  });

  it.each(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"])("handles missing %s without creating a client", (name) => {
    vi.stubEnv(name, "");
    expect(hasSupabaseBrowserEnv()).toBe(false);
    expect(() => createSupabaseBrowserClient()).toThrow("Supabase is not configured for this environment");
    expect(createBrowserClient).not.toHaveBeenCalled();
  });
});

describe("shared Supabase server factory", () => {
  it("keeps both server entrypoints on the shared implementation", () => {
    expect(webServer.createSupabaseServerClient).toBe(createSupabaseServerClient);
    expect(siteServer.createSupabaseServerClient).toBe(createSupabaseServerClient);
  });

  it("reads cookies when Supabase requests them and forwards refresh cookie options", async () => {
    const client = { auth: {} };
    createServerClient.mockReturnValue(client);
    expect(await createSupabaseServerClient()).toBe(client);
    const [url, key, options] = createServerClient.mock.calls[0];
    expect([url, key]).toEqual(["http://localhost:54321", "test-anon-key"]);

    const requestCookies = [{ name: "sb-auth-token", value: "initial" }];
    cookieStore.getAll.mockReturnValueOnce(requestCookies).mockReturnValueOnce([{ name: "sb-auth-token", value: "refreshed" }]);
    expect(options.cookies.getAll()).toEqual(requestCookies);
    expect(options.cookies.getAll()).toEqual([{ name: "sb-auth-token", value: "refreshed" }]);

    const cookieOptions = { path: "/", httpOnly: true, secure: true, sameSite: "lax", maxAge: 3600 };
    options.cookies.setAll([
      { name: "sb-auth-token.0", value: "first", options: cookieOptions },
      { name: "sb-auth-token.1", value: "second", options: cookieOptions },
    ]);
    expect(cookieStore.set).toHaveBeenNthCalledWith(1, "sb-auth-token.0", "first", cookieOptions);
    expect(cookieStore.set).toHaveBeenNthCalledWith(2, "sb-auth-token.1", "second", cookieOptions);
  });

  it("uses a fresh request cookie store for each server client", async () => {
    const otherStore = { getAll: vi.fn().mockReturnValue([{ name: "session", value: "other-user" }]), set: vi.fn() };
    cookies.mockResolvedValueOnce(cookieStore).mockResolvedValueOnce(otherStore);
    await createSupabaseServerClient();
    await createSupabaseServerClient();
    expect(cookies).toHaveBeenCalledTimes(2);
    const options = createServerClient.mock.calls[1][2];
    expect(options.cookies.getAll()).toEqual([{ name: "session", value: "other-user" }]);
    expect(cookieStore.getAll).not.toHaveBeenCalled();
  });

  it("allows a read-only Server Component cookie store", async () => {
    cookieStore.set.mockImplementation(() => { throw new Error("Cookies cannot be modified in a Server Component"); });
    await createSupabaseServerClient();
    const options = createServerClient.mock.calls[0][2];
    expect(() => options.cookies.setAll([{ name: "session", value: "token", options: { path: "/" } }])).not.toThrow();
  });

  it("lets Next defer request-only rendering before requiring deployment configuration", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const requestOnly = new Error("Dynamic server usage: cookies");
    cookies.mockRejectedValueOnce(requestOnly);
    await expect(createSupabaseServerClient()).rejects.toBe(requestOnly);
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it.each(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"])("rejects missing %s when handling a request", async (name) => {
    vi.stubEnv(name, "");
    await expect(createSupabaseServerClient()).rejects.toThrow("Supabase is not configured for this environment");
    expect(cookies).toHaveBeenCalledOnce();
    expect(createServerClient).not.toHaveBeenCalled();
  });
});
