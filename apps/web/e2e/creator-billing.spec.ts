import { test, expect } from "@playwright/test";
import { signUpAsCreator } from "./helpers/auth";

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
