import { test, expect } from "@playwright/test";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://tzftjqpnisalltnkrykg.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/**
 * Find a Supabase auth user by email, retrying a few times since creation
 * is async after the signUp call returns.
 */
async function findSupabaseUser(email: string) {
  if (!SERVICE_KEY)
    throw new Error("SUPABASE_SERVICE_ROLE_KEY required for this test");

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=200`,
      {
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
        },
      }
    );
    const { users } = (await res.json()) as {
      users: Array<{
        id: string;
        email: string;
        confirmation_sent_at: string | null;
        email_confirmed_at: string | null;
      }>;
    };
    const user = users.find((u) => u.email === email);
    if (user) return user;
    await new Promise((r) => setTimeout(r, 1_000));
  }
  return null;
}

test.describe("Branded subdomain sign-up", () => {
  test("sign-up on a branded subdomain shows email confirmation screen", async ({
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

    await page.goto("/sign-up");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("TestPassword123!");
    await page.getByRole("button", { name: "Create Account" }).click();

    // Production flow: email confirmation is required, so the UI shows
    // "Check your email" instead of redirecting to the dashboard.
    await expect(page.getByText("Check your email")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(email)).toBeVisible();
  });

  test("confirmation email is dispatched for branded subdomain sign-up", async ({
    page,
  }) => {
    test.skip(!SERVICE_KEY, "SUPABASE_SERVICE_ROLE_KEY not set");

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

    await expect(page.getByText("Check your email")).toBeVisible({
      timeout: 10_000,
    });

    // Verify Supabase created the user and dispatched a confirmation email
    const user = await findSupabaseUser(email);
    expect(user).toBeTruthy();
    expect(user!.confirmation_sent_at).toBeTruthy();
    expect(user!.email_confirmed_at).toBeFalsy();
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
    const body = signUpReq.postDataJSON();

    // The emailRedirectTo should point to /auth/callback so the
    // confirmation link lands on the correct page.
    const redirectTo =
      body?.options?.emailRedirectTo ?? body?.email_redirect_to ?? "";
    expect(redirectTo).toContain("/auth/callback");
  });
});
