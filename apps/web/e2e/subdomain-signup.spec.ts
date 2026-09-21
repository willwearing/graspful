import { test, expect } from "@playwright/test";

test.describe("Branded subdomain sign-up", () => {
  test("branded sign-in offers an enrollment path and recovers after failed credentials", async ({ page }) => {
    await page.context().addCookies([{
      name: "dev-brand-override", value: "electrician", domain: "localhost", path: "/",
    }]);
    await page.goto("/sign-in?redirect=%2Facademies");
    await expect(page.getByText("Sign in to continue studying with ElectricianPrep")).toBeVisible();
    await expect(page.getByRole("navigation").getByRole("link", { name: "ElectricianPrep" })).toBeVisible();
    await page.getByLabel("Email").fill("nonexistent@test.example.com");
    await page.getByLabel("Password").fill("wrongpassword1");
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(/invalid/i);
    await expect(page.getByRole("button", { name: "Sign In", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Create account instead" }).click();
    await expect(page).toHaveURL(/\/sign-up\?redirect=%2Facademies&email=nonexistent%40test.example.com/);
    await expect(page.getByLabel("Email")).toHaveValue("nonexistent@test.example.com");
    await expect(page.getByText("Create your account", { exact: true })).toBeVisible();
  });

  test("sign-up on a branded subdomain succeeds", async ({ page }) => {
    await page.context().addCookies([
      {
        name: "dev-brand-override",
        value: "electrician",
        domain: "localhost",
        path: "/",
      },
    ]);

    const email = `e2e-subdomain-${Date.now()}@test.example.com`;

    await page.goto("/sign-up");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("TestPassword123!");
    await page.getByRole("button", { name: "Create Account" }).click();

    // Local Supabase auto-confirms → redirect to dashboard.
    // Production Supabase requires email confirmation → "Check your email" screen.
    // Accept either outcome.
    const confirmed = page.getByText("Check your email", { exact: true });
    const dashboard = page.waitForURL(/\/(dashboard|creator)/, { timeout: 15_000 }).then(() => true).catch(() => false);

    const reachedDashboard = await dashboard;
    if (!reachedDashboard) {
      await expect(confirmed).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(email)).toBeVisible();
    }
  });

  test("sign-up request includes auth callback redirect URL", async ({
    page,
  }) => {
    await page.context().addCookies([
      {
        name: "dev-brand-override",
        value: "electrician",
        domain: "localhost",
        path: "/",
      },
    ]);

    const email = `e2e-subdomain-${Date.now()}@test.example.com`;

    // Intercept the Supabase signup API call
    const signUpPromise = page.waitForRequest((req) =>
      req.url().includes("/auth/v1/signup")
    );

    await page.goto("/sign-up");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("TestPassword123!");
    await page.getByRole("button", { name: "Create Account" }).click();

    const signUpReq = await signUpPromise;
    const reqUrl = signUpReq.url();

    // The Supabase SDK sends emailRedirectTo as a query parameter
    // (redirect_to) on the signup URL. Verify it points to /auth/callback.
    const url = new URL(reqUrl);
    const redirectTo = url.searchParams.get("redirect_to") ?? "";
    expect(redirectTo).toContain("/auth/callback");
  });
});
