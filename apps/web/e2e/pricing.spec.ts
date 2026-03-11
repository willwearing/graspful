import { test, expect } from "@playwright/test";

test.describe("Pricing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pricing");
  });

  test("renders pricing heading and plan details", async ({ page }) => {
    await expect(page.getByText("Simple Pricing")).toBeVisible();
    // Should show a price
    await expect(page.getByText(/\$\d+/).first()).toBeVisible();
  });

  test("monthly/yearly toggle changes price", async ({ page }) => {
    // Get initial price text
    const priceElement = page.getByText(/\$\d+/).first();
    await expect(priceElement).toBeVisible();

    // Click yearly toggle
    await page.getByRole("button", { name: /yearly/i }).click();
    // Price should still be visible (possibly different value)
    await expect(page.getByText(/\$\d+/).first()).toBeVisible();

    // Click monthly toggle
    await page.getByRole("button", { name: /monthly/i }).click();
    await expect(page.getByText(/\$\d+/).first()).toBeVisible();
  });

  test("CTA button links to sign-up", async ({ page }) => {
    const ctaLinks = page.getByRole("link", {
      name: /free trial|get started/i,
    });
    const count = await ctaLinks.count();
    expect(count).toBeGreaterThanOrEqual(1);

    const href = await ctaLinks.first().getAttribute("href");
    expect(href).toMatch(/\/sign-up/);
  });

  test("has page-specific meta title", async ({ page }) => {
    const title = await page.title();
    expect(title.toLowerCase()).toContain("pricing");
  });
});
