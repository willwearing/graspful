import { test, expect, type Page } from "@playwright/test";
import { POSTHOG_TEST_BRAND_ID, signUpBrandedTestUser } from "./helpers/auth";

const POSTHOG_COURSE_NAME = "PostHog TAM Technical Onboarding";

async function expectLessonLoaded(url: string, page: Page) {
  await page.goto(url);
  await expect(page).toHaveURL(/\/study\/.+\/lesson\/.+$/, { timeout: 15_000 });
  await expect(page.getByText("Knowledge Point 1 of")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("Lesson Unavailable")).not.toBeVisible();
  await expect(page.getByRole("heading").first()).toBeVisible();
}

test.describe("PostHog lesson routes", () => {
  test.beforeEach(async ({ page }) => {
    await signUpBrandedTestUser(page, POSTHOG_TEST_BRAND_ID);
  });

  test("study router and direct lesson route both load a lesson", async ({
    page,
  }) => {
    // From dashboard, find the PostHog TAM course card directly
    const posthogCourse = page
      .locator("a[href^='/browse/']")
      .filter({ hasText: POSTHOG_COURSE_NAME });
    await expect(posthogCourse.first()).toBeVisible({ timeout: 10_000 });

    const href = await posthogCourse.first().getAttribute("href");
    const courseId = href?.replace("/browse/", "");
    expect(courseId).toBeTruthy();

    // Diagnostic route — try academy-scoped first, fall back to course-scoped
    const courseDetailPage = await page.goto(`/browse/${courseId}`);
    await expect(page.getByText("Take Diagnostic")).toBeVisible({ timeout: 10_000 });

    // Find the diagnostic link from the Take Diagnostic button
    const diagButton = page.getByText("Take Diagnostic").first();
    await diagButton.click();

    // Should land on a diagnostic page (either /diagnostic/{id} or /academy/{id}/diagnostic)
    await expect(page).toHaveURL(/\/diagnostic/, { timeout: 10_000 });
    await expect(page.getByText("Diagnostic Assessment")).toBeVisible({
      timeout: 15_000,
    });

    await expectLessonLoaded(`/study/${courseId}`, page);
    const lessonUrl = page.url();

    await expectLessonLoaded(lessonUrl, page);
  });
});
