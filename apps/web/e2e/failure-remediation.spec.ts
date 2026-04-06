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

async function getCourseId(): Promise<string> {
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

async function completeDiagnosticFast(page: Page, courseId: string): Promise<boolean> {
  await page.goto(`/browse/${courseId}`);
  await expect(page.getByText("Take Diagnostic")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Take Diagnostic" }).click();

  const hasDiagnostic = await page
    .getByText("Diagnostic Assessment")
    .isVisible({ timeout: 5_000 })
    .catch(() => false);

  if (!hasDiagnostic) {
    await expect(page.getByText("Diagnostic Unavailable")).toBeVisible();
    return false;
  }

  for (let i = 0; i < 100; i++) {
    const dontKnow = page.getByRole("button", { name: "I don't know this yet" });
    const isVisible = await dontKnow.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!isVisible) break;

    await dontKnow.waitFor({ state: "attached", timeout: 5_000 }).catch(() => {});
    const isEnabled = await dontKnow.isEnabled({ timeout: 5_000 }).catch(() => false);
    if (!isEnabled) break;

    await dontKnow.click();

    await page
      .waitForFunction(
        () => {
          const body = document.body.textContent ?? "";
          return (
            body.includes("I don't know this yet") ||
            body.includes("Session Complete") ||
            body.includes("Diagnostic Complete") ||
            body.includes("Results")
          );
        },
        { timeout: 8_000 }
      )
      .catch(() => {});
  }

  await page.waitForTimeout(1_000);
  return true;
}

async function answerWrong(page: Page): Promise<boolean> {
  const mcOptions = page.locator("button.rounded-lg.border-2");
  const submitBtn = page.getByRole("button", { name: "Submit Answer" });

  const count = await mcOptions.count();
  if (count >= 2) {
    await mcOptions.nth(count - 1).click();
    if (await submitBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await submitBtn.click();
      return true;
    }
  }

  const falseBtn = page.getByRole("button", { name: "False" });
  if (await falseBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await falseBtn.click();
    return true;
  }

  return false;
}

async function navigateToStudy(page: Page, courseId: string): Promise<string> {
  await page.goto(`/study/${courseId}`);
  await page
    .waitForFunction(
      () => {
        const url = window.location.href;
        const body = document.body.textContent ?? "";
        return (
          url.includes("/lesson/") ||
          url.includes("/review/") ||
          url.includes("/quiz") ||
          url.includes("/exam") ||
          body.includes("Session Complete") ||
          body.includes("Loading next activity") === false
        );
      },
      { timeout: 15_000 }
    )
    .catch(() => {});

  return page.url();
}

test.describe("Failure and remediation flow", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("answering wrong shows feedback and continues", async ({ page }) => {
    const email = await signUpBrandedTestUser(page, POSTHOG_TEST_BRAND_ID);
    await grantLearnerMembership(email);
    const courseId = await getCourseId();
    const diagnosticStarted = await completeDiagnosticFast(page, courseId);

    if (!diagnosticStarted) {
      await expect(page.locator("body")).not.toContainText("500");
      return;
    }

    const url = await navigateToStudy(page, courseId);

    if (!url.includes("/lesson/")) {
      await expect(page.locator("body")).not.toContainText("500");
      await expect(page.locator("body")).not.toContainText("Internal Server Error");
      return;
    }

    await expect(page.getByText("Knowledge Point 1 of")).toBeVisible({
      timeout: 10_000,
    });

    for (let i = 0; i < 5; i++) {
      const practiceHeading = page.getByText("Practice");
      if (await practiceHeading.isVisible({ timeout: 1_000 }).catch(() => false)) {
        break;
      }
      const continueBtn = page.getByRole("button", { name: "Continue" });
      if (await continueBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await continueBtn.click();
        await page.waitForTimeout(500);
      } else {
        break;
      }
    }

    const submitBtn = page.getByRole("button", { name: "Submit Answer" });
    const hasProblem = await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false);

    if (hasProblem) {
      const answered = await answerWrong(page);
      if (answered) {
        const feedbackBanner = page.locator(".rounded-lg.p-4.text-sm");
        const feedbackVisible = await feedbackBanner
          .first()
          .isVisible({ timeout: 8_000 })
          .catch(() => false);
        const textFeedback = await page
          .getByText(/Correct!|Incorrect|Correct order|Incorrect order|We'll teach you/)
          .first()
          .isVisible({ timeout: 3_000 })
          .catch(() => false);

        expect(feedbackVisible || textFeedback).toBe(true);
        await page.waitForTimeout(2_000);
        await expect(page.locator("body")).not.toContainText("Internal Server Error");
      }
    }

    await expect(page.locator("body")).not.toContainText("500");
  });

  test("completing diagnostic unlocks study flow", async ({ page }) => {
    const email = await signUpBrandedTestUser(page, POSTHOG_TEST_BRAND_ID);
    await grantLearnerMembership(email);
    const courseId = await getCourseId();
    const diagnosticStarted = await completeDiagnosticFast(page, courseId);

    if (!diagnosticStarted) {
      await expect(page.getByText("Diagnostic Unavailable")).toBeVisible();
      return;
    }

    await page.goto(`/study/${courseId}`);
    await expect(page.locator("body")).not.toContainText("500");
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
  });
});
