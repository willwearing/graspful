import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch, createApiFetcher } from "@/lib/api";
import { ApiError } from "@/lib/api-core";

const { getUser, getSession } = vi.hoisted(() => ({ getUser: vi.fn(), getSession: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: { getUser, getSession } }) }));

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe("server API transport", () => {
  it("does not attach an unverified cookie token", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ public: true }));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/brands/catalog/academies");

    expect(getSession).not.toHaveBeenCalled();
    expect(new Headers(fetchMock.mock.calls[0][1].headers).has("Authorization")).toBe(false);
  });

  it("uses the verified user's session token", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user" } } });
    getSession.mockResolvedValue({ data: { session: { access_token: "token" } } });
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ id: "user" }));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/users/me");

    expect(new Headers(fetchMock.mock.calls[0][1].headers).get("Authorization")).toBe("Bearer token");
  });

  it("preserves backend error detail and the shared error type", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ message: ["Invalid answer", "Expected a number"] }, { status: 400 })));
    const error = await createApiFetcher("token")("/answer", { method: "POST", body: {} }).catch((failure: unknown) => failure);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ statusCode: 400, message: "Invalid answer\nExpected a number" });
  });

  it("accepts successful responses without a body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(createApiFetcher("token")("/keys/key-id", { method: "DELETE" })).resolves.toBeUndefined();
  });
});
