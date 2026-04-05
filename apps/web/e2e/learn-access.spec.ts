import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { getSupabaseUserIdByEmail, signUpAsCreator } from "./helpers/auth";

const prisma = new PrismaClient();

async function grantLearnerMembership(email: string, orgSlug: string) {
  const userId = await getSupabaseUserIdByEmail(email);
  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true },
  });

  if (!org) {
    throw new Error(`Organization ${orgSlug} not found`);
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

test.afterAll(async () => {
  await prisma.$disconnect();
});

test.describe("Platform learner access", () => {
  test("signing in from a /learn redirect does not auto-enroll an unentitled user", async ({
    page,
  }) => {
    const email = await signUpAsCreator(page);

    await page.goto("/learn/posthog-tam");
    await expect(page.getByText(/could not be found/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Learning Hub")).toHaveCount(0);
  });

  test("an entitled learner on /learn sees authenticated chrome and academy content", async ({
    page,
  }) => {
    const email = await signUpAsCreator(page);
    await grantLearnerMembership(email, "posthog-tam");

    await page.goto("/learn/posthog-tam");

    await expect(page.getByRole("link", { name: /learning hub/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("complementary").getByRole("button", { name: /log out/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("banner").getByRole("button", { name: /log out/i }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Learning Hub" })).toBeVisible();
    await expect(page.getByText("PostHog TAM Academy")).toBeVisible();
  });
});
