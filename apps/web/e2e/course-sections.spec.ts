import { test, expect, type Page } from "@playwright/test";

const POSTHOG_BRAND_ID = "posthog";

/** Sign up a test user under the PostHog brand */
async function signUpPosthogUser(page: Page): Promise<string> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.example.com`;
  const password = "TestPassword123!";

  await page.context().addCookies([
    {
      name: "dev-brand-override",
      value: POSTHOG_BRAND_ID,
      domain: "localhost",
      path: "/",
    },
  ]);

  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();

  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });

  return email;
}

test.describe("Course sections display", () => {
  test.beforeEach(async ({ page }) => {
    await signUpPosthogUser(page);
  });

  test("PostHog course detail page shows section headings", async ({
    page,
  }) => {
    await page.goto("/browse");

    // Find and click the PostHog TAM course
    const posthogCourse = page
      .locator("a[href^='/browse/']")
      .filter({ hasText: "PostHog TAM" });
    await expect(posthogCourse).toBeVisible({ timeout: 10_000 });
    await posthogCourse.click();

    // Should be on course detail page
    await expect(
      page.getByRole("heading", { name: "PostHog TAM Technical Onboarding" })
    ).toBeVisible();

    // Should show split foundational section headings (2 each, not 1)
    await expect(
      page.getByRole("heading", { name: "Data Modeling Basics" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Data Modeling Design", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Pipeline Basics" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Pipeline Architecture" })
    ).toBeVisible();

    // PostHog-specific sections
    await expect(
      page.getByRole("heading", { name: "PostHog Data Model" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "PostHog Ingestion Pipeline" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Identification", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Group Analytics", exact: true })
    ).toBeVisible();
  });

  test("concepts are grouped under their section headings", async ({
    page,
  }) => {
    await page.goto("/browse");
    const posthogCourse = page
      .locator("a[href^='/browse/']")
      .filter({ hasText: "PostHog TAM" });
    await expect(posthogCourse).toBeVisible({ timeout: 10_000 });
    await posthogCourse.click();

    // "Entities" concept should be visible under Data Modeling section
    await expect(
      page.getByText("Entities — Things That Exist")
    ).toBeVisible();

    // "PostHog Events" concept should be visible under PostHog Data Model section
    await expect(
      page.getByText("PostHog Events — The Atomic Unit")
    ).toBeVisible();

    // Should show concept count (37 concepts = numbered 1-37)
    await expect(page.getByText("37")).toBeVisible();
  });

  test("course shows correct progress summary with sections", async ({
    page,
  }) => {
    await page.goto("/browse");
    const posthogCourse = page
      .locator("a[href^='/browse/']")
      .filter({ hasText: "PostHog TAM" });
    await expect(posthogCourse).toBeVisible({ timeout: 10_000 });
    await posthogCourse.click();

    // Should show progress section
    await expect(page.getByText("Course Progress")).toBeVisible();

    // Should show diagnostic CTA for fresh user
    await expect(page.getByText("Take Diagnostic")).toBeVisible();
  });
});
