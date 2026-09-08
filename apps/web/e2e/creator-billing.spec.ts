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
    await expect(page.getByText("Current plan")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("free", { exact: true })).toBeVisible();
    await expect(page.getByText("Active")).toBeVisible();
  });

  test("explains unavailable billing until Stripe is configured", async ({ page }) => {
    await page.goto("/settings");
    await expect(
      page.getByText("Paid subscriptions are not available yet.", { exact: true })
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: /Upgrade to Individual/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Manage subscription/i })).toHaveCount(0);
  });
});
