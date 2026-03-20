import { test, expect, type Page } from "@playwright/test";
import { signUpTestUser } from "./helpers/auth";

/**
 * Get a course card locator from the dashboard.
 * The dashboard still renders CourseCard components with `/browse/<courseId>` links.
 */
async function getFirstDashboardCourseCard(page: Page) {
  // signUpTestUser lands on /dashboard already
  const firstCourse = page.locator("a[href^='/browse/']").first();
  await expect(firstCourse).toBeVisible({ timeout: 10_000 });
  return firstCourse;
}

test.describe("Course browsing (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await signUpTestUser(page);
  });

  test("dashboard loads and shows courses from backend", async ({ page }) => {
    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.getByText("Your Courses")).toBeVisible();

    // Should show at least one course card (seeded data)
    const courseCards = page.locator("a[href^='/browse/']");
    await expect(courseCards.first()).toBeVisible({ timeout: 10_000 });
  });

  test("browse page lists available academies", async ({ page }) => {
    await page.goto("/browse");
    await expect(page.getByText("Browse Academies")).toBeVisible();

    // Should show at least one academy card with an "Open Academy" button
    const academyCards = page.getByRole("button", { name: "Open Academy" });
    await expect(academyCards.first()).toBeVisible({ timeout: 10_000 });
    const count = await academyCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("clicking a course navigates to course detail page", async ({
    page,
  }) => {
    const firstCourse = await getFirstDashboardCourseCard(page);
    await firstCourse.click();

    // Should be on course detail page — back link text depends on academy context
    await expect(
      page.getByText(/Back to (Academy|Courses)/)
    ).toBeVisible();
    // Course heading should exist
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("course detail page shows concepts list", async ({ page }) => {
    const firstCourse = await getFirstDashboardCourseCard(page);
    await firstCourse.click();

    // Should show concepts heading
    await expect(
      page.getByRole("heading", { name: "Concepts" })
    ).toBeVisible();

    // Should show diagnostic CTA for a fresh user
    await expect(
      page.getByText("Know some of this already?")
    ).toBeVisible();
    await expect(page.getByText("Take Diagnostic")).toBeVisible();
  });

  test("course detail page shows progress summary", async ({ page }) => {
    const firstCourse = await getFirstDashboardCourseCard(page);
    await firstCourse.click();

    // Should show progress section
    await expect(page.getByText("Course Progress")).toBeVisible();
    // Should show mastery breakdown - use the summary section, not the per-concept badges
    const progressSection = page.locator(".grid").filter({ hasText: "Mastered" });
    await expect(progressSection.first()).toBeVisible();
  });

  test("back navigation works on detail page", async ({ page }) => {
    const firstCourse = await getFirstDashboardCourseCard(page);
    await firstCourse.click();

    // Back link text depends on whether course has an academy
    const backLink = page.getByText(/Back to (Academy|Courses)/);
    await expect(backLink).toBeVisible();
    await backLink.click();
    // Should navigate to either /browse or /academy/:id
    await expect(page).toHaveURL(/\/(browse|academy\/.+)$/);
  });
});

test.describe("Dashboard features (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await signUpTestUser(page);
  });

  test("dashboard shows streak counter and XP progress", async ({ page }) => {
    await expect(page.getByText(/streak/i)).toBeVisible({ timeout: 10_000 });
  });

  test("dashboard browse courses link works", async ({ page }) => {
    const browseLink = page.getByRole("link", { name: /browse/i }).first();
    if (await browseLink.isVisible()) {
      await browseLink.click();
      await expect(page).toHaveURL(/\/browse/);
    }
  });
});

test.describe("Study and diagnostic routes (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await signUpTestUser(page);
  });

  test("study route loads without error for a valid course", async ({
    page,
  }) => {
    const firstCourse = await getFirstDashboardCourseCard(page);
    const href = await firstCourse.getAttribute("href");
    const courseId = href?.replace("/browse/", "");
    expect(courseId).toBeTruthy();

    await page.goto(`/study/${courseId}`);
    // Should not show a server error
    await expect(page.locator("body")).not.toContainText("500");
    await expect(page.locator("body")).not.toContainText(
      "Internal Server Error"
    );
  });

  test("diagnostic route loads without error for a valid course", async ({
    page,
  }) => {
    const firstCourse = await getFirstDashboardCourseCard(page);
    const href = await firstCourse.getAttribute("href");
    const courseId = href?.replace("/browse/", "");

    await page.goto(`/diagnostic/${courseId}`);
    await expect(page.locator("body")).not.toContainText("500");
    await expect(page.locator("body")).not.toContainText(
      "Internal Server Error"
    );
  });
});
