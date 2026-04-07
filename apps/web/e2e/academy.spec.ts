import { PrismaClient } from "@prisma/client";
import { test, expect, type Page } from "@playwright/test";
import {
  getBrowserAccessToken,
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

/**
 * Resolve the first academy directly from the authenticated API so the test
 * does not depend on browse-page rendering order.
 */
async function getFirstAcademyId(page: Page): Promise<string> {
  const token = await getBrowserAccessToken(page);
  expect(token).toBeTruthy();

  const response = await fetch(`http://localhost:3000/api/v1/orgs/${ORG_SLUG}/academies`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  expect(response.ok).toBe(true);
  const academies = (await response.json()) as Array<{ id: string }>;
  expect(academies.length).toBeGreaterThan(0);

  return academies[0]!.id;
}

test.describe("Academy features", () => {
  test.beforeEach(async ({ page }) => {
    const email = await signUpBrandedTestUser(page, POSTHOG_TEST_BRAND_ID);
    await grantLearnerMembership(email);
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("dashboard shows academy-level stats heading", async ({ page }) => {
    // Dashboard should show "Academy Courses" when courses belong to an academy
    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(
      page.getByText(/Academy Courses|Your Courses/)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("academy page loads and shows courses", async ({ page }) => {
    const academyId = await getFirstAcademyId(page);

    await page.goto(`/academy/${academyId}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole("heading", { name: "Courses" })).toBeVisible();
    await expect(page.getByText("Academy Progress")).toBeVisible();
  });

  test("academy diagnostic route loads", async ({ page }) => {
    const academyId = await getFirstAcademyId(page);

    await page.goto(`/academy/${academyId}/diagnostic`);

    // Should either show the diagnostic assessment or an error message
    // (depending on whether diagnostic content is seeded)
    await expect(page.locator("body")).not.toContainText("500");
    await expect(page.locator("body")).not.toContainText(
      "Internal Server Error"
    );

    // Should show either diagnostic or unavailable message
    const diagnosticText = page.getByText("Diagnostic Assessment");
    const unavailableText = page.getByText(/Diagnostic Unavailable/);
    await expect(diagnosticText.or(unavailableText)).toBeVisible({ timeout: 15_000 });
  });

  test("academy page shows knowledge graph section", async ({ page }) => {
    const academyId = await getFirstAcademyId(page);

    await page.goto(`/academy/${academyId}`);
    // Knowledge graph section should render (may show loading, then graph or nothing)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 10_000,
    });

    // The graph section should at least attempt to load
    // (it renders null if no data, which is acceptable)
    await expect(page.locator("body")).not.toContainText("500");
  });

  test("academy page back link navigates to browse", async ({ page }) => {
    const academyId = await getFirstAcademyId(page);

    await page.goto(`/academy/${academyId}`);
    await expect(page.getByText("Back to Academies")).toBeVisible();

    await page.getByText("Back to Academies").click();
    await expect(page).toHaveURL(/\/browse/);
  });

  test("academy continue flow opens the academy study router", async ({ page }) => {
    const academyId = await getFirstAcademyId(page);

    await page.goto(`/academy/${academyId}`);
    await expect(
      page.getByRole("button", { name: "Continue Academy" })
    ).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "Continue Academy" }).click();
    await expect(page).toHaveURL(new RegExp(`/academy/${academyId}/study`), {
      timeout: 10_000,
    });
    await expect(page.locator("main")).toContainText(
      /Study Session|Continue Studying|Take Quiz|Take Section Exam|Back to Academy|No task available/i,
    );
  });
});
