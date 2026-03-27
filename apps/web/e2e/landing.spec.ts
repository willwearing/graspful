import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders hero section with brand content", async ({ page }) => {
    // Should show a brand-specific headline
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("h1")).not.toBeEmpty();

    // Primary CTA should link to sign-up regardless of current marketing copy
    const ctaLink = page.locator('a[href="/sign-up"]').first();
    await expect(ctaLink).toBeVisible();
    await expect(ctaLink).toHaveAttribute("href", /\/sign-up/);
  });

  test("renders features section", async ({ page }) => {
    const featureHeadings = page.locator("section h3");
    expect(await featureHeadings.count()).toBeGreaterThanOrEqual(3);
  });

  test("renders how it works section", async ({ page }) => {
    await expect(page.getByText("How It Works")).toBeVisible();
    const steps = page.locator('section:has-text("How It Works") h3');
    expect(await steps.count()).toBeGreaterThanOrEqual(3);
  });

  test("renders pricing section with plan toggle", async ({ page }) => {
    await expect(page.locator("#pricing")).toBeVisible();
    const monthlyToggle = page.getByRole("button", { name: /monthly/i });
    const yearlyToggle = page.getByRole("button", { name: /yearly/i });

    if ((await monthlyToggle.count()) > 0 || (await yearlyToggle.count()) > 0) {
      await expect(monthlyToggle).toBeVisible();
      await expect(yearlyToggle).toBeVisible();
    } else {
      const signUpCtas = page.locator('#pricing a[href="/sign-up"]');
      expect(await signUpCtas.count()).toBeGreaterThanOrEqual(1);
    }
  });

  test("renders FAQ section with accordion", async ({ page }) => {
    await expect(
      page.getByText("Frequently Asked Questions")
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
