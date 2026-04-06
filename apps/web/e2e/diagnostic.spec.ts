import { PrismaClient } from "@prisma/client";
import { test, expect } from "@playwright/test";
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

async function getDiagnosticCourseId(): Promise<string> {
  const org = await prisma.organization.findUnique({
    where: { slug: ORG_SLUG },
    select: {
      courses: {
        where: { name: COURSE_NAME },
        select: { id: true },
        take: 1,
      },
    },
  });

  const courseId = org?.courses[0]?.id;
  if (!courseId) {
    throw new Error(`Course ${COURSE_NAME} not found`);
  }

  return courseId;
}

/**
 * Answer whatever diagnostic question is on screen.
 * Works across all problem types (multiple choice, true/false, etc.)
 * by using the "I don't know" escape hatch when a simple click path isn't available.
 */
async function answerCurrentQuestion(page: import("@playwright/test").Page) {
  const mcOption = page.locator("button.rounded-lg.border-2").first();
  const submitBtn = page.getByRole("button", { name: "Submit Answer" });

  if (await mcOption.isVisible({ timeout: 1000 }).catch(() => false)) {
    await mcOption.click();
    if (await submitBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await submitBtn.click();
      return;
    }
  }

  const trueBtn = page.getByRole("button", { name: "True" });
  if (await trueBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await trueBtn.click();
    return;
  }

  await page.getByRole("button", { name: "I don't know this yet" }).click();
}

async function expectDiagnosticOrUnavailable(
  page: import("@playwright/test").Page,
): Promise<boolean> {
  const hasDiagnostic = await page
    .getByText("Diagnostic Assessment")
    .isVisible({ timeout: 5_000 })
    .catch(() => false);

  if (!hasDiagnostic) {
    await expect(page.getByText("Diagnostic Unavailable")).toBeVisible();
    return false;
  }

  return true;
}

test.describe("Diagnostic flow", () => {
  let academyId: string;

  test.beforeEach(async ({ page }) => {
    const email = await signUpBrandedTestUser(page, POSTHOG_TEST_BRAND_ID);
    await grantLearnerMembership(email);
    const courseId = await getDiagnosticCourseId();
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { academyId: true },
    });

    if (!course?.academyId) {
      throw new Error(`Course ${COURSE_NAME} is not attached to an academy`);
    }

    academyId = course.academyId;
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("diagnostic loads and shows question 1", async ({ page }) => {
    await page.goto(`/academy/${academyId}/diagnostic`);

    const hasDiagnostic = await expectDiagnosticOrUnavailable(page);
    if (!hasDiagnostic) return;

    await expect(page.getByText("Question 1 of")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: "I don't know this yet" })).toBeVisible();
  });

  test("answering a question advances to the next", async ({ page }) => {
    await page.goto(`/academy/${academyId}/diagnostic`);
    const hasDiagnostic = await expectDiagnosticOrUnavailable(page);
    if (!hasDiagnostic) return;

    await expect(page.getByText("Question 1 of")).toBeVisible({ timeout: 10_000 });

    await answerCurrentQuestion(page);

    await expect(page.getByText("Question 2 of")).toBeVisible({ timeout: 10_000 });
  });

  test("session resumes after page reload", async ({ page }) => {
    await page.goto(`/academy/${academyId}/diagnostic`);
    const hasDiagnostic = await expectDiagnosticOrUnavailable(page);
    if (!hasDiagnostic) return;

    await expect(page.getByText("Question 1 of")).toBeVisible({ timeout: 10_000 });

    await answerCurrentQuestion(page);
    await expect(page.getByText("Question 2 of")).toBeVisible({ timeout: 10_000 });

    await page.reload();

    await expect(page.getByText("Question 2 of")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Question 1 of")).not.toBeVisible();
  });

  test("'I don't know' advances to next question", async ({ page }) => {
    await page.goto(`/academy/${academyId}/diagnostic`);
    const hasDiagnostic = await expectDiagnosticOrUnavailable(page);
    if (!hasDiagnostic) return;

    await expect(page.getByText("Question 1 of")).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "I don't know this yet" }).click();

    await expect(page.getByText("Question 2 of")).toBeVisible({ timeout: 10_000 });
  });
});
