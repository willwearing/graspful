import { expect, test } from "@playwright/test";

test.describe("Auth and docs", () => {
  test("sign-in page shows auth form and forgot-password link", async ({ page }) => {
    await page.goto("/sign-in");

    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Forgot password?" }),
    ).toHaveAttribute("href", "/forgot-password");
  });

  test("forgot-password page renders and links back to sign-in", async ({ page }) => {
    await page.goto("/forgot-password");

    await expect(page.getByText("Reset your password")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Send reset link" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Sign in" }),
    ).toHaveAttribute("href", "/sign-in");
  });

  test("reset-password page renders password fields", async ({ page }) => {
    await page.goto("/reset-password");

    await expect(page.getByText("Set new password")).toBeVisible();
    await expect(page.getByLabel("New password")).toBeVisible();
    await expect(page.getByLabel("Confirm password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Update password" }),
    ).toBeVisible();
  });

  test("docs page loads with creator guidance content", async ({ page }) => {
    await page.goto("/docs");

    await expect(
      page.getByRole("heading", { name: "Guidance for creator teams" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Authoring" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Operations" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Open product docs" }),
    ).toHaveAttribute("href", "/docs");
  });
});
