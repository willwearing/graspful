import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders hero section with brand content", async ({ page }) => {
    // Should show a brand-specific headline
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("h1")).not.toBeEmpty();

    // Account creation stays available in the navigation
    const ctaLink = page.locator('a[href="/sign-up"]').first();
    await expect(ctaLink).toBeVisible();
    await expect(ctaLink).toHaveAttribute("href", /\/sign-up/);
  });

  test("renders features section", async ({ page }) => {
    const featureHeadings = page.locator("section h3");
    expect(await featureHeadings.count()).toBeGreaterThanOrEqual(3);
  });

  test("renders how it works section", async ({ page }) => {
    await expect(page.getByText("How it works")).toBeVisible();
    const steps = page.locator('section:has-text("How it works") h3');
    expect(await steps.count()).toBeGreaterThanOrEqual(3);
  });

  test("renders current billing availability", async ({ page }) => {
    await expect(page.locator("#pricing")).toBeVisible();
    await expect(page.getByText("Paid subscriptions are not available yet.", { exact: true })).toBeVisible();
    await expect(page.locator("#pricing").getByRole("link", { name: "Create free account" })).toBeVisible();
  });

  test("renders FAQ section with accordion", async ({ page }) => {
    await expect(
      page.getByText("Frequently asked questions")
    ).toBeVisible();
    // FAQ items should be clickable
    const faqButtons = page.locator("button").filter({ hasText: /\?$/ });
    const count = await faqButtons.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test("renders CTA section at bottom", async ({ page }) => {
    const ctaLink = page.locator('a[href="/sign-up"]').last();
    await expect(ctaLink).toBeVisible();
  });

  test("navigation has brand name and auth links", async ({ page }) => {
    // Nav should have sign-in and get-started links
    await expect(
      page.getByRole("link", { name: /sign in/i }).first()
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /get started/i }).first()
    ).toBeVisible();
  });
});
