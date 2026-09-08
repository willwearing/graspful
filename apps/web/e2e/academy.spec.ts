import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { test, expect, type Page } from "@playwright/test";
import { getE2eEnvironment } from "../../../scripts/e2e-env";
import {
  getBrowserAccessToken,
  getSupabaseUserIdByEmail,
  POSTHOG_TEST_BRAND_ID,
  signUpBrandedTestUser,
} from "./helpers/auth";

const ORG_SLUG = "posthog-tam";
const BACKEND_URL = getE2eEnvironment(process.env).NEXT_PUBLIC_BACKEND_URL;
const prisma = new PrismaClient();
const academyId = randomUUID();
const courseId = randomUUID();
const conceptId = randomUUID();
const academyName = "Academy navigation test";
const courseName = "Academy arithmetic course";
const conceptName = "Adding two numbers";
const instruction = "Add two numbers by counting their combined total.";

async function enrollLearner(page: Page, email: string) {
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
  const token = await getBrowserAccessToken(page);
  expect(token).toBeTruthy();
  const response = await page.request.post(
    `${BACKEND_URL}/orgs/${ORG_SLUG}/academies/${academyId}/enroll`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  expect(response.ok(), await response.text()).toBe(true);
  expect(await prisma.academyEnrollment.count({ where: { userId, academyId } })).toBe(1);
}

test.describe("Academy features", () => {
  test.beforeAll(async () => {
    const org = await prisma.organization.findUniqueOrThrow({
      where: { slug: ORG_SLUG },
      select: { id: true },
    });
    // Each run owns its academy and teaching content. Demo seed changes cannot
    // turn these assertions into checks for an unavailable or empty state.
    await prisma.academy.create({
      data: {
        id: academyId,
        orgId: org.id,
        slug: `e2e-academy-${academyId}`,
        name: academyName,
        courses: {
          create: {
            id: courseId,
            orgId: org.id,
            slug: `e2e-academy-course-${courseId}`,
            name: courseName,
            isPublished: true,
            concepts: {
              create: {
                id: conceptId,
                orgId: org.id,
                slug: "addition",
                name: conceptName,
                knowledgePoints: {
                  create: {
                    slug: "add-two",
                    instructionText: instruction,
                    workedExampleText: "Two apples plus two apples makes four apples.",
                    problems: {
                      create: {
                        authoredId: `addition-${conceptId}`,
                        type: "multiple_choice",
                        questionText: "What is 2 + 2?",
                        options: ["4", "3", "5", "6"],
                        correctAnswer: 0,
                        explanation: "Two plus two equals four.",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  });

  test.beforeEach(async ({ page }) => {
    const email = await signUpBrandedTestUser(page, POSTHOG_TEST_BRAND_ID);
    await enrollLearner(page, email);
  });

  test.afterAll(async () => {
    await prisma.academy.deleteMany({ where: { id: academyId } });
    await prisma.$disconnect();
  });

  test("dashboard shows academy-level stats heading", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Academy Courses" })).toBeVisible();
    await expect(page.getByText(courseName, { exact: true })).toBeVisible();
  });

  test("academy page loads and shows courses", async ({ page }) => {
    await page.goto(`/academy/${academyId}`);
    await expect(page.getByRole("heading", { name: academyName, level: 1 })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole("heading", { name: "Courses" })).toBeVisible();
    await expect(page.getByText("Academy Progress")).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(courseName) })).toHaveAttribute(
      "href", `/browse/${courseId}`,
    );
    await expect(page.getByText("0 / 1 concepts mastered", { exact: true })).toBeVisible();
  });

  test("academy diagnostic route loads", async ({ page }) => {
    await page.goto(`/academy/${academyId}/diagnostic`);
    await expect(page.getByRole("heading", { name: "Diagnostic Assessment" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Question 1 of ~1", { exact: true })).toBeVisible();
    await expect(page.getByText("What is 2 + 2?", { exact: true })).toBeVisible();
    await expect(page.getByRole("radiogroup")).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit Answer", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Diagnostic Unavailable" })).toHaveCount(0);
  });

  test("academy page shows knowledge graph section", async ({ page }) => {
    await page.goto(`/academy/${academyId}`);
    await expect(page.getByText("Knowledge Graph", { exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole("application").getByText(conceptName, { exact: true })).toBeVisible();
    await expect(page.getByText("Loading knowledge graph...", { exact: true })).toHaveCount(0);
  });

  test("academy page back link navigates to browse", async ({ page }) => {
    await page.goto(`/academy/${academyId}`);
    await page.getByRole("link", { name: "Back to Academies" }).click();
    await expect(page).toHaveURL(/\/browse/);
    await expect(page.getByText(academyName, { exact: true })).toBeVisible();
  });

  test("academy continue flow dispatches to the enrolled course lesson", async ({ page }) => {
    await page.goto(`/academy/${academyId}`);
    const continueLink = page.getByRole("button", { name: "Continue Academy" });
    await expect(continueLink).toHaveAttribute("href", `/academy/${academyId}/study`);
    await continueLink.click();
    await expect(page).toHaveURL(`/study/${courseId}/lesson/${conceptId}`, {
      timeout: 15_000,
    });
    await expect(page.getByText("Knowledge Point 1 of 1", { exact: true })).toBeVisible();
    await expect(page.getByText(instruction, { exact: true })).toBeVisible();
    await expect(page.getByRole("complementary").getByRole("link", { name: "Dashboard", exact: true })).toBeVisible();
    await expect(page.getByRole("banner").getByRole("button", { name: /log out/i })).toBeVisible();
    await expect(page.getByText("Lesson Unavailable", { exact: true })).toHaveCount(0);
  });
});
