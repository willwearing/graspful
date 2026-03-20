import { test, expect, type Page } from "@playwright/test";
import { POSTHOG_TEST_BRAND_ID, signUpBrandedTestUser } from "./helpers/auth";

/**
 * Navigate from /browse through the academy that contains "PostHog TAM"
 * to the course detail page.
 */
async function navigateToPosthogCourse(page: Page) {
  await page.goto("/browse");

  // Find the academy card whose heading contains "PostHog TAM" and open it
  const openBtn = page.getByRole("button", { name: "Open Academy" }).first();
  await expect(openBtn).toBeVisible({ timeout: 10_000 });
  await openBtn.click();

  // On academy page — click the PostHog TAM course card
  const posthogCourse = page
    .locator("a[href^='/browse/']")
    .filter({ hasText: "PostHog TAM" });
  await expect(posthogCourse).toBeVisible({ timeout: 10_000 });
  await posthogCourse.click();
}

test.describe("Course sections display", () => {
  test.beforeEach(async ({ page }) => {
    await signUpBrandedTestUser(page, POSTHOG_TEST_BRAND_ID);
  });

  test("PostHog course detail page shows section headings", async ({
    page,
  }) => {
    await navigateToPosthogCourse(page);

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
    await navigateToPosthogCourse(page);

    const conceptsSection = page
      .locator("div")
      .filter({ has: page.getByRole("heading", { name: "Concepts" }) })
      .first();
    const progressCard = page
      .locator("div")
      .filter({ hasText: "Course Progress" })
      .first();
    const unstartedCount = progressCard.locator("div.grid > div").last().locator("p").first();

    // Concepts should render beneath the sectioned course structure.
    await expect(conceptsSection.getByText("Entities — Things That Exist")).toBeVisible();
    await expect(
      conceptsSection.getByText("PostHog Events — The Atomic Unit")
    ).toBeVisible();

    // Fresh learners should still see the full course concept count in the progress summary.
    await expect(unstartedCount).toHaveText("37");
  });

  test("course shows correct progress summary with sections", async ({
    page,
  }) => {
    await navigateToPosthogCourse(page);

    // Should show progress section
    await expect(page.getByText("Course Progress")).toBeVisible();

    // Should show diagnostic CTA for fresh user
    await expect(page.getByText("Take Diagnostic")).toBeVisible();
  });
});
