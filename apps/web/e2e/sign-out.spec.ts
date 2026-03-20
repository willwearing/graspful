import { test, expect } from "@playwright/test";
import { signUpTestUser } from "./helpers/auth";

test.describe("Sign out", () => {
  test("log out button is visible in the header and works", async ({ page }) => {
    await signUpTestUser(page);

    // Should be on dashboard
    await expect(page.getByText("Welcome back")).toBeVisible();

    // Log out button should be visible in the app header
    const logOutBtn = page
      .getByRole("banner")
      .getByRole("button", { name: /log out/i });
    await expect(logOutBtn).toBeVisible();

    // Click log out
    await logOutBtn.click();

    // Should redirect to landing page
    await expect(page).toHaveURL("/", { timeout: 10_000 });
  });

  test("after sign out, protected routes redirect to sign-in", async ({
    page,
  }) => {
    await signUpTestUser(page);

    const logOutBtn = page
      .getByRole("banner")
      .getByRole("button", { name: /log out/i });
    await expect(logOutBtn).toBeVisible();
    await logOutBtn.click();
    await expect(page).toHaveURL("/", { timeout: 10_000 });

    // Try accessing dashboard — should redirect to sign-in
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
