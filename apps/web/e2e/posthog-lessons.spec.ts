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
    await page.goto("/browse");

    // Find the academy card containing the PostHog TAM course and enter it
    const academyHeading = page.getByRole("heading", { name: /PostHog TAM/i, level: 2 });
    await expect(academyHeading).toBeVisible({ timeout: 10_000 });
    // Click the "Open Academy" button (rendered as button role by base-ui)
    const openBtn = page.getByRole("button", { name: "Open Academy" }).first();
    await openBtn.click();

    // On academy page — get the courseId from the course card
    const posthogCourse = page
      .locator("a[href^='/browse/']")
      .filter({ hasText: POSTHOG_COURSE_NAME });
    await expect(posthogCourse).toBeVisible({ timeout: 10_000 });

    const href = await posthogCourse.getAttribute("href");
    const courseId = href?.replace("/browse/", "");
    expect(courseId).toBeTruthy();

    await page.goto(`/diagnostic/${courseId}`);
    await expect(page.getByText("Diagnostic Assessment")).toBeVisible({
      timeout: 15_000,
    });

    await expectLessonLoaded(`/study/${courseId}`, page);
    const lessonUrl = page.url();

    await expectLessonLoaded(lessonUrl, page);
  });
});
