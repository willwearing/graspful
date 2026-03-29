import { type Page } from "@playwright/test";

/** The brand to use for authenticated E2E tests — must match a seeded org */
export const TEST_BRAND_ID = "electrician";
export const POSTHOG_TEST_BRAND_ID = "posthog";
const BACKEND_URL = "http://localhost:3000/api/v1";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tzftjqpnisalltnkrykg.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/**
 * Admin-confirm a user's email via Supabase Admin API.
 * Required when Supabase has email confirmation enabled.
 */
export async function adminConfirmUser(email: string): Promise<void> {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY env var required for e2e tests (set in backend/.env)"
    );
  }

  let user: { id: string; email: string } | undefined;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    for (let page = 1; page <= 10; page += 1) {
      const listRes = await fetch(
        `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=200`,
        {
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: SUPABASE_SERVICE_ROLE_KEY,
          },
        }
      );
      const { users } = (await listRes.json()) as { users: Array<{ id: string; email: string }> };
      user = users.find((candidate) => candidate.email === email);
      if (user || users.length === 0) {
        break;
      }
    }

    if (user) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  if (!user) throw new Error(`User ${email} not found in Supabase`);

  // Confirm their email
  const confirmRes = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users/${user.id}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email_confirm: true }),
    }
  );
  if (!confirmRes.ok) {
    throw new Error(`Failed to confirm user: ${confirmRes.statusText}`);
  }
}

/**
 * Set the dev brand override cookie so the app resolves the correct org.
 */
async function setDevBrandCookie(
  page: Page,
  brandId: string = TEST_BRAND_ID
): Promise<void> {
  await page.context().addCookies([
    {
      name: "dev-brand-override",
      value: brandId,
      domain: "localhost",
      path: "/",
    },
  ]);
}

/**
 * Create a fresh test user via the backend registration endpoint, then complete
 * the real browser sign-in flow on the requested brand so app provisioning and
 * org join behavior still runs through the UI.
 */
export async function signUpTestUser(page: Page): Promise<string> {
  return signUpBrandedTestUser(page, TEST_BRAND_ID);
}

export async function signUpBrandedTestUser(
  page: Page,
  brandId: string
): Promise<string> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.example.com`;
  const password = "TestPassword123!";

  await setDevBrandCookie(page, brandId);

  const registerRes = await fetch(`${BACKEND_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!registerRes.ok) {
    throw new Error(`Failed to register e2e user: ${registerRes.status} ${registerRes.statusText}`);
  }

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/(dashboard|creator)/, { timeout: 15_000 });

  return email;
}

/**
 * Sign in an existing test user via the UI.
 */
export async function signInTestUser(
  page: Page,
  email: string,
  password = "TestPassword123!",
  brandId: string = TEST_BRAND_ID
): Promise<void> {
  await setDevBrandCookie(page, brandId);

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/(dashboard|creator)/, { timeout: 15_000 });
}

const GRASPFUL_BRAND = "graspful";

/**
 * Sign up on the graspful brand. Ends up on /creator.
 */
export async function signUpAsCreator(page: Page): Promise<string> {
  const email = await signUpBrandedTestUser(page, GRASPFUL_BRAND);
  // Ensure we end up on /creator (middleware redirect may be async)
  if (page.url().includes("/dashboard")) {
    await page.waitForURL(/\/creator/, { timeout: 10_000 });
  }
  return email;
}

export async function getBrowserAccessToken(page: Page): Promise<string | null> {
  const cookies = await page.context().cookies();
  const authCookie = cookies.find((cookie) => cookie.name.includes("auth-token"));

  if (authCookie?.value?.startsWith("base64-")) {
    try {
      const decoded = Buffer.from(authCookie.value.slice("base64-".length), "base64").toString(
        "utf8"
      );
      const parsed = JSON.parse(decoded) as { access_token?: string };
      if (typeof parsed.access_token === "string") {
        return parsed.access_token;
      }
    } catch {
      // Fall through to localStorage probing
    }
  }

  return page.evaluate(() => {
    const seen = new Set<string>();

    function readToken(candidate: unknown): string | null {
      if (!candidate || typeof candidate !== "object") return null;
      const record = candidate as Record<string, unknown>;

      if (typeof record.access_token === "string") {
        return record.access_token;
      }

      if (record.currentSession) {
        const nested = readToken(record.currentSession);
        if (nested) return nested;
      }

      if (Array.isArray(candidate)) {
        for (const item of candidate) {
          const nested = readToken(item);
          if (nested) return nested;
        }
      }

      return null;
    }

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || seen.has(key) || !key.includes("auth-token")) continue;
      seen.add(key);

      const raw = localStorage.getItem(key);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw);
        const token = readToken(parsed);
        if (token) return token;
      } catch {
        // Ignore unrelated localStorage values
      }
    }

    return null;
  });
}
