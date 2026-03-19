import { test, expect } from "@playwright/test";
import { POSTHOG_TEST_BRAND_ID, signUpBrandedTestUser } from "./helpers/auth";

const POSTHOG_COURSE_NAME = "PostHog TAM Technical Onboarding";
const FIRST_CONCEPT_NAME = "Entities — Things That Exist";
const FIRST_CONCEPT_ID = "8178bc19-94aa-4310-8f0f-133749447d57";

test.describe("PostHog lesson routes", () => {
  test.beforeEach(async ({ page }) => {
    await signUpBrandedTestUser(page, POSTHOG_TEST_BRAND_ID);
  });

  test("study router and direct lesson route both load a lesson", async ({
    page,
  }) => {
    await page.goto("/browse");

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

    await page.goto(`/study/${courseId}`);
    await expect(
      page.getByRole("heading", { name: FIRST_CONCEPT_NAME })
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Lesson Unavailable")).not.toBeVisible();

    await page.goto(`/study/${courseId}/lesson/${FIRST_CONCEPT_ID}`);
    await expect(
      page.getByRole("heading", { name: FIRST_CONCEPT_NAME })
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Lesson Unavailable")).not.toBeVisible();
  });
});
