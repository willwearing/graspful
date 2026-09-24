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
      page.getByRole("heading", { name: "Getting started" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Authoring" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Operations" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Reference", exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/An import without --publish saves a draft for review/)).toBeVisible();
    await expect(page.getByText(/Confirm published: true in the response/)).toBeVisible();
    await expect(page.getByText(/Paid subscriptions are not available yet/)).toBeVisible();
  });
});

// Reproduce the original setup race by holding the client scripts. Inputs must
// wait for React handlers, so a fast fill cannot be erased during hydration.
test("sign-in controls wait for hydration before accepting credentials", async ({ page }) => {
  let releaseScripts!: () => void;
  const scriptsReady = new Promise<void>((resolve) => { releaseScripts = resolve; });
  await page.route("**/_next/static/**/*.js*", async (route) => {
    await scriptsReady;
    await route.continue();
  });
  try {
    await page.goto("/sign-in", { waitUntil: "commit" });
    await expect(page.locator('script[src*="/_next/static/"]').first()).toBeAttached();
    // Static pages can stream an empty Suspense boundary before client hydration.
    await expect(page.locator('form input:enabled, form button[type="submit"]:enabled')).toHaveCount(0);
  } finally {
    releaseScripts();
  }
  await expect(page.getByLabel("Email")).toBeEnabled();
  await page.getByLabel("Email").fill("fast-typing@example.com");
  await page.getByLabel("Password").fill("TestPassword123!");
  await expect(page.getByLabel("Email")).toHaveValue("fast-typing@example.com");
  await expect(page.getByLabel("Password")).toHaveValue("TestPassword123!");
});
