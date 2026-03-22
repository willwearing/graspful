import { test, expect } from "@playwright/test";

test.describe("Agents Page", () => {
  test("agents page loads with hero heading", async ({ page }) => {
    await page.goto("/agents");
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible({ timeout: 10_000 });
    await expect(heading).toContainText("agent", { ignoreCase: true });
  });

  test("agents page has MCP tools section", async ({ page }) => {
    await page.goto("/agents");
    await expect(page.getByText("MCP Tools")).toBeVisible();

    // Verify specific tool names are rendered
    await expect(page.getByText("create_course")).toBeVisible();
    await expect(page.getByText("fill_concept")).toBeVisible();
    await expect(page.getByText("review_course")).toBeVisible();
    await expect(page.getByText("validate_course")).toBeVisible();
    await expect(page.getByText("import_course")).toBeVisible();
    await expect(page.getByText("create_brand")).toBeVisible();
  });

  test("agents page shows supported agents", async ({ page }) => {
    await page.goto("/agents");
    await expect(page.getByText("Works with your tools")).toBeVisible();
    await expect(page.getByText("Claude Code")).toBeVisible();
    await expect(page.getByText("Cursor")).toBeVisible();
  });

  test("agents page has workflow section", async ({ page }) => {
    await page.goto("/agents");
    await expect(page.getByText("Two YAMLs. One product.")).toBeVisible();
    await expect(page.getByText("1. Course YAML")).toBeVisible();
    await expect(page.getByText("2. Brand YAML")).toBeVisible();
    await expect(page.getByText(/import/i).first()).toBeVisible();
  });

  test("agents page has pricing section", async ({ page }) => {
    await page.goto("/agents");
    await expect(page.getByText("70 / 30")).toBeVisible();
    await expect(
      page.getByText("Revenue share when learners pay", { exact: false })
    ).toBeVisible();
  });

  test("agents page has CTA with CLI init command", async ({ page }) => {
    await page.goto("/agents");
    const cliCommand = page.getByText("npx @graspful/cli init");
    // Should appear in both hero and bottom CTA
    const count = await cliCommand.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("agents page has sign-up links", async ({ page }) => {
    await page.goto("/agents");
    const signUpLinks = page.getByRole("link", { name: /get started/i });
    await expect(signUpLinks.first()).toBeVisible();
    await expect(signUpLinks.first()).toHaveAttribute("href", "/sign-up");
  });
});
