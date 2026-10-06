import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as callback } from "@/app/auth/callback/route";
import { GET as confirm } from "@/app/auth/confirm/route";

const mocks = vi.hoisted(() => ({ verifyOtp: vi.fn(), exchangeCodeForSession: vi.fn(), fetch: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: mocks }) }));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: vi.fn() }) }));
vi.mock("@/lib/posthog/server", () => ({ getServerPostHog: () => null }));
vi.mock("@/lib/posthog/server-logs", () => ({ emitServerLog: vi.fn(), flushServerLogsAfterResponse: vi.fn() }));
vi.mock("@/lib/brand/resolve", () => ({ resolveBrand: async () => ({ orgSlug: "posthog-tam" }) }));

beforeEach(() => {
  vi.clearAllMocks();
  const result = { data: { session: { access_token: "test-token", user: { id: "test-user" } } }, error: null };
  mocks.verifyOtp.mockResolvedValue(result);
  mocks.exchangeCodeForSession.mockResolvedValue(result);
  mocks.fetch.mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", mocks.fetch);
  vi.stubEnv("NEXT_PUBLIC_BACKEND_URL", "http://localhost:3000/api/v1");
});

describe("Email routes", () => {
  it("verifies a signup token and provisions the current academy before redirecting", async () => {
    const response = await callback(new NextRequest("https://posthog-tam.vercel.app/auth/callback?token_hash=test-hash&type=signup&redirect=/dashboard"));
    expect(mocks.verifyOtp).toHaveBeenCalledWith({ token_hash: "test-hash", type: "signup" });
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(mocks.fetch).toHaveBeenCalledWith("http://localhost:3000/api/v1/auth/provision", expect.objectContaining({ body: JSON.stringify({ brandOrgSlug: "posthog-tam" }) }));
    expect(response.headers.get("location")).toBe("https://posthog-tam.vercel.app/dashboard");
  });

  it("accepts existing PKCE signup links", async () => {
    const response = await callback(new NextRequest("https://posthog-tam.vercel.app/auth/callback?code=legacy-code"));
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("legacy-code");
    expect(response.headers.get("location")).toBe("https://posthog-tam.vercel.app/dashboard");
  });

  it.each(["token_hash=test-hash&type=recovery", "token_hash=test-hash", ""])('rejects missing or unsupported signup parameters (%s)', async (query) => {
    const response = await callback(new NextRequest(`https://posthog-tam.vercel.app/auth/callback?${query}`));
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://posthog-tam.vercel.app/sign-in");
  });

  it("keeps invalid signup tokens out of the app", async () => {
    mocks.verifyOtp.mockResolvedValue({ data: { session: null }, error: { message: "Token has expired" } });
    const response = await callback(new NextRequest("https://posthog-tam.vercel.app/auth/callback?token_hash=expired&type=signup"));
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://posthog-tam.vercel.app/sign-in");
  });

  it.each(["token_hash=recovery-hash&type=recovery", "code=legacy-recovery"])('accepts recovery links and keeps redirects on the current site (%s)', async (query) => {
    const response = await confirm(new NextRequest(`https://posthog-tam.vercel.app/auth/confirm?${query}&next=//evil.example`));
    expect(response.headers.get("location")).toBe("https://posthog-tam.vercel.app/dashboard");
    if (query.startsWith("code")) expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("legacy-recovery");
    else expect(mocks.verifyOtp).toHaveBeenCalledWith({ token_hash: "recovery-hash", type: "recovery" });
  });
});

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
