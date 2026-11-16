import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { test, expect, type Page } from "@playwright/test";
import { getSupabaseUserIdByEmail, signUpAsCreator } from "./helpers/auth";

const prisma = new PrismaClient();
const orgId = randomUUID();
const orgSlug = `e2e-diagnostic-${orgId}`;
const academySlug = "arithmetic";
const diagnosticHref = `/learn/${orgSlug}/academies/${academySlug}/diagnostic`;
const courseSlug = "arithmetic-basics";
const courseHref = `/learn/${orgSlug}/courses/${courseSlug}`;
const largeAcademySlug = "large-diagnostic";

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
                slug: courseSlug,
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
    // Scenario questions in an academy-sized graph reproduce the reported path.
    await prisma.academy.create({
      data: {
        orgId,
        slug: largeAcademySlug,
        name: "Large diagnostic academy",
        courses: {
          create: {
            orgId, slug: "large-course", name: "Large scenario course", isPublished: true,
            concepts: {
              create: Array.from({ length: 120 }, (_, index) => ({
                orgId, slug: `scenario-${index}`, name: `Scenario concept ${index + 1}`, sortOrder: index,
                knowledgePoints: {
                  create: {
                    slug: "calculate", instructionText: "Calculate the remaining count.",
                    workedExampleText: "Four items remain.",
                    problems: {
                      create: {
                        authoredId: `scenario-${index}-question`, type: "scenario",
                        questionText: `You have ${index + 4} items and remove ${index}. How many remain?`,
                        options: ["4", "3", "5", "6"], correctAnswer: 0, explanation: "Four items remain.",
                      },
                    },
                  },
                },
              })),
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
    await page.getByRole("button", { name: "Start Diagnostic Assessment" }).click();
    await expectQuestion(page, 1);
    await expect(page.getByRole("button", { name: "I don't know this yet" })).toBeVisible();
  });

  test("answering a question advances to the next", async ({ page }) => {
    await page.goto(diagnosticHref);
    await page.getByRole("button", { name: "Start Diagnostic Assessment" }).click();
    await expectQuestion(page, 1);
    await answerCurrentQuestion(page);
    await expectQuestion(page, 2);
  });

  test("session resumes after page reload", async ({ page }) => {
    await page.goto(diagnosticHref);
    await page.getByRole("button", { name: "Start Diagnostic Assessment" }).click();
    await expectQuestion(page, 1);
    await answerCurrentQuestion(page);
    await expectQuestion(page, 2);

    const question = await page.getByText(/^What is /).textContent();
    await page.reload();
    await page.getByRole("button", { name: "Start Diagnostic Assessment" }).click();

    await expectQuestion(page, 2);
    await expect(page.getByText(/^What is /)).toHaveText(question!);
    await expect(page.getByText("Question 1 of ~3", { exact: true })).toHaveCount(0);
  });

  test("'I don't know' advances to next question", async ({ page }) => {
    await page.goto(diagnosticHref);
    await page.getByRole("button", { name: "Start Diagnostic Assessment" }).click();
    await expectQuestion(page, 1);
    await page.getByRole("button", { name: "I don't know this yet" }).click();
    await expectQuestion(page, 2);
  });

  test("completing the diagnostic shows the recorded results", async ({ page }) => {
    await page.goto(diagnosticHref);
    await page.getByRole("button", { name: "Start Diagnostic Assessment" }).click();
    await expectQuestion(page, 1);
    // Starting enrolls the learner. Now navigate from the academy so returning
    // after completion exercises a cached server-rendered page.
    await page.goto(`/learn/${orgSlug}/academies/${academySlug}`);
    await page.getByRole("button", { name: "Take Diagnostic", exact: true }).click();
    await page.getByRole("button", { name: "Start Diagnostic Assessment" }).click();
    for (let number = 1; number <= 3; number += 1) {
      await expectQuestion(page, number);
      if (number === 3) {
        await answerCurrentQuestion(page);
        await expect(page.getByText("Correct!", { exact: true })).toBeVisible();
      } else {
        await page.getByRole("button", { name: "I don't know this yet" }).click();
      }
    }

    await expect(page.getByRole("heading", { name: "Diagnostic Complete" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("You answered 3 questions across 3 concepts.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Go to Academy" })).toBeVisible();
    await page.getByRole("button", { name: "Go to Academy" }).click();
    await expect(page).toHaveURL(`/learn/${orgSlug}/academies/${academySlug}`);
    // A reload after the committed final answer must let the learner return.
    await page.goto(diagnosticHref);
    await page.getByRole("button", { name: "Start Diagnostic Assessment" }).click();
    await expect(page).toHaveURL(`/learn/${orgSlug}/academies/${academySlug}`);
    await page.getByRole("button", { name: "Continue Academy", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/learn/${orgSlug}/courses/${courseSlug}/study/lesson/`));
    await page.getByRole("button", { name: "Start Lesson" }).click();
    await expect(page.getByText("Knowledge Point 1 of 1", { exact: true })).toBeVisible();
  });

  test("a scenario answer in a large academy persists and resumes", async ({ page }) => {
    await page.goto(`/learn/${orgSlug}/academies/${largeAcademySlug}/diagnostic`);
    await page.getByRole("button", { name: "Start Diagnostic Assessment" }).click();
    await expect(page.getByText("Question 1 of ~60", { exact: true })).toBeVisible();
    await expect(page.getByText("Scenario", { exact: true })).toBeVisible();
    await answerCurrentQuestion(page);
    await expect(page.getByText("Question 2 of ~60", { exact: true })).toBeVisible();
    const question = await page.getByText(/^You have /).textContent();
    await page.reload();
    await page.getByRole("button", { name: "Start Diagnostic Assessment" }).click();
    await expect(page.getByText("Question 2 of ~60", { exact: true })).toBeVisible();
    await expect(page.getByText(/^You have /)).toHaveText(question!);
  });

  test("a failed diagnostic start can be retried", async ({ page }) => {
    await page.route("**/diagnostic/start", async (route) => {
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Temporary server error" }) });
      await page.unroute("**/diagnostic/start");
    });
    await page.goto(diagnosticHref);
    await page.getByRole("button", { name: "Start Diagnostic Assessment" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Temporary server error" })).toBeVisible();
    await page.getByRole("button", { name: "Try again" }).click();
    await expectQuestion(page, 1);
  });

  test("a lost answer response resumes without answering the next question twice", async ({ page }) => {
    await page.goto(diagnosticHref);
    await page.getByRole("button", { name: "Start Diagnostic Assessment" }).click();
    await expectQuestion(page, 1);
    let sessionId = "";
    await page.route("**/diagnostic/answer", async (route) => {
      sessionId = route.request().postDataJSON().sessionId;
      const response = await route.fetch();
      expect(response.ok(), await response.text()).toBe(true);
      await route.abort();
      await page.unroute("**/diagnostic/answer");
    });
    await page.getByRole("button", { name: "I don't know this yet" }).click();
    await expect(page.getByText("Something went wrong. Please try again.")).toBeVisible();
    await page.getByRole("button", { name: "I don't know this yet" }).click();
    await expectQuestion(page, 2);
    const session = await prisma.diagnosticSession.findUniqueOrThrow({ where: { id: sessionId } });
    expect(session.questionCount).toBe(1);
    expect(await prisma.problemAttempt.count({ where: { userId: session.userId } })).toBe(1);
  });

  test("a lost final answer response recovers completed results without a second attempt", async ({ page }) => {
    await page.goto(diagnosticHref);
    await page.getByRole("button", { name: "Start Diagnostic Assessment" }).click();
    for (let number = 1; number <= 2; number += 1) {
      await expectQuestion(page, number);
      await page.getByRole("button", { name: "I don't know this yet" }).click();
    }
    await expectQuestion(page, 3);
    let sessionId = "";
    await page.route("**/diagnostic/answer", async (route) => {
      sessionId = route.request().postDataJSON().sessionId;
      const response = await route.fetch();
      expect(response.ok(), await response.text()).toBe(true);
      expect((await response.json()).isComplete).toBe(true);
      await route.abort();
      await page.unroute("**/diagnostic/answer");
    });
    await page.getByRole("button", { name: "I don't know this yet" }).click();
    await expect(page.getByText("Something went wrong. Please try again.")).toBeVisible();
    await page.getByRole("button", { name: "I don't know this yet" }).click();
    await expect(page.getByText("You answered 3 questions across 3 concepts.")).toBeVisible();
    const session = await prisma.diagnosticSession.findUniqueOrThrow({ where: { id: sessionId } });
    expect(session.status).toBe("completed");
    expect(session.questionCount).toBe(3);
    expect(await prisma.problemAttempt.count({ where: { userId: session.userId } })).toBe(3);
  });

  test("course diagnostic completion returns to an updated course and allows a lesson", async ({ page }) => {
    await page.goto(courseHref);
    await expect(page.getByRole("button", { name: "Take Diagnostic", exact: true })).toBeVisible();
    // Use the course-scoped endpoint too; the course CTA normally uses its academy.
    await page.goto(`${courseHref}/diagnostic`);
    let resultRequests = 0;
    await page.route("**/diagnostic/result/**", async (route) => { resultRequests += 1; await route.abort(); });
    await page.getByRole("button", { name: "Start Diagnostic Assessment" }).click();
    for (let number = 1; number <= 3; number += 1) {
      await expectQuestion(page, number);
      if (number === 3) {
        await answerCurrentQuestion(page);
        await expect(page.getByText("Correct!", { exact: true })).toBeVisible();
      } else {
        await page.getByRole("button", { name: "I don't know this yet" }).click();
      }
    }
    await expect(page.getByText("You answered 3 questions across 3 concepts.")).toBeVisible();
    expect(resultRequests).toBe(0);
    await page.getByRole("button", { name: "Go to Course" }).click();
    await expect(page).toHaveURL(courseHref);
    await page.goto(`${courseHref}/diagnostic`);
    await page.getByRole("button", { name: "Start Diagnostic Assessment" }).click();
    await expect(page).toHaveURL(courseHref);
    await page.getByRole("button", { name: "Continue Studying", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/learn/${orgSlug}/courses/${courseSlug}/study/lesson/`));
    await page.getByRole("button", { name: "Start Lesson" }).click();
    await expect(page.getByText("Knowledge Point 1 of 1", { exact: true })).toBeVisible();
  });
});
