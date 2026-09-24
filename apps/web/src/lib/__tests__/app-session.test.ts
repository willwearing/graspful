import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requireAppSession } from "@/lib/app-session";

const { getUser, getSession, resolvePageBrand, fetchMock } = vi.hoisted(() => ({
  getUser: vi.fn(), getSession: vi.fn(), resolvePageBrand: vi.fn(), fetchMock: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: { getUser, getSession } }) }));
vi.mock("@/lib/brand/resolve", () => ({ resolvePageBrand }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));

afterEach(() => vi.unstubAllGlobals());

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  getUser.mockResolvedValue({ data: { user: { id: "user-id", email: "user@example.com" } } });
  getSession.mockResolvedValue({ data: { session: { access_token: "verified-token" } } });
  resolvePageBrand.mockResolvedValue({ id: "academy", orgSlug: "academy-org" });
  fetchMock.mockImplementation(async () => Response.json({ ok: true }));
});

describe("required app session", () => {
  it("redirects anonymous users before reading a token or loading the brand", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(requireAppSession()).rejects.toThrow("redirect:/sign-in");
    expect(getSession).not.toHaveBeenCalled();
    expect(resolvePageBrand).not.toHaveBeenCalled();
  });

  it("rejects a verified user when the access token is missing", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    await expect(requireAppSession()).rejects.toThrow("redirect:/sign-in");
  });

  it("returns the user and brand with a reusable authenticated fetcher", async () => {
    const session = await requireAppSession();
    expect(session).toMatchObject({
      user: { id: "user-id", email: "user@example.com" },
      token: "verified-token", brand: { id: "academy", orgSlug: "academy-org" },
    });
    await session.fetcher("/first");
    await session.fetcher("/second", { method: "POST", body: { answer: 2 } });
    expect(getUser).toHaveBeenCalledTimes(1);
    expect(getSession).toHaveBeenCalledTimes(1);
    expect(resolvePageBrand).toHaveBeenCalledTimes(1);
    for (const [, init] of fetchMock.mock.calls) {
      expect(new Headers(init.headers).get("Authorization")).toBe("Bearer verified-token");
      expect(init.cache).toBe("no-store");
    }
    expect(fetchMock.mock.calls[1][1].body).toBe(JSON.stringify({ answer: 2 }));
  });
});
