import { type Page, type APIRequestContext } from "@playwright/test";
import { signUpBrandedTestUser, TEST_BRAND_ID } from "./auth";

const BACKEND_URL = "http://localhost:3000/api/v1";

export interface ApiTestContext {
  token: string;
  orgId: string;
  request: APIRequestContext;
}

/**
 * Sign up a user via the UI, extract the Supabase JWT and orgId,
 * then return an object for making authenticated API calls.
 */
export async function signUpAndGetApiContext(
  page: Page,
  request: APIRequestContext,
  brandId: string = TEST_BRAND_ID
): Promise<ApiTestContext> {
  await signUpBrandedTestUser(page, brandId);

  // Extract Supabase access token from the browser
  const token = await page.evaluate(async () => {
    // Supabase SSR stores the session in cookies, but the browser client can retrieve it
    const { createBrowserClient } = await import("@supabase/ssr");
    const supabase = createBrowserClient(
      (window as any).__NEXT_DATA__?.props?.pageProps?.env?.SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        "",
      (window as any).__NEXT_DATA__?.props?.pageProps?.env?.SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        ""
    );
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? "";
  });

  // If the import approach doesn't work, fallback: extract from cookies
  let accessToken = token;
  if (!accessToken) {
    const cookies = await page.context().cookies();
    // Supabase SSR stores tokens in cookies with pattern: sb-<project-ref>-auth-token
    const authCookie = cookies.find(
      (c) => c.name.includes("auth-token") || c.name.includes("supabase")
    );
    if (authCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(authCookie.value));
        accessToken = parsed.access_token || parsed[0]?.access_token || "";
      } catch {
        accessToken = authCookie.value;
      }
    }
  }

  // Resolve orgId from the brand slug
  const orgId = await resolveOrgId(request, brandId);

  return { token: accessToken, orgId, request };
}

/**
 * Resolve an orgId from a brand slug by calling the brands API (unauthenticated).
 */
async function resolveOrgId(
  request: APIRequestContext,
  brandSlug: string
): Promise<string> {
  const res = await request.get(`${BACKEND_URL}/brands/${brandSlug}`);
  if (res.ok()) {
    const brand = await res.json();
    return brand.orgId;
  }
  // Fallback: use the slug as the orgId (backend supports slug-based routing)
  return brandSlug;
}

/**
 * Make an authenticated GET request to the backend API.
 */
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
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }
  return { status: res.status(), body };
}

/**
 * Make an authenticated POST request to the backend API.
 */
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
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }
  return { status: res.status(), body };
}

/**
 * Make an authenticated DELETE request to the backend API.
 */
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
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }
  return { status: res.status(), body };
}

/**
 * Make an authenticated PATCH request to the backend API.
 */
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
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }
  return { status: res.status(), body };
}

/**
 * Make an unauthenticated GET request to the backend API.
 */
export async function apiGetPublic(
  request: APIRequestContext,
  path: string
): Promise<{ status: number; body: any }> {
  const res = await request.get(`${BACKEND_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
  });
  let body: any;
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }
  return { status: res.status(), body };
}

/**
 * Make a request with a custom Authorization header (for API key testing).
 */
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
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }
  return { status: res.status(), body };
}
