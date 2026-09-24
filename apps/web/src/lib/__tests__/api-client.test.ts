import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClientFetch } from "@/lib/api-client";

const { refreshSession } = vi.hoisted(() => ({ refreshSession: vi.fn() }));

vi.mock("posthog-js", () => ({
  default: {
    get_distinct_id: () => "visitor-id",
    get_session_id: () => "session-id",
  },
}));
vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { refreshSession } }),
}));

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe("browser API authentication", () => {
  it("uses the next user's token after the previous user's token was refreshed", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ user: "first" }))
      .mockResolvedValueOnce(Response.json({ user: "second" }));
    vi.stubGlobal("fetch", fetchMock);
    refreshSession.mockResolvedValue({ data: { session: { access_token: "first-refreshed" } } });

    await apiClientFetch("/users/me", "first-expired");
    await apiClientFetch("/users/me", "second-current");

    const tokens = fetchMock.mock.calls.map(([, init]) => new Headers(init.headers).get("Authorization"));
    expect(tokens).toEqual(["Bearer first-expired", "Bearer first-refreshed", "Bearer second-current"]);
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });

  it("preserves Headers options and tracing fields when sending JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await apiClientFetch("/courses", "token", { headers: new Headers({ "x-request-id": "request-id" }) });

    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(headers.get("x-request-id")).toBe("request-id");
    expect(headers.get("x-posthog-distinct-id")).toBe("visitor-id");
    expect(headers.get("x-posthog-session-id")).toBe("session-id");
    expect(headers.get("Authorization")).toBe("Bearer token");
  });

  it.each([null, "refreshed-but-rejected"])("returns to sign-in when refresh yields %s", async (accessToken) => {
    const location = { pathname: "/study/course-id", href: "" };
    vi.stubGlobal("window", { location });
    const fetchMock = vi.fn().mockImplementation(async () => new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    refreshSession.mockResolvedValue({ data: { session: accessToken ? { access_token: accessToken } : null } });

    await expect(apiClientFetch("/users/me", "expired")).rejects.toMatchObject({ statusCode: 401, message: "Session expired" });

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(accessToken ? 2 : 1);
    expect(location.href).toBe("/sign-in?redirect=%2Fstudy%2Fcourse-id&reason=session_expired");
  });
});
