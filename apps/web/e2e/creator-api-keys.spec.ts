import { test, expect } from "@playwright/test";

const GRASPFUL_BRAND = "graspful";

/**
 * Sign up on the graspful brand and navigate to /creator/api-keys.
 */
async function signUpAndNavigateToApiKeys(
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

  await page.goto("/creator/api-keys");
  await page.waitForURL(/\/creator\/api-keys/, { timeout: 10_000 });
}

test.describe("Creator API Keys Page", () => {
  test.beforeEach(async ({ page }) => {
    await signUpAndNavigateToApiKeys(page);
  });

  test("page heading says API Keys", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "API Keys" })
    ).toBeVisible();
    await expect(
      page.getByText("Manage API keys for the CLI and MCP integrations.")
    ).toBeVisible();
  });

  test("quick-start code block is visible", async ({ page }) => {
    await expect(page.getByText("Quick Start")).toBeVisible();
    await expect(
      page.getByText('GRASPFUL_API_KEY="gsk_..."')
    ).toBeVisible();
    await expect(
      page.getByText("npx @graspful/cli login")
    ).toBeVisible();
  });

  test("empty state shows when no keys exist", async ({ page }) => {
    await expect(
      page.getByText("No API keys yet. Create one to use the CLI or MCP server.")
    ).toBeVisible({ timeout: 10_000 });
  });

  test("Create API Key button opens dialog", async ({ page }) => {
    const createBtn = page.getByRole("button", { name: /Create API Key/i });
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // Dialog should appear
    await expect(page.getByText("Create API Key")).toBeVisible();
    await expect(
      page.getByText("Give your key a name so you can identify it later.")
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("e.g. My Laptop CLI")
    ).toBeVisible();
  });

  test("create a key, verify it is shown once and appears in list", async ({
    page,
  }) => {
    // Open create dialog
    await page
      .getByRole("button", { name: /Create API Key/i })
      .click();

    // Enter key name
    const keyName = `test-key-${Date.now()}`;
    await page.getByPlaceholder("e.g. My Laptop CLI").fill(keyName);

    // Click Create Key
    await page.getByRole("button", { name: "Create Key" }).click();

    // New key should be shown with gsk_ prefix
    await expect(
      page.getByText("Your new API key (shown once):")
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/gsk_/)).toBeVisible();

    // Key should appear in the list with its name
    await expect(page.getByText(keyName)).toBeVisible();

    // Key prefix should be shown in the list (not the full key)
    await expect(page.getByText(/gsk_.{1,8}\.\.\./)).toBeVisible();
  });
});
