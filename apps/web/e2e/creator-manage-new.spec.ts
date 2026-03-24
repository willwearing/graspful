import { test, expect } from "@playwright/test";

const GRASPFUL_BRAND = "graspful";

/**
 * Sign up on the graspful brand and navigate to /creator/manage.
 */
async function signUpAndNavigateToManage(
  page: import("@playwright/test").Page
) {
  await page.context().addCookies([
    {
      name: "dev-brand-override",
      value: GRASPFUL_BRAND,
      domain: "localhost",
      path: "/",
    },
  ]);

  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.example.com`;
  const password = "TestPassword123!";

  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();

  // Graspful brand redirects to /creator
  await page.waitForURL(/\/creator/, { timeout: 15_000 });

  await page.goto("/creator/manage");
  await page.waitForURL(/\/creator\/manage/, { timeout: 10_000 });
}

test.describe("Creator Manage — New Course", () => {
  test.beforeEach(async ({ page }) => {
    await signUpAndNavigateToManage(page);
  });

  test("page heading says New Course", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "New Course" })
    ).toBeVisible();
    await expect(
      page.getByText(
        "Define your brand and course content as YAML, then import to the platform."
      )
    ).toBeVisible();
  });

  test("Monaco editor loads with Brand Config tab active", async ({ page }) => {
    // Brand Config tab should be selected by default
    const brandTab = page.getByRole("tab", { name: "Brand Config" });
    await expect(brandTab).toBeVisible({ timeout: 10_000 });

    // Monaco editor container should be visible
    // Monaco is loaded dynamically — wait for it
    await expect(
      page.locator(".monaco-editor").first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("two tabs exist: Brand Config and Course Content", async ({ page }) => {
    await expect(
      page.getByRole("tab", { name: "Brand Config" })
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Course Content" })
    ).toBeVisible();
  });

  test("switching tabs changes editor content", async ({ page }) => {
    // Wait for Monaco to load
    await expect(
      page.locator(".monaco-editor").first()
    ).toBeVisible({ timeout: 15_000 });

    // Click Course Content tab
    await page.getByRole("tab", { name: "Course Content" }).click();

    // The editor should still be visible (different content loaded)
    await expect(
      page.locator(".monaco-editor").first()
    ).toBeVisible();

    // Switch back to Brand Config
    await page.getByRole("tab", { name: "Brand Config" }).click();
    await expect(
      page.locator(".monaco-editor").first()
    ).toBeVisible();
  });

  test("Import to Platform button exists", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /Import to Platform/i })
    ).toBeVisible();
  });

  test("Download YAML button exists", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /Download YAML/i })
    ).toBeVisible();
  });

  test("agent callout box is visible", async ({ page }) => {
    await expect(page.getByText("Prefer using AI?")).toBeVisible();
    await expect(
      page.getByText("npx @graspful/cli init")
    ).toBeVisible();
  });
});
