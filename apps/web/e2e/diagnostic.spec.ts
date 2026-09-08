import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { test, expect, type Page } from "@playwright/test";
import { getSupabaseUserIdByEmail, signUpAsCreator } from "./helpers/auth";

const prisma = new PrismaClient();
const orgId = randomUUID();
const orgSlug = `e2e-diagnostic-${orgId}`;
const academySlug = "arithmetic";
const diagnosticHref = `/learn/${orgSlug}/academies/${academySlug}/diagnostic`;

function requireLocalDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(databaseUrl).hostname)) {
    throw new Error("Diagnostic fixtures require a local DATABASE_URL");
  }
}

async function expectQuestion(page: Page, number: number) {
  await expect(page.getByRole("heading", { name: "Diagnostic Assessment" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(`Question ${number} of ~3`, { exact: true })).toBeVisible();
  await expect(page.getByRole("radiogroup")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Diagnostic Unavailable" })).toHaveCount(0);
}

async function answerCurrentQuestion(page: Page) {
  await page.getByRole("radio", { name: "4", exact: true }).click();
  await page.getByRole("button", { name: "Submit Answer", exact: true }).click();
}

test.describe("Diagnostic flow", () => {
  test.beforeAll(async () => {
    requireLocalDatabase();
    // Three independent concepts guarantee another question after one answer.
    // Each run owns its content so missing or changed demo seeds cannot hide a failure.
    await prisma.organization.create({
      data: {
        id: orgId,
        slug: orgSlug,
        name: "Diagnostic test academy",
        niche: "education",
        academies: {
          create: {
            slug: academySlug,
            name: "Arithmetic diagnostic",
            courses: {
              create: {
                orgId,
                slug: "arithmetic-basics",
                name: "Arithmetic basics",
                isPublished: true,
                concepts: {
                  create: ["2 + 2", "6 - 2", "2 × 2"].map((expression, index) => ({
                    orgId,
                    slug: `operation-${index}`,
                    name: `Arithmetic operation ${index + 1}`,
                    sortOrder: index,
                    knowledgePoints: {
                      create: {
                        slug: "calculate",
                        instructionText: `Calculate ${expression}. The result is 4.`,
                        workedExampleText: `${expression} = 4.`,
                        problems: {
                          create: {
                            authoredId: `operation-${index}-question`,
                            type: "multiple_choice",
                            questionText: `What is ${expression}?`,
                            options: ["4", "3", "5", "6"],
                            correctAnswer: 0,
                            explanation: `${expression} = 4.`,
                          },
                        },
                      },
                    },
                  })),
                },
              },
            },
          },
        },
      },
    });
  });

  test.beforeEach(async ({ page }) => {
    const email = await signUpAsCreator(page);
    const userId = await getSupabaseUserIdByEmail(email);
    await prisma.orgMembership.create({ data: { orgId, userId, role: "member" } });
  });

  test.afterAll(async () => {
    requireLocalDatabase();
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await prisma.$disconnect();
  });

  test("diagnostic loads and shows question 1", async ({ page }) => {
    await page.goto(diagnosticHref);
    await expectQuestion(page, 1);
    await expect(page.getByRole("button", { name: "I don't know this yet" })).toBeVisible();
  });

  test("answering a question advances to the next", async ({ page }) => {
    await page.goto(diagnosticHref);
    await expectQuestion(page, 1);
    await answerCurrentQuestion(page);
    await expectQuestion(page, 2);
  });

  test("session resumes after page reload", async ({ page }) => {
    await page.goto(diagnosticHref);
    await expectQuestion(page, 1);
    await answerCurrentQuestion(page);
    await expectQuestion(page, 2);

    const question = await page.getByText(/^What is /).textContent();
    await page.reload();

    await expectQuestion(page, 2);
    await expect(page.getByText(/^What is /)).toHaveText(question!);
    await expect(page.getByText("Question 1 of ~3", { exact: true })).toHaveCount(0);
  });

  test("'I don't know' advances to next question", async ({ page }) => {
    await page.goto(diagnosticHref);
    await expectQuestion(page, 1);
    await page.getByRole("button", { name: "I don't know this yet" }).click();
    await expectQuestion(page, 2);
  });

  test("completing the diagnostic shows the recorded results", async ({ page }) => {
    await page.goto(diagnosticHref);
    for (let number = 1; number <= 3; number += 1) {
      await expectQuestion(page, number);
      await page.getByRole("button", { name: "I don't know this yet" }).click();
    }

    await expect(page.getByRole("heading", { name: "Diagnostic Complete" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("You answered 3 questions across 3 concepts.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Go to Academy" })).toBeVisible();
  });
});
