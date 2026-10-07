import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as callback } from "@/app/auth/callback/route";
import { GET as confirm } from "@/app/auth/confirm/route";

const mocks = vi.hoisted(() => ({ verifyOtp: vi.fn(), exchangeCodeForSession: vi.fn(), fetch: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: mocks }) }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: mocks }) }));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: vi.fn() }) }));
beforeEach(() => {
  vi.clearAllMocks();
  const result = { data: { session: { access_token: "test-token" } }, error: null };
  mocks.verifyOtp.mockResolvedValue(result);
  mocks.exchangeCodeForSession.mockResolvedValue(result);
  mocks.fetch.mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", mocks.fetch);
  vi.stubEnv("NEXT_PUBLIC_BACKEND_URL", "http://localhost:3000/api/v1");
});

it.each(["token_hash=signup-hash&type=signup", "code=legacy-signup"])('verifies signup links before provisioning and opening the creator (%s)', async (query) => {
  const response = await callback(new NextRequest(`https://graspful.ai/auth/callback?${query}`));
  expect(mocks.fetch).toHaveBeenCalledWith("http://localhost:3000/api/v1/auth/provision", expect.objectContaining({ method: "POST" }));
  expect(response.headers.get("location")).toBe("https://graspful.ai/creator");
  if (query.startsWith("code")) expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("legacy-signup");
  else expect(mocks.verifyOtp).toHaveBeenCalledWith({ token_hash: "signup-hash", type: "signup" });
});

it.each(["token_hash=recovery-hash&type=recovery", "code=legacy-recovery"])('verifies password recovery links (%s)', async (query) => {
  const response = await confirm(new NextRequest(`https://graspful.ai/auth/confirm?${query}&next=/reset-password`));
  expect(response.headers.get("location")).toBe("https://graspful.ai/reset-password");
});

it("rejects expired tokens without provisioning or allowing external redirects", async () => {
  mocks.verifyOtp.mockResolvedValue({ data: { session: null }, error: { message: "Expired token" } });
  const response = await callback(new NextRequest("https://graspful.ai/auth/callback?token_hash=expired&type=signup&redirect=//evil.example"));
  expect(mocks.fetch).not.toHaveBeenCalled();
  expect(response.headers.get("location")).toBe("https://graspful.ai/sign-in");
});

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
