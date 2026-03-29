import { test, expect } from "@playwright/test";

const BACKEND_URL = "http://localhost:3000/api/v1";

test.describe("CLI browser auth", () => {
  test("sign-up flow authorizes a CLI session and exchanges an API key", async ({
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
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("TestPassword123!");
    await page.getByRole("button", { name: "Create Account" }).click();

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
