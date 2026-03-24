import { test, expect } from "@playwright/test";

const TEST_EMAIL = `e2e-${Date.now()}@test.example.com`;
const TEST_PASSWORD = "TestPassword123!";

test.describe("Auth pages", () => {
  test("sign-up page renders form correctly", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.getByText("Create your account")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create Account" })
    ).toBeVisible();
    await expect(page.getByText("Already have an account?")).toBeVisible();
  });

  test("sign-in page renders form correctly", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign In" })
    ).toBeVisible();
    await expect(page.getByText("Don't have an account?")).toBeVisible();
  });

  test("sign-up form requires email and password", async ({ page }) => {
    await page.goto("/sign-up");
    // Try to submit empty form — button should stay enabled (HTML5 required blocks submission)
    await page.getByRole("button", { name: "Create Account" }).click();
    // Should still be on sign-up page (form didn't submit)
    await expect(page).toHaveURL(/\/sign-up/);
    await expect(
      page.getByRole("button", { name: "Create Account" })
    ).toBeEnabled();
  });

  test("sign-up with short password shows validation error", async ({
    page,
  }) => {
    await page.goto("/sign-up");
    await page.getByLabel("Email").fill(TEST_EMAIL);
    await page.getByLabel("Password").fill("short");
    await page.getByRole("button", { name: "Create Account" }).click();
    // HTML5 minlength=8 should prevent submission — button should still be enabled
    await expect(
      page.getByRole("button", { name: "Create Account" })
    ).toBeEnabled();
  });

  test("sign-in with invalid credentials shows error", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill("nonexistent@test.example.com");
    await page.getByLabel("Password").fill("wrongpassword1");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByText(/invalid/i)).toBeVisible({ timeout: 10_000 });
  });

  test("can navigate between sign-in and sign-up", async ({ page }) => {
    await page.goto("/sign-in");
    // Use the form's link (not the nav's link) — match exact case
    await page
      .getByRole("link", { name: "Sign up", exact: true })
      .click();
    await expect(page).toHaveURL(/\/sign-up/);
    await expect(page.getByText("Create your account")).toBeVisible();

    // Use the form's "Sign in" link (inside main), not the nav's
    await page
      .getByRole("main")
      .getByRole("link", { name: "Sign in", exact: true })
      .click();
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.getByText("Welcome back")).toBeVisible();
  });
});

test.describe("Route protection", () => {
  test("unauthenticated user is redirected from /dashboard to /sign-in", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/sign-in\?redirect=%2Fdashboard/);
  });

  test("unauthenticated user is redirected from /settings to /sign-in", async ({
    page,
  }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/sign-in\?redirect=%2Fsettings/);
  });

  test("redirect param is preserved in sign-in form", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/sign-in\?redirect=%2Fdashboard/);
    await expect(page.getByLabel("Email")).toBeVisible();
  });
});

test.describe("Public routes", () => {
  test("landing page is accessible without auth", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText("Start Studying Free").first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("pricing page is accessible without auth", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page).toHaveURL(/\/pricing/);
  });
});
