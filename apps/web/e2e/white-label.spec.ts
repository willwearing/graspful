import { test, expect } from "@playwright/test";

test.describe("White-label theming", () => {
  test("brand cookie is set on page load", async ({ page }) => {
    await page.goto("/");
    const cookies = await page.context().cookies();
    const brandCookie = cookies.find((c) => c.name === "brand-id");
    expect(brandCookie).toBeDefined();
    expect(brandCookie!.value).toBeTruthy();
  });

  test("CSS custom properties are injected for theming", async ({ page }) => {
    await page.goto("/");
    // Check that CSS variables are set on the root element
    const primaryColor = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--primary")
        .trim()
    );
    expect(primaryColor).toBeTruthy();

    const backgroundColor = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--background")
        .trim()
    );
    expect(backgroundColor).toBeTruthy();
  });

  test("brand name appears in navigation", async ({ page }) => {
    await page.goto("/");
    // The nav should contain the brand name (e.g., "FirefighterPrep")
    const nav = page.getByRole("navigation");
    await expect(nav).toBeVisible();
    // Brand name link should go to home
    const homeLink = nav.getByRole("link").first();
    await expect(homeLink).toHaveAttribute("href", "/");
  });

  test("x-brand-id header is set in responses", async ({ page }) => {
    const response = await page.goto("/");
    const brandHeader = response?.headers()["x-brand-id"];
    expect(brandHeader).toBeTruthy();
  });

  test("sign-in page shows brand name in subtitle", async ({ page }) => {
    await page.goto("/sign-in");
    // Should mention the brand in the sign-in subtitle
    const subtitle = page.getByText(/continue studying with/i);
    await expect(subtitle).toBeVisible();
  });
});
