import { expect, test } from "@playwright/test";

test.describe("Graspful site", () => {
  test("renders the course workflow and a labeled lesson example", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Turn your source material into lessons and practice.");
    await expect(page.getByRole("heading", { name: "From course files to learner practice" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Author, review, then publish" })).toBeVisible();
    await expect(page.getByText(/Importing without --publish saves a draft/)).toBeVisible();
    await expect(page.getByText(/Confirm that the response contains published: true/)).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Illustrative lesson" })).toBeVisible();

    await page.getByRole("button", { name: "2/9" }).click();
    await expect(page.getByText(/Convert 1\/3 to 2\/6 first/)).toBeVisible();
    await page.getByRole("button", { name: "1/2" }).click();
    await expect(page.getByText(/Correct\. 1\/3 equals 2\/6/)).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("home-desktop.png"), fullPage: true });
  });

  test("hero CTA routes to sign-up", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("main").getByRole("link", { name: "Create free account", exact: true })).toHaveAttribute("href", "/sign-up");
  });

  test("pricing describes unavailable paid subscriptions", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /^pricing$/i }).first().click();
    await expect(page).toHaveURL(/\/pricing/);
    await expect(page.getByRole("heading", { name: "Pricing", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Paid subscriptions are not available yet" })).toBeVisible();
    await expect(page.locator("main").getByRole("link", { name: "Create free account", exact: true })).toHaveAttribute("href", "/sign-up");
  });

  test("how it works explains learner estimates and review", async ({ page }) => {
    const response = await page.goto("/how-graspful-works");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "How Graspful works" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Return for review" })).toBeVisible();
    await expect(page.getByText(/Learner progress is an estimate/)).toBeVisible();
  });

  test("mobile home fits the viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const width = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }));
    expect(width.content).toBeLessThanOrEqual(width.viewport);
    await page.screenshot({ path: test.info().outputPath("home-mobile.png"), fullPage: true });
  });

  test("theme toggle is present", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /switch to/i })).toBeVisible();
  });
});
