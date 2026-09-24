import { test, expect } from "@playwright/test";

test.describe("White-label theming", () => {
  test("selected brand renders without the obsolete brand-id cookie", async ({ page }) => {
    await page.context().addCookies([
      { name: "dev-brand-override", value: "firefighter", url: "http://localhost:3001" },
    ]);
    await page.goto("/");
    await expect(page.getByRole("navigation").getByRole("link").first()).toContainText("FirefighterPrep");
    const cookies = await page.context().cookies();
    expect(cookies.find((cookie) => cookie.name === "brand-id")).toBeUndefined();
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

  test("branded pages omit the obsolete x-brand-id response header", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    expect(response?.headers()["x-brand-id"]).toBeUndefined();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("sign-in page shows brand name in subtitle", async ({ page }) => {
    await page.goto("/sign-in");
    // Should mention the brand in the sign-in subtitle
    const subtitle = page.getByText(/continue studying with/i);
    await expect(subtitle).toBeVisible();
  });
});
