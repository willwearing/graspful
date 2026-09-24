import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { createServerClient } from "@supabase/ssr";
import { createHash, randomUUID } from "node:crypto";
import { cliAuthConfirmationCode } from "@graspful/shared";
import { getE2eEnvironment } from "../../../scripts/e2e-env";
import { getBrowserAccessToken, signInTestUser } from "./helpers/auth";

// Fail before opening a database connection if any service is hosted.
const testEnv = getE2eEnvironment(process.env);
const BACKEND_URL = testEnv.NEXT_PUBLIC_BACKEND_URL;
const WEB_URL = "http://localhost:3001";
const PASSWORD = "TestPassword123!";
const prisma = new PrismaClient({
  datasources: { db: { url: testEnv.DATABASE_URL } },
});
const createdUsers: Array<{ userId: string; orgSlug: string }> = [];
const createdSessionHashes: string[] = [];

async function registerUser(request: APIRequestContext) {
  const email = `e2e-security-browser-${randomUUID()}@test.example.com`;
  const response = await request.post(`${BACKEND_URL}/auth/register`, {
    data: { email, password: PASSWORD },
  });
  expect(response.status()).toBe(201);
  const { orgSlug } = (await response.json()) as { orgSlug: string };
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  createdUsers.push({ userId: user.id, orgSlug });
  return { email, userId: user.id };
}

async function useBrand(page: Page, brand: string) {
  await page.context().addCookies([
    { name: "dev-brand-override", value: brand, url: WEB_URL },
  ]);
}

async function expectMarketingShell(page: Page) {
  await expect(page.getByRole("navigation").getByRole("link", { name: "Graspful", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation").getByRole("link", { name: "Docs", exact: true })).toBeVisible();
  await expect(page.getByRole("contentinfo")).toContainText("All rights reserved.");
  await expect(page.getByRole("complementary")).toHaveCount(0);
}

async function startCliSession(request: APIRequestContext) {
  const response = await request.post(`${BACKEND_URL}/auth/cli/sessions`, {
    data: { mode: "sign-in" },
  });
  expect(response.status()).toBe(201);
  const body = (await response.json()) as { token: string };
  expect(body.token).toBeTruthy();
  createdSessionHashes.push(createHash("sha256").update(body.token).digest("hex"));
  return body.token;
}

async function exchangeCliSession(request: APIRequestContext, token: string) {
  const response = await request.post(`${BACKEND_URL}/auth/cli/sessions/exchange`, {
    data: { token },
  });
  expect(response.status()).toBe(200);
  return response.json();
}

test.afterEach(async ({ request }) => {
  await prisma.cliAuthSession.deleteMany({
    where: { tokenHash: { in: createdSessionHashes.splice(0) } },
  });
  for (const { userId, orgSlug } of createdUsers.splice(0)) {
    await prisma.brand.deleteMany({ where: { orgSlug } });
    await prisma.organization.deleteMany({ where: { slug: orgSlug } });
    await prisma.user.deleteMany({ where: { id: userId } });
    const response = await request.delete(`${testEnv.SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      headers: {
        apikey: testEnv.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${testEnv.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
    expect(response.ok()).toBe(true);
  }
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test.describe("Browser auth security", () => {
  test("a signed-in visitor must approve the exact terminal code before a key is issued", async ({ page, request }) => {
    const { email, userId } = await registerUser(request);
    await signInTestUser(page, email, PASSWORD, "graspful");
    const keysBefore = await prisma.apiKey.count({ where: { userId } });
    const token = await startCliSession(request);
    const expectedCode = await cliAuthConfirmationCode(token);
    const authorizeRequests: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().endsWith("/auth/cli/sessions/authorize")) {
        authorizeRequests.push(request.url());
      }
    });

    await page.goto(`/cli-auth?mode=sign-in#token=${encodeURIComponent(token)}`);
    const approve = page.getByRole("button", { name: "Approve terminal", exact: true });
    await expect(approve).toBeVisible();
    await expect(page.getByRole("heading", { name: "Finish sign-in" })).toBeVisible();
    await expect(page.getByText(expectedCode, { exact: true })).toBeVisible();
    await expectMarketingShell(page);
    expect(await exchangeCliSession(request, token)).toEqual({ status: "pending" });
    expect(await prisma.apiKey.count({ where: { userId } })).toBe(keysBefore);
    expect(authorizeRequests).toHaveLength(0);

    // A reload must also leave the terminal pending and the key count unchanged.
    await page.reload();
    await expect(approve).toBeVisible();
    await expect(page.getByText(expectedCode, { exact: true })).toBeVisible();
    expect(await exchangeCliSession(request, token)).toEqual({ status: "pending" });
    expect(await prisma.apiKey.count({ where: { userId } })).toBe(keysBefore);
    expect(authorizeRequests).toHaveLength(0);

    const authorization = page.waitForResponse((response) =>
      response.request().method() === "POST" && response.url().endsWith("/auth/cli/sessions/authorize"),
    );
    await approve.click();
    expect((await authorization).status()).toBe(200);
    await expect(page.getByRole("heading", { name: "CLI authentication complete" })).toBeVisible();
    await expect(page.getByText("You can close this tab now.")).toBeVisible();
    await expect(approve).toHaveCount(0);
    await expectMarketingShell(page);
    expect(authorizeRequests).toHaveLength(1);
    expect(await prisma.apiKey.count({ where: { userId } })).toBe(keysBefore + 1);

    const completed = await exchangeCliSession(request, token);
    expect(completed).toMatchObject({ status: "complete", userId });
    expect(completed.apiKey).toMatch(/^gsk_/);
    const keyAccess = await request.get(`${BACKEND_URL}/orgs/${completed.orgSlug}/courses`, {
      headers: { Authorization: `Bearer ${completed.apiKey}` },
    });
    expect(keyAccess.status()).toBe(200);
    expect(await exchangeCliSession(request, token)).toEqual({ status: "expired" });
    expect(await prisma.apiKey.count({ where: { userId } })).toBe(keysBefore + 1);
  });

  test("an anonymous CLI visitor gets the sign-in shell and cannot approve", async ({ page, request }) => {
    await useBrand(page, "graspful");
    const token = await startCliSession(request);
    const target = `/cli-auth?mode=sign-in#token=${encodeURIComponent(token)}`;
    await page.goto(target);

    await expect(page).toHaveURL((url) => url.origin === WEB_URL && url.pathname === "/sign-in");
    expect(new URL(page.url()).searchParams.get("redirect")).toBe(target);
    await expect(page.getByText("Welcome back", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Approve terminal" })).toHaveCount(0);
    await expectMarketingShell(page);
    expect(await exchangeCliSession(request, token)).toEqual({ status: "pending" });
  });

  test("sign-in ignores a protocol-relative redirect after real authentication", async ({ page, request }) => {
    const { email } = await registerUser(request);
    await useBrand(page, "electrician");
    await page.goto(`/sign-in?redirect=${encodeURIComponent("//evil.com")}`);
    await expect(page.getByText("Welcome back", { exact: true })).toBeVisible();
    await expect(page.getByRole("navigation").getByRole("link", { name: "ElectricianPrep", exact: true })).toBeVisible();
    await expect(page.getByRole("complementary")).toHaveCount(0);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign In", exact: true }).click();

    await expect(page).toHaveURL(`${WEB_URL}/dashboard`);
    const sidebar = page.getByRole("complementary");
    await expect(sidebar.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible();
    await expect(sidebar.getByRole("button", { name: "Log out", exact: true })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "API Keys", exact: true })).toHaveCount(0);
    expect(await getBrowserAccessToken(page)).toBeTruthy();
  });

  test("an unauthenticated callback with a backslash redirect returns the sign-in shell", async ({ page }) => {
    await useBrand(page, "graspful");
    await page.goto(`/auth/callback?redirect=${encodeURIComponent("/\\evil.com")}`);
    await expect(page).toHaveURL(`${WEB_URL}/sign-in`);
    await expect(page.getByText("Welcome back", { exact: true })).toBeVisible();
    await expectMarketingShell(page);
  });

  test("a successful PKCE callback keeps a backslash redirect on the application origin", async ({ page, request }) => {
    const { email, userId } = await registerUser(request);
    await useBrand(page, "electrician");
    const callbackUrl = new URL("/auth/callback", WEB_URL);
    callbackUrl.searchParams.set("redirect", "/\\evil.com");
    const verifierCookies: Array<{ name: string; value: string }> = [];
    const auth = createServerClient(
      testEnv.NEXT_PUBLIC_SUPABASE_URL,
      testEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll: () => verifierCookies,
          setAll: (cookies) => {
            for (const cookie of cookies) {
              const existing = verifierCookies.findIndex(({ name }) => name === cookie.name);
              if (existing >= 0) verifierCookies.splice(existing, 1);
              verifierCookies.push({ name: cookie.name, value: cookie.value });
            }
          },
        },
      },
    );
    const { error } = await auth.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: callbackUrl.toString() },
    });
    expect(error).toBeNull();
    expect(verifierCookies.some(({ name }) => name.endsWith("-code-verifier"))).toBe(true);
    await page.context().addCookies(verifierCookies.map((cookie) => ({ ...cookie, url: WEB_URL })));

    // Read the real locally generated email token without depending on a mail UI.
    // Supabase still verifies it, issues a one-use PKCE code, and checks the verifier.
    const tokens = await prisma.$queryRaw<Array<{ recovery_token: string }>>`
      SELECT recovery_token FROM auth.users WHERE id = ${userId}::uuid
    `;
    expect(tokens).toHaveLength(1);
    expect(tokens[0].recovery_token).toMatch(/^pkce_/);
    const verificationUrl = new URL("/auth/v1/verify", testEnv.NEXT_PUBLIC_SUPABASE_URL);
    verificationUrl.searchParams.set("token", tokens[0].recovery_token);
    verificationUrl.searchParams.set("type", "magiclink");
    verificationUrl.searchParams.set("redirect_to", callbackUrl.toString());
    const verification = await request.get(verificationUrl.toString(), { maxRedirects: 0 });
    expect(verification.status()).toBe(303);
    const callbackWithCode = new URL(verification.headers().location);
    expect(callbackWithCode.origin).toBe(WEB_URL);
    expect(callbackWithCode.pathname).toBe("/auth/callback");
    expect(callbackWithCode.searchParams.get("code")).toBeTruthy();
    expect(callbackWithCode.searchParams.get("redirect")).toBe("/\\evil.com");

    const callbackResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === "/auth/callback" && url.searchParams.has("code");
    });
    await page.goto(callbackWithCode.toString());
    const response = await callbackResponse;
    expect(response.status()).toBe(307);
    expect(response.headers().location).toBe(`${WEB_URL}/dashboard`);
    await expect(page).toHaveURL(`${WEB_URL}/dashboard`);
    const sidebar = page.getByRole("complementary");
    await expect(sidebar.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible();
    await expect(sidebar.getByRole("button", { name: "Log out", exact: true })).toBeVisible();
    const token = await getBrowserAccessToken(page);
    expect(token).toBeTruthy();
    const authenticated = await request.get(`${BACKEND_URL}/users/me/orgs`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(authenticated.status()).toBe(200);
    expect(await authenticated.json()).toEqual(expect.arrayContaining([
      expect.objectContaining({ slug: "electrician-prep", role: "member" }),
    ]));
  });
});
