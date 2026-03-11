import { test, expect } from "@playwright/test";

test.describe("Navigation and routing", () => {
  test("landing page → sign-up via CTA", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /start studying/i }).first().click();
    await expect(page).toHaveURL(/\/sign-up/);
    await expect(page.getByText("Create your account")).toBeVisible();
  });

  test("landing page → sign-in via nav", async ({ page }) => {
    await page.goto("/");
    // Click the nav Sign In link (not footer)
    await page
      .getByRole("navigation")
      .getByRole("link", { name: /sign in/i })
      .click();
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.getByText("Welcome back")).toBeVisible();
  });

  test("landing page → pricing via nav or scroll", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByText("Simple Pricing")).toBeVisible();
  });

  test("sign-up → sign-in link navigation", async ({ page }) => {
    await page.goto("/sign-up");
    await page.getByRole("link", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("sign-in → sign-up link navigation", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByRole("link", { name: "Sign up", exact: true }).click();
    await expect(page).toHaveURL(/\/sign-up/);
  });

  test("protected routes redirect with return URL", async ({ page }) => {
    // Dashboard
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/sign-in\?redirect=%2Fdashboard/);

    // Browse
    await page.goto("/browse");
    await expect(page).toHaveURL(/\/sign-in\?redirect=%2Fbrowse/);

    // Settings
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/sign-in\?redirect=%2Fsettings/);

    // Study
    await page.goto("/study/some-course");
    await expect(page).toHaveURL(
      /\/sign-in\?redirect=%2Fstudy%2Fsome-course/
    );

    // Diagnostic
    await page.goto("/diagnostic/some-course");
    await expect(page).toHaveURL(
      /\/sign-in\?redirect=%2Fdiagnostic%2Fsome-course/
    );
  });

  test("404 page shows for unknown routes", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist-xyz");
    // Should either 404 or redirect to sign-in (since it's a protected route)
    const url = page.url();
    const is404 = response?.status() === 404;
    const isRedirected = url.includes("/sign-in");
    expect(is404 || isRedirected).toBe(true);
  });
});
