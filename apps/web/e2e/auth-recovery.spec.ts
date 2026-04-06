import { test, expect } from "@playwright/test";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://tzftjqpnisalltnkrykg.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

async function createConfirmedUser(email: string, password: string) {
  if (!SERVICE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY required for recovery e2e tests");
  }

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create recovery test user: ${res.status} ${await res.text()}`);
  }
}

async function generateRecoveryTokenHash(email: string): Promise<string> {
  if (!SERVICE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY required for recovery e2e tests");
  }

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "recovery",
      email,
      options: {
        redirectTo: "http://localhost:3001/auth/confirm?next=/reset-password",
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to generate recovery link: ${res.status} ${await res.text()}`);
  }

  const body = (await res.json()) as { hashed_token?: string };
  if (!body.hashed_token) {
    throw new Error("Supabase recovery response did not include hashed_token");
  }

  return body.hashed_token;
}

test.describe("Auth recovery", () => {
  test("forgot password page renders and links back to sign-in", async ({ page }) => {
    await page.goto("/forgot-password");

    await expect(page.getByText("Reset your password")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Send reset link" }),
    ).toBeVisible();
    await expect(
      page.getByText("Remember your password?")
        .locator("..")
        .getByRole("link", { name: "Sign in" }),
    ).toHaveAttribute("href", "/sign-in");
  });

  test("forgot password submits with auth confirm redirect and shows confirmation state", async ({
    page,
  }) => {
    const email = `e2e-recovery-${Date.now()}@test.example.com`;
    const recoveryRequest = page.waitForRequest((req) => req.url().includes("/auth/v1/recover"));

    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Send reset link" }).click();

    const req = await recoveryRequest;
    const url = new URL(req.url());
    expect(url.searchParams.get("redirect_to")).toContain("/auth/confirm?next=/reset-password");

    await expect(page.getByText("Check your email for a reset link")).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
  });

  test("invalid recovery link redirects to sign-in with actionable error", async ({
    page,
  }) => {
    await page.goto("/auth/confirm?token_hash=invalid-token&type=recovery&next=/reset-password");

    await expect(page).toHaveURL(/\/sign-in\?reason=invalid_reset_link/);
    await expect(
      page.getByText(/That reset link is invalid or expired/i),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Request a new one" }),
    ).toHaveAttribute("href", "/forgot-password");
  });

  test("reset password validates mismatched passwords before submitting", async ({
    page,
  }) => {
    await page.goto("/reset-password");
    await page.getByLabel("New password").fill("DifferentPassword123!");
    await page.getByLabel("Confirm password").fill("NotTheSamePassword123!");
    await page.getByRole("button", { name: "Update password" }).click();

    await expect(page.getByText("Passwords don't match")).toBeVisible();
  });

  test("recovery link allows setting a new password and signing in with it", async ({
    page,
    browser,
  }) => {
    test.skip(!SERVICE_KEY, "SUPABASE_SERVICE_ROLE_KEY not set");

    const email = `e2e-reset-${Date.now()}@test.example.com`;
    const oldPassword = "TestPassword123!";
    const newPassword = "UpdatedPassword123!";

    await createConfirmedUser(email, oldPassword);
    const tokenHash = await generateRecoveryTokenHash(email);

    await page.goto(
      `/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=recovery&next=/reset-password`,
    );
    await page.waitForURL(/\/reset-password/, { timeout: 15_000 });

    await page.getByLabel("New password").fill(newPassword);
    await page.getByLabel("Confirm password").fill(newPassword);
    await page.getByRole("button", { name: "Update password" }).click();

    await expect(page).toHaveURL(/\/(dashboard|creator)/, { timeout: 15_000 });
    const freshContext = await browser.newContext({ baseURL: "http://localhost:3001" });
    const freshPage = await freshContext.newPage();

    await freshPage.goto("/sign-in");
    await freshPage.getByLabel("Email").fill(email);
    await freshPage.getByLabel("Password").fill(newPassword);
    await freshPage.getByRole("button", { name: "Sign In" }).click();

    await expect(freshPage).toHaveURL(/\/(dashboard|creator)/, { timeout: 15_000 });
    await freshContext.close();
  });
});
