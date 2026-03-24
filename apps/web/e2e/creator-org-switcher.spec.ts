import { test, expect } from "@playwright/test";

const GRASPFUL_BRAND = "graspful";

/**
 * Sign up on the graspful brand.
 */
async function signUpAsCreator(page: import("@playwright/test").Page) {
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

  // Wait for auth redirect — may land on /dashboard first, then middleware redirects to /creator
  await page.waitForURL(/\/(creator|dashboard)/, { timeout: 15_000 });
  if (page.url().includes("/dashboard")) {
    await page.waitForURL(/\/creator/, { timeout: 10_000 });
  }
  return email;
}

test.describe("Creator Org Switcher", () => {
  test("org switcher is hidden when user has only one org", async ({
    page,
  }) => {
    await signUpAsCreator(page);

    // Fresh user belongs to exactly one org.
    // The OrgSwitcher component returns null when orgs.length <= 1.
    // Verify the switcher is NOT visible.
    await page.waitForTimeout(2000); // Allow the async fetch to complete

    // The org switcher renders a button with a Building2 icon and ChevronsUpDown.
    // If hidden, we should not find the "Organizations" dropdown trigger.
    const switcher = page.getByRole("button", { name: /Organizations/i });
    await expect(switcher).toBeHidden();
  });
});
