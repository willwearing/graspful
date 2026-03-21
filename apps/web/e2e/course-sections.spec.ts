import { test, expect, type Page } from "@playwright/test";
import { POSTHOG_TEST_BRAND_ID, signUpBrandedTestUser } from "./helpers/auth";

/**
 * Navigate to the PostHog TAM Technical Onboarding course detail page.
 *
 * Strategy: from the dashboard, find any course card and extract the course ID.
 * Then navigate directly to the course detail page. If the specific PostHog TAM
 * course card is visible, click it. Otherwise, fall back to browsing.
 */
async function navigateToPosthogCourse(page: Page) {
  // Dashboard already loaded after sign-up — find any course card
  const courseCards = page.locator("a[href^='/browse/']");
  await expect(courseCards.first()).toBeVisible({ timeout: 10_000 });

  // Look for the PostHog TAM Technical Onboarding card specifically
  const tamCard = courseCards.filter({ hasText: "PostHog TAM Technical Onboarding" });
  if (await tamCard.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
    await tamCard.first().click();
    return;
  }

  // If the specific card isn't on the dashboard, the course might be nested
  // inside an academy. Click any course card to get to a browse page, then
  // look for the TAM course from there.
  const firstHref = await courseCards.first().getAttribute("href");
  const firstCourseId = firstHref?.replace("/browse/", "");

  // Check if the first course IS the TAM onboarding (the dashboard might
  // show it but with a truncated name)
  await courseCards.first().click();

  // If we're on the course detail page for the right course, we're done
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toBeVisible({ timeout: 10_000 });
  const headingText = await heading.textContent();

  if (headingText?.includes("PostHog TAM Technical Onboarding")) {
    return;
  }

  // Not the right course — go back and look at other options
  // The TAM course might be accessible from the academy page
  const backLink = page.getByText(/Back to (Academy|Academies|Courses)/);
  if (await backLink.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await backLink.click();
    await page.waitForTimeout(1_000);
  }

  // Try navigating to browse and looking at all academies
  await page.goto("/browse");
  const academyLinks = page.locator("a[href^='/academy/']");
  await expect(academyLinks.first()).toBeVisible({ timeout: 10_000 });

  // Visit each academy page to find the TAM onboarding course
  const linkCount = await academyLinks.count();
  for (let i = 0; i < linkCount; i++) {
    const href = await academyLinks.nth(i).getAttribute("href");
    await page.goto(href!);

    const tamCourseCard = page
      .locator("a[href^='/browse/']")
      .filter({ hasText: /Technical Onboarding/ });

    if (await tamCourseCard.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await tamCourseCard.first().click();
      return;
    }
  }

  // Last resort: the course might be directly accessible by looking at all
  // course cards across the page
  throw new Error("Could not find PostHog TAM Technical Onboarding course");
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
    ).toBeVisible({ timeout: 10_000 });

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

    await expect(
      page.getByRole("heading", { name: "PostHog TAM Technical Onboarding" })
    ).toBeVisible({ timeout: 10_000 });

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

    await expect(
      page.getByRole("heading", { name: "PostHog TAM Technical Onboarding" })
    ).toBeVisible({ timeout: 10_000 });

    // Should show progress section
    await expect(page.getByText("Course Progress")).toBeVisible();

    // Should show diagnostic CTA for fresh user
    await expect(page.getByText("Take Diagnostic")).toBeVisible();
  });
});
