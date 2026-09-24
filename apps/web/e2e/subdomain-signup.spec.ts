import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { getBrowserAccessToken } from "./helpers/auth";
import { getE2eEnvironment } from "../../../scripts/e2e-env";

const BACKEND_URL = getE2eEnvironment(process.env).NEXT_PUBLIC_BACKEND_URL;
const prisma = new PrismaClient();

test.afterAll(async () => {
  await prisma.$disconnect();
});

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

  test("sign-up joins the existing academy without creating a learner website", async ({ page, request }) => {
    await page.context().addCookies([
      {
        name: "dev-brand-override",
        value: "electrician",
        domain: "localhost",
        path: "/",
      },
    ]);

    const email = `e2e-subdomain-${randomUUID()}@test.example.com`;

    await page.goto("/sign-up");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("TestPassword123!");
    const provisionResponse = page.waitForResponse((res) =>
      res.url().endsWith("/auth/provision") && res.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Create Account" }).click();

    // The isolated local Supabase instance auto-confirms accounts. Assert that
    // provisioning completed, so a redirect alone cannot hide an API failure.
    const response = await provisionResponse;
    expect(response.status()).toBe(201);
    expect(response.request().postDataJSON()).toEqual({ brandOrgSlug: "electrician-prep" });
    const provision = await response.json();
    expect(provision.created).toBe(true);
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
    const sidebar = page.getByRole("complementary");
    await expect(sidebar.getByText("ElectricianPrep", { exact: true })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Browse", exact: true })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible();
    await expect(sidebar.getByRole("button", { name: "Log out", exact: true })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "API Keys", exact: true })).toHaveCount(0);

    const token = await getBrowserAccessToken(page);
    expect(token).toBeTruthy();
    const headers = { Authorization: `Bearer ${token}` };
    const orgsResponse = await request.get(`${BACKEND_URL}/users/me/orgs`, { headers });
    expect(orgsResponse.status()).toBe(200);
    const orgs = await orgsResponse.json();
    expect(orgs).toEqual(expect.arrayContaining([
      expect.objectContaining({ slug: "electrician-prep", role: "member" }),
      expect.objectContaining({ orgId: provision.orgId, slug: provision.orgSlug, role: "owner" }),
    ]));
    const membership = await prisma.orgMembership.findMany({
      where: { user: { email }, org: { slug: "electrician-prep" } },
    });
    expect(membership).toHaveLength(1);
    expect(membership[0].role).toBe("member");
    const academies = await request.get(`${BACKEND_URL}/orgs/electrician-prep/academies`, { headers });
    expect(academies.status()).toBe(200);
    const unauthorizedKey = await request.post(`${BACKEND_URL}/orgs/electrician-prep/api-keys`, {
      headers, data: { name: "Learner must not manage this academy" },
    });
    expect(unauthorizedKey.status()).toBe(403);
    expect(await prisma.brand.count({ where: { orgSlug: provision.orgSlug } })).toBe(0);
    const domain = await request.get(`${BACKEND_URL}/brands/by-domain/${provision.orgSlug}.graspful.ai`);
    expect(domain.status()).toBe(404);
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
