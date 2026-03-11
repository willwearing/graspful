import { test, expect } from "@playwright/test";
import { signUpTestUser } from "./helpers/auth";

test.describe("Sign out", () => {
  test("sign out button is visible in sidebar and works", async ({ page }) => {
    await signUpTestUser(page);

    // Should be on dashboard
    await expect(page.getByText("Welcome back")).toBeVisible();

    // Sign out button should be visible in the sidebar
    const signOutBtn = page.getByRole("button", { name: /sign out/i });
    await expect(signOutBtn).toBeVisible();

    // Click sign out
    await signOutBtn.click();

    // Should redirect to landing page
    await expect(page).toHaveURL("/", { timeout: 10_000 });
  });

  test("after sign out, protected routes redirect to sign-in", async ({
    page,
  }) => {
    await signUpTestUser(page);

    const signOutBtn = page.getByRole("button", { name: /sign out/i });
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();
    await expect(page).toHaveURL("/", { timeout: 10_000 });

    // Try accessing dashboard — should redirect to sign-in
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
