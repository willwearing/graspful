import { test, expect } from "@playwright/test";
import { signUpAsCreator } from "./helpers/auth";

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
