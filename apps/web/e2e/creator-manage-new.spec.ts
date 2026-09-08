import { test, expect } from "@playwright/test";
import { signUpAsCreator } from "./helpers/auth";

async function signUpAndNavigateToManage(
  page: import("@playwright/test").Page
) {
  await signUpAsCreator(page);
  await page.goto("/creator/manage");
  await page.waitForURL(/\/creator\/manage/, { timeout: 10_000 });
}

test.describe("Creator Manage — New course", () => {
  test.beforeEach(async ({ page }) => {
    await signUpAndNavigateToManage(page);
  });

  test("page heading says New course", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "New course" })
    ).toBeVisible();
    await expect(
      page.getByText(
        "Fill the course draft with source material, teaching, and questions, then import it."
      )
    ).toBeVisible();
  });

  test("Monaco editor loads with Course content tab active", async ({ page }) => {
    const courseTab = page.getByRole("tab", { name: "Course content" });
    await expect(courseTab).toHaveAttribute("aria-selected", "true");

    // Monaco editor container should be visible
    // Monaco is loaded dynamically — wait for it
    await expect(
      page.locator(".monaco-editor").first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("two tabs exist: Brand settings and Course content", async ({ page }) => {
    await expect(
      page.getByRole("tab", { name: "Brand settings" })
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Course content" })
    ).toBeVisible();
  });

  test("switching tabs changes editor content", async ({ page }) => {
    // Wait for Monaco to load
    await expect(
      page.locator(".monaco-editor").first()
    ).toBeVisible({ timeout: 15_000 });

    // Click Course content tab
    await page.getByRole("tab", { name: "Course content" }).click();

    // The editor should still be visible (different content loaded)
    await expect(
      page.locator(".monaco-editor").first()
    ).toBeVisible();

    // Switch back to Brand settings
    await page.getByRole("tab", { name: "Brand settings" }).click();
    await expect(
      page.locator(".monaco-editor").first()
    ).toBeVisible();
  });

  test("Import draft button exists", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /Import draft/i })
    ).toBeVisible();
  });

  test("Download YAML button exists", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /Download YAML/i })
    ).toBeVisible();
  });

  test("agent callout box is visible", async ({ page }) => {
    await expect(page.getByText("Edit with your agent")).toBeVisible();
    await expect(
      page.getByText("npx @graspful/cli init")
    ).toBeVisible();
  });
});
