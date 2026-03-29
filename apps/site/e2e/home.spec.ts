import { expect, test } from "@playwright/test";

test.describe("Graspful site", () => {
  test("renders the new homepage and key navigation", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: /the best place to run adaptive learning products and guidance/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Primary").getByRole("link", { name: "Pricing" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /popular on graspful/i }),
    ).toBeVisible();
  });

  test("search routes to search results", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("searchbox", { name: /search/i }).fill("pricing");
    await page.getByRole("button", { name: /search graspful/i }).click();

    await expect(page).toHaveURL(/\/search\?q=pricing/);
    await expect(
      page
        .locator(".search-result-card")
        .getByRole("link", { name: "Pricing" })
        .first(),
    ).toBeVisible();
  });

  test("dark mode persists across navigation", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /switch to dark mode/i }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.getByRole("link", { name: /how it works/i }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(
      page.getByRole("heading", { name: /how graspful works/i }),
    ).toBeVisible();
  });

  test("pricing page is reachable from homepage", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /^pricing$/i }).first().click();

    await expect(page).toHaveURL(/\/pricing/);
    await expect(
      page.getByRole("heading", { name: /pricing and payouts/i }),
    ).toBeVisible();
    await expect(page.getByText(/creator share/i)).toBeVisible();
  });
});
