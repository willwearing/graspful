import { test, expect } from "@playwright/test";

test.describe("Pricing page", () => {
  test.beforeEach(async ({ page }) => { await page.goto("/pricing"); });
  test("shows free account access and paid billing availability", async ({ page }) => {
    await expect(page.locator("#pricing h1")).toHaveText("Start with a free account");
    await expect(page.getByText("Paid subscriptions are not available yet.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /monthly|yearly|trial/i })).toHaveCount(0);
  });
  test("free account CTA links to sign-up", async ({ page }) => {
    await expect(page.locator("#pricing").getByRole("link", { name: "Create free account" })).toHaveAttribute("href", /\/sign-up/);
  });
  test("has page-specific meta title", async ({ page }) => { await expect(page).toHaveTitle(/pricing/i); });
});
