import { test, expect } from "@playwright/test";

const GRASPFUL_BRAND = "graspful";

async function signUpAsCreator(page: import("@playwright/test").Page) {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.example.com`;
  const password = "TestPassword123!";

  await page.context().addCookies([
    { name: "dev-brand-override", value: GRASPFUL_BRAND, domain: "localhost", path: "/" },
  ]);

  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await page.waitForURL(/\/creator/, { timeout: 15_000 });
  return email;
}

test.describe("Creator Billing", () => {
  test.beforeEach(async ({ page }) => {
    await signUpAsCreator(page);
  });

  test("billing card is visible on settings page", async ({ page }) => {
    await page.goto("/settings");
    await expect(
      page.getByText("Billing", { exact: true })
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Manage your subscription")).toBeVisible();
  });

  test("shows free plan with active status", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("Current Plan")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("free", { exact: false })).toBeVisible();
    await expect(page.getByText("Active")).toBeVisible();
  });

  test("upgrade button is visible for free plan", async ({ page }) => {
    await page.goto("/settings");
    await expect(
      page.getByRole("button", { name: /Upgrade to Individual/i })
    ).toBeVisible({ timeout: 10_000 });
  });
});
