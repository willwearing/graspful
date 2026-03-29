import { expect, test } from "@playwright/test";

test.describe("Graspful site", () => {
  test("renders the homepage hero and key navigation", async ({ page }) => {
    await page.goto("/");

    // Hero headline (word-by-word spans)
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).toContainText("Build courses where students actually learn");

    await expect(
      page.getByText("Pricing").first(),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /what we do for you/i }),
    ).toBeVisible();
  });

  test("hero CTA routes to sign-up", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("link", { name: /start building free/i }).first(),
    ).toHaveAttribute("href", /sign-up/);
  });

  test("navigates to pricing from homepage", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: /^pricing$/i }).first().click();
    await expect(page).toHaveURL(/\/pricing/);
    await expect(
      page.getByRole("heading", { name: /pricing/i }),
    ).toBeVisible();
  });

  test("theme toggle is present", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("button", { name: /switch to/i }),
    ).toBeVisible();
  });
});
