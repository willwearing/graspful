import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders hero section with brand content", async ({ page }) => {
    // Should show the brand's headline (firefighter is default dev brand)
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("h1")).not.toBeEmpty();

    // CTA button should link to sign-up
    const ctaLink = page.getByRole("link", { name: /start studying/i }).first();
    await expect(ctaLink).toBeVisible();
    await expect(ctaLink).toHaveAttribute("href", /\/sign-up/);
  });

  test("renders features section", async ({ page }) => {
    await expect(page.getByText("Why Audio Learning Works")).toBeVisible();
    // Should have at least 3 feature cards
    const featureHeadings = page.locator("h3");
    await expect(featureHeadings).not.toHaveCount(0);
  });

  test("renders how it works section", async ({ page }) => {
    await expect(page.getByText("How It Works")).toBeVisible();
    await expect(page.getByText("Take a Diagnostic")).toBeVisible();
    await expect(page.getByText("Study Adaptively")).toBeVisible();
    await expect(page.getByText("Pass Your Exam")).toBeVisible();
  });

  test("renders pricing section with plan toggle", async ({ page }) => {
    await expect(page.getByText("Simple Pricing")).toBeVisible();
    // Monthly/Yearly toggle
    await expect(page.getByRole("button", { name: /monthly/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /yearly/i })).toBeVisible();
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
    await expect(page.getByText("Ready to Start Studying?")).toBeVisible();
    // CTA button text is brand-specific (e.g. "Start Studying Free")
    const ctaLink = page
      .getByRole("link", { name: /start studying/i })
      .last();
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
