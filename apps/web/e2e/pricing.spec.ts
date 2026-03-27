import { test, expect } from "@playwright/test";

test.describe("Pricing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pricing");
  });

  test("renders pricing heading and plan details", async ({ page }) => {
    await expect(page.locator("#pricing h2")).toBeVisible();
    const priceSignals = page.getByText(/\$\d+|70\/30/);
    await expect(priceSignals.first()).toBeVisible();
  });

  test("pricing controls or creator plan cards render", async ({ page }) => {
    const monthlyToggle = page.getByRole("button", { name: /monthly/i });
    const yearlyToggle = page.getByRole("button", { name: /yearly/i });

    if ((await monthlyToggle.count()) > 0 || (await yearlyToggle.count()) > 0) {
      const priceElement = page.getByText(/\$\d+/).first();
      await expect(priceElement).toBeVisible();
      await yearlyToggle.click();
      await expect(page.getByText(/\$\d+/).first()).toBeVisible();
      await monthlyToggle.click();
      await expect(page.getByText(/\$\d+/).first()).toBeVisible();
      return;
    }

    const signUpCtas = page.locator('#pricing a[href="/sign-up"]');
    expect(await signUpCtas.count()).toBeGreaterThanOrEqual(2);
  });

  test("CTA button links to sign-up", async ({ page }) => {
    const ctaLinks = page.getByRole("link", {
      name: /free trial|get started|start building|start earning|start learning/i,
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
