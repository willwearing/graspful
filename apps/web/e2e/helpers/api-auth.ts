import { type Page, type APIRequestContext } from "@playwright/test";
import { signUpBrandedTestUser, signInTestUser, TEST_BRAND_ID } from "./auth";

const BACKEND_URL = "http://localhost:3000/api/v1";
const PASSWORD = "TestPassword123!";

export interface ApiTestContext {
  token: string;
  orgId: string;
  request: APIRequestContext;
}

/**
 * Register a user via the backend API (creates user + org + apiKey),
 * then sign in via the browser so the page session is also authenticated.
 * Use for tests that need both browser sessions AND API access.
 */
export async function signUpAndGetApiContext(
  page: Page,
  request: APIRequestContext,
  brandId: string = TEST_BRAND_ID
): Promise<ApiTestContext> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.example.com`;

  // Register via API — creates Supabase user + org + apiKey
  const res = await request.post(`${BACKEND_URL}/auth/register`, {
    data: { email, password: PASSWORD },
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok()) {
    const text = await res.text();
    throw new Error(`Registration failed (${res.status()}): ${text}`);
  }

  const body = await res.json();

  // Sign in via browser so page-based tests have a session.
  // Use the "graspful" brand for browser — the creator dashboard is org-aware
  // and will show the user's own org's courses regardless of active brand.
  await signInTestUser(page, email, PASSWORD, "graspful");

  return { token: body.apiKey, orgId: body.orgSlug, request };
}

/**
 * Register via API only — no browser session.
 * Use for pure API tests that don't need a signed-in browser.
 */
export async function registerAndGetApiContext(
  request: APIRequestContext
): Promise<ApiTestContext> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.example.com`;

  const res = await request.post(`${BACKEND_URL}/auth/register`, {
    data: { email, password: PASSWORD },
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok()) {
    const text = await res.text();
    throw new Error(`Registration failed (${res.status()}): ${text}`);
  }

  const body = await res.json();
  return { token: body.apiKey, orgId: body.orgSlug, request };
}

// ─── Helpers for making authenticated requests ──────────────────────────────

export async function apiGet(
  ctx: ApiTestContext,
  path: string
): Promise<{ status: number; body: any }> {
  const res = await ctx.request.get(`${BACKEND_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${ctx.token}`,
      "Content-Type": "application/json",
    },
  });
  let body: any;
  try { body = await res.json(); } catch { body = await res.text(); }
  return { status: res.status(), body };
}

export async function apiPost(
  ctx: ApiTestContext,
  path: string,
  data?: unknown
): Promise<{ status: number; body: any }> {
  const res = await ctx.request.post(`${BACKEND_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${ctx.token}`,
      "Content-Type": "application/json",
    },
    data: data ?? {},
  });
  let body: any;
  try { body = await res.json(); } catch { body = await res.text(); }
  return { status: res.status(), body };
}

export async function apiDelete(
  ctx: ApiTestContext,
  path: string
): Promise<{ status: number; body: any }> {
  const res = await ctx.request.delete(`${BACKEND_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${ctx.token}`,
      "Content-Type": "application/json",
    },
  });
  let body: any;
  try { body = await res.json(); } catch { body = await res.text(); }
  return { status: res.status(), body };
}

export async function apiPatch(
  ctx: ApiTestContext,
  path: string,
  data?: unknown
): Promise<{ status: number; body: any }> {
  const res = await ctx.request.patch(`${BACKEND_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${ctx.token}`,
      "Content-Type": "application/json",
    },
    data: data ?? {},
  });
  let body: any;
  try { body = await res.json(); } catch { body = await res.text(); }
  return { status: res.status(), body };
}

export async function apiGetPublic(
  request: APIRequestContext,
  path: string
): Promise<{ status: number; body: any }> {
  const res = await request.get(`${BACKEND_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
  });
  let body: any;
  try { body = await res.json(); } catch { body = await res.text(); }
  return { status: res.status(), body };
}

export async function apiGetWithKey(
  request: APIRequestContext,
  path: string,
  apiKey: string
): Promise<{ status: number; body: any }> {
  const res = await request.get(`${BACKEND_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });
  let body: any;
  try { body = await res.json(); } catch { body = await res.text(); }
  return { status: res.status(), body };
}
