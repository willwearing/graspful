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
    await expect(page.getByRole("heading", { name: "MCP Tools", exact: true })).toBeVisible();

    // Verify specific tool names are rendered
    await expect(page.getByText("graspful_scaffold_course")).toBeVisible();
    await expect(page.getByText("graspful_fill_concept")).toBeVisible();
    await expect(page.getByText("graspful_review_course")).toBeVisible();
    await expect(page.getByText("graspful_validate")).toBeVisible();
    await expect(page.getByText("graspful_import_course")).toBeVisible();
    await expect(page.getByText("graspful_create_brand")).toBeVisible();
  });

  test("agents page shows supported agents", async ({ page }) => {
    await page.goto("/agents");
    await expect(page.getByText("Works with your tools")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Claude Code", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cursor", exact: true })).toBeVisible();
  });

  test("agents page has workflow section", async ({ page }) => {
    await page.goto("/agents");
    await expect(page.getByText("Two YAMLs. One product.")).toBeVisible();
    await expect(page.getByText("1. Course YAML")).toBeVisible();
    await expect(page.getByText("2. Brand YAML")).toBeVisible();
    await expect(page.getByText(/import/i).first()).toBeVisible();
  });

  test("agents page states current billing availability", async ({ page }) => {
    await page.goto("/agents");
    await expect(page.getByText("Local authoring and review are free. Paid subscriptions are not available yet. We will publish plan and payout details when billing is ready.", { exact: true })).toBeVisible();
  });

  test("agents page has a CLI installation command", async ({ page }) => {
    await page.goto("/agents");
    await expect(page.getByText("bun add -g @graspful/cli").first()).toBeVisible();
  });

  test("agents page has sign-up links", async ({ page }) => {
    await page.goto("/agents");
    const signUpLinks = page.getByRole("link", { name: /get started/i });
    await expect(signUpLinks.first()).toBeVisible();
    await expect(signUpLinks.first()).toHaveAttribute("href", "/sign-up");
  });
});
