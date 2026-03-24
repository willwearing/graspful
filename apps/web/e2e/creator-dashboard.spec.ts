import { test, expect } from "@playwright/test";

const GRASPFUL_BRAND = "graspful";

/**
 * Sign up on the graspful brand. Middleware redirects to /creator (not /dashboard).
 */
async function signUpAsCreator(page: import("@playwright/test").Page) {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.example.com`;
  const password = "TestPassword123!";

  await page.context().addCookies([
    { name: "dev-brand-override", value: GRASPFUL_BRAND, domain: "localhost", path: "/" },
  ]);

  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();

  // Graspful brand redirects authenticated users to /creator
  await page.waitForURL(/\/creator/, { timeout: 15_000 });
  return email;
}

test.describe("Creator Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await signUpAsCreator(page);
  });

  test("redirects to /creator (not /dashboard) on graspful brand", async ({
    page,
  }) => {
    await expect(page).toHaveURL(/\/creator/);
    // Should NOT be on /dashboard
    expect(page.url()).not.toMatch(/\/dashboard/);
  });

  test("page heading and description are visible", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Creator Dashboard" })
    ).toBeVisible();
    await expect(
      page.getByText("Manage your courses and track performance.")
    ).toBeVisible();
  });

  test("stat cards are visible (Students, Avg Completion, Revenue)", async ({
    page,
  }) => {
    await expect(page.getByText("Students")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Avg Completion")).toBeVisible();
    await expect(page.getByText("Revenue")).toBeVisible();
  });

  test("New Course button links to /creator/manage", async ({ page }) => {
    // Base UI Button with render={<Link>} exposes button role, not link
    const newCourseBtn = page.getByRole("button", { name: /New Course/i });
    await expect(newCourseBtn).toBeVisible();
    await newCourseBtn.click();
    await expect(page).toHaveURL(/\/creator\/manage/);
  });

  test("empty state shows when no courses exist", async ({ page }) => {
    // Fresh user has no courses — empty state should appear
    await expect(
      page.getByText("No courses yet. Create your first course to get started.")
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("button", { name: "Create Course" })
    ).toBeVisible();
  });
});
