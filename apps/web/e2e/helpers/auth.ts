import { type Page } from "@playwright/test";

/** The brand to use for authenticated E2E tests — must match a seeded org */
export const TEST_BRAND_ID = "electrician";
export const POSTHOG_TEST_BRAND_ID = "posthog";

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
 * Sign up a fresh test user via the UI and return the email.
 * Relies on Supabase auto-confirm being enabled (dev mode).
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

  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();

  // Wait for redirect — /dashboard for most brands, /creator for graspful brand
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
