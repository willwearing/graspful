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

async function navigateToPosthogCourse(page: Page) {
  const org = await prisma.organization.findUnique({
    where: { slug: ORG_SLUG },
    select: {
      courses: {
        where: { name: "PostHog TAM Technical Onboarding" },
        select: { id: true },
        take: 1,
      },
    },
  });

  const courseId = org?.courses[0]?.id;
  if (!courseId) {
    throw new Error("Could not find PostHog TAM Technical Onboarding course");
  }

  await page.goto(`/browse/${courseId}`);
}

test.describe("Course sections display", () => {
  test.beforeEach(async ({ page }) => {
    const email = await signUpBrandedTestUser(page, POSTHOG_TEST_BRAND_ID);
    await grantLearnerMembership(email);
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
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
