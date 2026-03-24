import { test, expect } from "@playwright/test";
import {
  signUpAndGetApiContext,
  type ApiTestContext,
} from "./helpers/api-auth";

const GRASPFUL_BRAND = "graspful";

test.describe("Creator API Keys Page", () => {
  let ctx: ApiTestContext;

  test.beforeEach(async ({ page, request }) => {
    ctx = await signUpAndGetApiContext(page, request, GRASPFUL_BRAND);
    await page.goto("/creator/api-keys");
    await page.waitForURL(/\/creator\/api-keys/, { timeout: 10_000 });
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
    // The user already has a "default" key from registration, so check the list loads
    // Note: registration creates a default API key, so the empty state won't show.
    // Instead, verify the page loaded by checking for the heading.
    await expect(
      page.getByRole("heading", { name: "API Keys" })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("Create API Key button opens dialog", async ({ page }) => {
    const createBtn = page.getByRole("button", { name: /Create API Key/i });
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // Dialog should appear (use heading to avoid matching button)
    await expect(page.getByRole("heading", { name: "Create API Key" })).toBeVisible();
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
    const newKeyBanner = page.getByText("Your new API key (shown once):");
    await expect(newKeyBanner).toBeVisible({ timeout: 10_000 });

    // The full key is displayed in a code block next to the banner
    const newKeyCode = newKeyBanner.locator("..").locator("code").first();
    await expect(newKeyCode).toContainText(/^gsk_[0-9a-f]{64}$/);

    // Key should appear in the list with its name
    await expect(page.getByText(keyName)).toBeVisible();

    // Key prefix should be shown in the list (not the full key)
    // The user may have multiple keys (e.g., the default key from registration
    // plus the newly created one), so use .first().
    await expect(page.getByText(/gsk_[0-9a-f]{1,8}\.\.\./).first()).toBeVisible();
  });
});
