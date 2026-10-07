import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import { getE2eEnvironment } from "../../../../backend/scripts/e2e-env";
import { messagesFor, waitForEmailLink } from "./mail";

const env = getE2eEnvironment(process.env);
const password = "TestPassword123!";

async function submitSignup(page: Page, email: string) {
  await page.goto("/sign-up");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  const response = page.waitForResponse((res) => res.url().includes("/auth/v1/signup") && res.request().method() === "POST");
  await page.getByRole("button", { name: "Create Account", exact: true }).click();
  const result = await response;
  expect(result.ok()).toBe(true);
  await expect(page.getByText("Check your email", { exact: true })).toBeVisible();
  await expect(page.getByText(/We sent a confirmation link/)).toHaveCount(0);
  return result.json();
}

export function signupEmailTests(brand: { id?: string; name: string; destination: string }) {
  test.describe(`${brand.name} signup emails`, () => {
    test.beforeEach(async ({ page }) => {
      // Fail if CI silently removes the production email confirmation requirement.
      const response = await fetch(`${env.SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY } });
      expect(response.ok).toBe(true);
      expect(await response.json()).toMatchObject({ mailer_autoconfirm: false, phone_autoconfirm: false });
      if (brand.id) await page.context().addCookies([{
        name: "dev-brand-override", value: brand.id, domain: "localhost", path: "/",
      }]);
    });

    test("delivers signup and resend links that confirm the account and open the correct shell", async ({ page, browser }) => {
      const email = `email-confirm-${randomUUID()}@test.example.com`;
      const data = await submitSignup(page, email);
      expect(data.email_confirmed_at).toBeFalsy();
      const first = await waitForEmailLink(email, /confirm/i);
      const destination = new URL(first.url);
      expect(destination.origin).toBe(new URL(page.url()).origin);
      expect(destination.pathname).toBe("/auth/callback");
      expect(destination.searchParams.get("redirect")).toBe(brand.destination);
      expect(destination.searchParams.get("type")).toBe("signup");
      expect(destination.searchParams.get("token_hash")).toBeTruthy();
      // Supabase's local mail resend interval is one second. Wait for the
      // initial email to age before submitting the real resend request.
      await page.waitForTimeout(1_100);
      const resend = page.waitForResponse((res) => res.url().includes("/auth/v1/resend"));
      await page.getByRole("button", { name: "Resend confirmation link" }).click();
      expect((await resend).ok()).toBe(true);
      await expect(page.getByRole("status")).toContainText("a new link has been requested");
      await expect(page.getByRole("button", { name: /Wait 60 seconds/ })).toBeDisabled();
      const second = await waitForEmailLink(email, /confirm/i, first.id);
      const confirmedContext = await browser.newContext();
      try {
        if (brand.id) await confirmedContext.addCookies([{
          name: "dev-brand-override", value: brand.id, domain: "localhost", path: "/",
        }]);
        const confirmedPage = await confirmedContext.newPage();
        await confirmedPage.goto(second.url);
        await expect(confirmedPage).toHaveURL(new RegExp(`${brand.destination}$`));
        if (brand.id) {
          const sidebar = confirmedPage.getByRole("complementary");
          await expect(sidebar.getByRole("button", { name: "Log out", exact: true })).toBeVisible();
          await expect(sidebar.getByRole("link", { name: "API Keys", exact: true })).toHaveCount(0);
          await expect(sidebar.getByText(brand.name, { exact: true })).toBeVisible();
        } else {
          await expect(confirmedPage.getByRole("heading", { name: "Creator Dashboard" })).toBeVisible();
          await expect(confirmedPage.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
          await expect(confirmedPage.getByRole("navigation").getByRole("link", { name: "API Keys", exact: true })).toBeVisible();
        }
        // The consumed token must not authenticate the original browser.
        await page.goto(second.url);
        await expect(page).toHaveURL(/\/sign-in$/);
        await expect(page.getByRole("complementary")).toHaveCount(0);
      } finally {
        await confirmedContext.close();
      }
    });

    test("an existing confirmed account gets recovery options without a false email claim", async ({ page, request }) => {
      const email = `email-existing-${randomUUID()}@test.example.com`;
      const existingPassword = "ExistingPassword789!";
      const registered = await request.post(`${env.NEXT_PUBLIC_BACKEND_URL}/auth/register`, { data: { email, password: existingPassword } });
      expect(registered.ok()).toBe(true);
      const before = await messagesFor(email);
      const data = await submitSignup(page, email);
      // Reproduce the real successful, obfuscated response, without mocking delivery.
      expect(data.identities).toEqual([]);
      expect(await messagesFor(email)).toHaveLength(before.length);
      await expect(page.getByText("Already signed up? Sign in with your existing password, or reset it below.")).toBeVisible();
      const signIn = page.getByRole("link", { name: "Back to sign in" });
      expect(new URL((await signIn.getAttribute("href"))!, page.url()).searchParams.get("email")).toBe(email);
      await signIn.click();
      await expect(page.getByLabel("Email", { exact: true })).toHaveValue(email);
      await page.getByLabel("Password", { exact: true }).fill(existingPassword);
      await page.getByRole("button", { name: "Sign In", exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${brand.destination}$`));
      await page.getByRole(brand.id ? "complementary" : "banner").getByRole("button", { name: brand.id ? "Log out" : "Sign out", exact: true }).click();
      await expect(page).toHaveURL(/\/$/);
      await submitSignup(page, email);
      await page.getByRole("link", { name: "Reset password", exact: true }).click();
      await expect(page.getByLabel("Email", { exact: true })).toHaveValue(email);
      await page.getByRole("button", { name: "Send reset link" }).click();
      const recovery = await waitForEmailLink(email, /reset/i);
      await page.goto(recovery.url);
      await expect(page.getByLabel("New password", { exact: true })).toBeVisible();
      const nextPassword = "RecoveredPassword456!";
      await page.getByLabel("New password", { exact: true }).fill(nextPassword);
      await page.getByLabel("Confirm password", { exact: true }).fill(nextPassword);
      await page.getByRole("button", { name: "Update password" }).click();
      await expect(page).toHaveURL(new RegExp(`${brand.destination}$`));
    });
  });
}
