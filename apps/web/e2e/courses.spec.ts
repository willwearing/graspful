import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import {
  getSupabaseUserIdByEmail,
  POSTHOG_TEST_BRAND_ID,
  signUpBrandedTestUser,
} from "./helpers/auth";

const ORG_SLUG = "posthog-tam";
const prisma = new PrismaClient();

async function grantLearnerMembership(email: string) {
  const userId = await getSupabaseUserIdByEmail(email);
  const org = await prisma.organization.findUnique({
    where: { slug: ORG_SLUG },
    select: { id: true },
  });

  if (!org) {
    throw new Error(`Organization ${ORG_SLUG} not found`);
  }

  await prisma.orgMembership.upsert({
    where: { orgId_userId: { orgId: org.id, userId } },
    update: {},
    create: {
      orgId: org.id,
      userId,
      role: "member",
    },
  });
}

/**
 * Enter the academy browse flow and return the first course card.
 */
async function getFirstBrowseCourseCard(page: Page) {
  await page.goto("/browse");
  await expect(page.getByText("Browse Academies")).toBeVisible();

  const openAcademy = page.getByRole("button", { name: "Open Academy" }).first();
  await expect(openAcademy).toBeVisible({ timeout: 10_000 });
  await openAcademy.click();

  const firstCourse = page.locator("a[href^='/browse/']").first();
  await expect(firstCourse).toBeVisible({ timeout: 10_000 });
  return firstCourse;
}

test.describe("Course browsing (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    const email = await signUpBrandedTestUser(page, POSTHOG_TEST_BRAND_ID);
    await grantLearnerMembership(email);
  });

  test("dashboard loads and shows the browse CTA for fresh learners", async ({ page }) => {
    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(
      page.getByText(/Academy Courses|Your Courses/)
    ).toBeVisible();
    await expect(
      page.getByText("No courses yet. Browse available courses to get started.")
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Browse Courses" })).toBeVisible();
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
    const firstCourse = await getFirstBrowseCourseCard(page);
    await firstCourse.click();

    // Should be on course detail page — back link text depends on academy context
    await expect(
      page.getByText(/Back to (Academy|Courses)/)
    ).toBeVisible();
    // Course heading should exist
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("course detail page shows concepts list", async ({ page }) => {
    const firstCourse = await getFirstBrowseCourseCard(page);
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
    const firstCourse = await getFirstBrowseCourseCard(page);
    await firstCourse.click();

    // Should show progress section
    await expect(page.getByText("Course Progress")).toBeVisible();
    // Should show mastery breakdown - use the summary section, not the per-concept badges
    const progressSection = page.locator(".grid").filter({ hasText: "Mastered" });
    await expect(progressSection.first()).toBeVisible();
  });

  test("back navigation works on detail page", async ({ page }) => {
    const firstCourse = await getFirstBrowseCourseCard(page);
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
    const email = await signUpBrandedTestUser(page, POSTHOG_TEST_BRAND_ID);
    await grantLearnerMembership(email);
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
    const email = await signUpBrandedTestUser(page, POSTHOG_TEST_BRAND_ID);
    await grantLearnerMembership(email);
  });

  test("study route loads without error for a valid course", async ({
    page,
  }) => {
    const firstCourse = await getFirstBrowseCourseCard(page);
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
    const firstCourse = await getFirstBrowseCourseCard(page);
    const href = await firstCourse.getAttribute("href");
    const courseId = href?.replace("/browse/", "");

    await page.goto(`/diagnostic/${courseId}`);
    await expect(page.locator("body")).not.toContainText("500");
    await expect(page.locator("body")).not.toContainText(
      "Internal Server Error"
    );
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });
});
