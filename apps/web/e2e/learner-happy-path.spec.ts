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
    await expect(page.getByRole("heading", { name: COURSE_NAME, exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Take Diagnostic" }).click();

    await expect(page).toHaveURL(new RegExp(`/academy/${academyId}/diagnostic$`), { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Diagnostic Assessment" })).toBeVisible();
    await expect(page.getByText(/^Question 1 of/)).toBeVisible();
    await expect(page.getByRole("radiogroup")).toBeVisible();
    await page.getByRole("button", { name: "I don't know this yet", exact: true }).click();
    await expect(page.getByText(/^Question 2 of/)).toBeVisible({ timeout: 10_000 });

    // Starting the diagnostic enrolls the learner, which creates the progress
    // profile. A first browse of an unenrolled course has no profile yet.
    await page.goto(`/browse/${courseId}`);
    await expect(page.getByText("Course Progress", { exact: true })).toBeVisible();

    await page.goto(`/study/${courseId}`);
    await expect(page).toHaveURL(new RegExp(`/study/${courseId}/lesson/[^/?]+`), {
      timeout: 15_000,
    });
    await expect(page.getByText(/^Knowledge Point 1 of/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeVisible();
    await expect(page.getByRole("complementary").getByRole("link", { name: "Dashboard", exact: true })).toBeVisible();
  });
});
