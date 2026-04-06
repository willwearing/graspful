import { PrismaClient } from "@prisma/client";
import { test, expect, type Page } from "@playwright/test";
import {
  getSupabaseUserIdByEmail,
  POSTHOG_TEST_BRAND_ID,
  signUpBrandedTestUser,
} from "./helpers/auth";

const ORG_SLUG = "posthog-tam";
const COURSE_NAME = "PostHog TAM Technical Onboarding";
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

async function getCourseEntry() {
  const org = await prisma.organization.findUnique({
    where: { slug: ORG_SLUG },
    select: {
      courses: {
        where: { name: COURSE_NAME },
        select: { id: true, academyId: true },
        take: 1,
      },
    },
  });

  const course = org?.courses[0];
  if (!course) {
    throw new Error(`Course ${COURSE_NAME} not found`);
  }

  return course;
}

async function expectLessonLoaded(url: string, page: Page) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");

  const onLessonRoute = /\/study\/.+\/lesson\/.+$/.test(page.url());
  const sessionComplete = await page
    .getByText("Session Complete")
    .isVisible({ timeout: 5_000 })
    .catch(() => false);

  if (!onLessonRoute && !sessionComplete) {
    await expect(page).toHaveURL(/\/study\/.+\/lesson\/.+$/, { timeout: 15_000 });
  }

  if (sessionComplete) {
    await expect(page.getByText("Great work!")).toBeVisible();
    return;
  }

  await expect(page.getByText("Knowledge Point 1 of")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("Lesson Unavailable")).not.toBeVisible();
  await expect(page.getByRole("heading").first()).toBeVisible();
}

test.describe("PostHog lesson routes", () => {
  test.beforeEach(async ({ page }) => {
    const email = await signUpBrandedTestUser(page, POSTHOG_TEST_BRAND_ID);
    await grantLearnerMembership(email);
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("study router and direct lesson route both load a lesson", async ({
    page,
  }) => {
    const { id: courseId, academyId } = await getCourseEntry();

    await page.goto(`/browse/${courseId}`);
    await expect(page.getByText("Take Diagnostic")).toBeVisible({ timeout: 10_000 });

    if (academyId) {
      await page.goto(`/academy/${academyId}/diagnostic`);
      const hasDiagnostic = await page
        .getByText("Diagnostic Assessment")
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      if (!hasDiagnostic) {
        await expect(page.getByText("Diagnostic Unavailable")).toBeVisible();
      }
    }

    await expectLessonLoaded(`/study/${courseId}`, page);
    const lessonUrl = page.url();
    await expectLessonLoaded(lessonUrl, page);
  });
});
