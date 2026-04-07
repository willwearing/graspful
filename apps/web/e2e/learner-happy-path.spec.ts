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

async function answerCurrentQuestion(page: Page) {
  const optionButton = page.locator("button.rounded-lg.border-2").first();
  const submitButton = page.getByRole("button", { name: "Submit Answer" });

  if (await optionButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await optionButton.click();
    if (await submitButton.isVisible({ timeout: 500 }).catch(() => false)) {
      await submitButton.click();
      return;
    }
  }

  const trueButton = page.getByRole("button", { name: "True" });
  if (await trueButton.isVisible({ timeout: 500 }).catch(() => false)) {
    await trueButton.click();
    return;
  }

  await page.getByRole("button", { name: "I don't know this yet" }).click();
}

test.describe("Learner happy path", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("new learner can sign up, start diagnostic, and reach a study lesson", async ({
    page,
  }) => {
    const email = await signUpBrandedTestUser(page, POSTHOG_TEST_BRAND_ID);
    await grantLearnerMembership(email);
    const { id: courseId, academyId } = await getCourseEntry();

    await page.goto(`/browse/${courseId}`);
    await expect(page.getByText("Course Progress")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Take Diagnostic" }).click();

    await expect(page).toHaveURL(/\/diagnostic/, { timeout: 10_000 });

    const diagnosticText = page.getByText("Diagnostic Assessment");
    const unavailableText = page.getByText("Diagnostic Unavailable");
    await expect(diagnosticText.or(unavailableText)).toBeVisible({ timeout: 15_000 });

    const hasDiagnostic = await diagnosticText.isVisible().catch(() => false);

    if (hasDiagnostic) {
      await expect(page.getByText("Question 1 of")).toBeVisible({ timeout: 10_000 });
      await answerCurrentQuestion(page);
      await expect(page.getByText("Question 2 of")).toBeVisible({ timeout: 10_000 });
    } else {
      expect(academyId).toBeTruthy();
    }

    await page.goto(`/study/${courseId}`);
    const sessionComplete = await page
      .getByText("Session Complete")
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (sessionComplete) {
      await expect(page.getByText("Great work!")).toBeVisible();
      return;
    }

    await expect(page.getByText("Knowledge Point 1 of")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Lesson Unavailable")).not.toBeVisible();
  });
});
