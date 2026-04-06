import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { getBrowserAccessToken, getSupabaseUserIdByEmail, signUpAsCreator } from "./helpers/auth";

const prisma = new PrismaClient();
const ORG_SLUG = "posthog-tam";

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

async function apiGetJson(
  request: APIRequestContext,
  token: string,
  path: string,
) {
  const res = await request.get(`http://localhost:3000/api/v1${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok()) {
    throw new Error(`GET ${path} failed: ${res.status()} ${await res.text()}`);
  }

  return res.json();
}

async function answerCurrentQuestion(page: Page) {
  const optionButton = page.locator("button.rounded-lg.border-2").first();
  const submitButton = page.getByRole("button", { name: "Submit Answer" });

  if (await optionButton.isVisible({ timeout: 1_000 }).catch(() => false)) {
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

async function completeLearnDiagnosticFast(page: Page, courseSlug: string) {
  await page.goto(`/learn/${ORG_SLUG}/courses/${courseSlug}`);
  await page.getByRole("button", { name: "Take Diagnostic" }).click();

  await expect(page).toHaveURL(/\/diagnostic/, { timeout: 15_000 });
  await expect(page.getByText("Diagnostic Assessment")).toBeVisible({
    timeout: 15_000,
  });

  for (let i = 0; i < 30; i += 1) {
    const doneIndicator = page.getByText(/Results|Diagnostic Complete|Study Now/i);
    if (await doneIndicator.isVisible({ timeout: 500 }).catch(() => false)) {
      break;
    }

    await answerCurrentQuestion(page);
  }
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test.describe("Branded learn deep routes", () => {
  test("review route loads on the branded /learn surface", async ({
    page,
    request,
  }) => {
    const email = await signUpAsCreator(page);
    await grantLearnerMembership(email);

    await page.goto(`/learn/${ORG_SLUG}`);
    const courseLink = page.locator(`a[href^="/learn/${ORG_SLUG}/courses/"]`).first();
    await expect(courseLink).toBeVisible({ timeout: 15_000 });

    const courseHref = await courseLink.getAttribute("href");
    const courseSlug = courseHref?.split("/courses/")[1]?.split("/")[0];
    expect(courseSlug).toBeTruthy();

    await completeLearnDiagnosticFast(page, courseSlug!);

    const token = await getBrowserAccessToken(page);
    expect(token).toBeTruthy();

    const course = (await apiGetJson(
      request,
      token!,
      `/orgs/${ORG_SLUG}/courses/slug/${courseSlug}`,
    )) as { id: string };
    const graph = (await apiGetJson(
      request,
      token!,
      `/orgs/${ORG_SLUG}/courses/${course.id}/graph`,
    )) as { concepts: Array<{ id: string }> };

    const conceptId = graph.concepts[0]?.id;
    expect(conceptId).toBeTruthy();

    await page.goto(`/learn/${ORG_SLUG}/courses/${courseSlug}/study/review/${conceptId}`);

    await expect(
      page.getByRole("heading", { name: "Concept Review" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Problem 1 of/i)).toBeVisible({ timeout: 15_000 });
  });

  test("quiz route loads on the branded /learn surface", async ({
    page,
  }) => {
    const email = await signUpAsCreator(page);
    await grantLearnerMembership(email);

    await page.goto(`/learn/${ORG_SLUG}`);
    const courseLink = page.locator(`a[href^="/learn/${ORG_SLUG}/courses/"]`).first();
    await expect(courseLink).toBeVisible({ timeout: 15_000 });

    const courseHref = await courseLink.getAttribute("href");
    const courseSlug = courseHref?.split("/courses/")[1]?.split("/")[0];
    expect(courseSlug).toBeTruthy();

    await completeLearnDiagnosticFast(page, courseSlug!);
    await page.goto(`/learn/${ORG_SLUG}/courses/${courseSlug}/study/quiz`);

    await expect(page.getByRole("heading", { name: "Quiz" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/Question 1 of/i)).toBeVisible({ timeout: 15_000 });
  });
});
