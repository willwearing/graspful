import { test, expect } from "@playwright/test";

const BACKEND_URL = "http://localhost:3000/api/v1";

test.describe("CLI browser auth", () => {
  test("preserves sign-up recovery copy when the CLI token is missing", async ({ page }) => {
    await page.goto("/cli-auth?mode=sign-up");

    await expect(page.getByRole("heading", { name: "Finish sign-up" })).toBeVisible();
    await expect(page.locator("main")).toContainText(
      "Missing CLI auth token. Start the flow again from your terminal."
    );
    await expect(page.getByText("graspful register")).toBeVisible();
  });

  test("sign-up handoff authorizes a CLI session and exchanges an API key", async ({
    page,
    request,
  }) => {
    const startRes = await request.post(`${BACKEND_URL}/auth/cli/sessions`, {
      data: { mode: "sign-up" },
      headers: { "Content-Type": "application/json" },
    });

    expect(startRes.status()).toBe(201);
    const startBody = await startRes.json();
    expect(startBody.token).toBeTruthy();

    await page.context().addCookies([
      {
        name: "dev-brand-override",
        value: "graspful",
        domain: "localhost",
        path: "/",
      },
    ]);

    await page.goto(`/cli-auth?mode=sign-up#token=${encodeURIComponent(startBody.token)}`);
    await page.waitForURL(/\/sign-up/, { timeout: 15_000 });

    const email = `cli-auth-${Date.now()}@test.example.com`;
    const password = "TestPassword123!";
    const registerRes = await request.post(`${BACKEND_URL}/auth/register`, {
      data: { email, password },
      headers: { "Content-Type": "application/json" },
    });

    expect(registerRes.status()).toBe(201);

    const redirectTarget = `/cli-auth?mode=sign-up&cli-sign-up-complete=1#token=${encodeURIComponent(startBody.token)}`;
    await page.goto(`/sign-in?redirect=${encodeURIComponent(redirectTarget)}`);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(
      page.getByRole("heading", { name: "CLI authentication complete" })
    ).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText("You can close this tab now.")).toBeVisible();

    const exchangeRes = await request.post(`${BACKEND_URL}/auth/cli/sessions/exchange`, {
      data: { token: startBody.token },
      headers: { "Content-Type": "application/json" },
    });

    expect(exchangeRes.status()).toBe(200);
    const exchangeBody = await exchangeRes.json();
    expect(exchangeBody.status).toBe("complete");
    expect(exchangeBody.apiKey).toMatch(/^gsk_/);
    expect(exchangeBody.orgSlug).toBeTruthy();
  });
});
