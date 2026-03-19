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

  // Wait for redirect to dashboard (auto-confirm in dev)
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });

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
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
}
