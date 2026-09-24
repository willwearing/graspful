import { randomUUID } from "node:crypto";
import { test, expect, type APIRequestContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { signUpBrandedTestUser, signInTestUser, getBrowserAccessToken, TEST_BRAND_ID } from "./helpers/auth";
import {
  registerAndGetApiContext,
  apiPost,
  apiGet,
  apiGetPublic,
  type ApiTestContext,
} from "./helpers/api-auth";
import { getE2eEnvironment } from "../../../backend/scripts/e2e-env";

const BACKEND_URL = getE2eEnvironment(process.env).NEXT_PUBLIC_BACKEND_URL;
const prisma = new PrismaClient();
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function courseYaml(slug: string) {
  return `
course:
  id: ${slug}
  name: "Provision Test Course"
  description: "Test course for provision flow."
  estimatedHours: 1
  version: "1.0"
concepts:
  - id: concept-a
    name: "Concept A"
    difficulty: 1
    estimatedMinutes: 5
    tags: [test]
    knowledgePoints:
      - id: kp-a-1
        instruction: "Test instruction."
        problems:
          - id: p-a-1
            type: multiple_choice
            question: "What is 1 + 1?"
            options: ["1", "2", "3"]
            correct: 1
            explanation: "Simple math."
          - id: p-a-2
            type: true_false
            question: "True is true."
            correct: "true"
            explanation: "Tautology."
          - id: p-a-3
            type: fill_blank
            question: "H2___"
            correct: "O"
            explanation: "Water."
`.trim();
}

async function expectNoWebsite(request: APIRequestContext, orgSlug: string) {
  expect(await prisma.brand.count({ where: { orgSlug } })).toBe(0);
  expect((await apiGetPublic(request, `/brands/${orgSlug}`)).status).toBe(404);
  expect(
    (await apiGetPublic(request, `/brands/by-domain/${orgSlug}.graspful.ai`)).status,
  ).toBe(404);
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test.describe("User provisioning (web UI sign-up flow)", () => {
  test("anonymous users cannot provision an account or see creator chrome", async ({ page, request }) => {
    const res = await request.post(`${BACKEND_URL}/auth/provision`, { data: {} });
    expect(res.status()).toBe(401);
    await page.goto("/creator");
    await expect(page).toHaveURL(/\/sign-in(?:\?|$)/);
    await expect(page.getByRole("button", { name: "Sign In", exact: true })).toBeVisible();
    await expect(page.getByRole("complementary")).toHaveCount(0);
  });

  test("Supabase UI sign-up and repeat sign-in create a private org without a website", async ({
    page,
    request,
  }) => {
    test.setTimeout(60_000);
    const email = `e2e-provision-${randomUUID()}@test.example.com`;
    await page.context().addCookies([
      { name: "dev-brand-override", value: "graspful", domain: "localhost", path: "/" },
    ]);
    await page.goto("/sign-up");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("TestPassword123!");

    // Exercise the real Supabase sign-up path. The registration helper creates
    // the org through /auth/register before the browser can test provisioning.
    const signUpResponse = page.waitForResponse((res) =>
      res.url().includes("/auth/v1/signup") && res.request().method() === "POST",
    );
    const provisionResponse = page.waitForResponse((res) =>
      res.url().endsWith("/auth/provision") && res.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Create Account" }).click();
    expect((await signUpResponse).ok()).toBe(true);
    const firstProvision = await provisionResponse;
    expect(firstProvision.status()).toBe(201);
    const provision = await firstProvision.json();
    expect(provision).toMatchObject({ created: true });
    expect(provision.orgId).toMatch(UUID_RE);
    expect(provision.orgSlug).toBeTruthy();

    await expect(page).toHaveURL(/\/creator$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Creator Dashboard" })).toBeVisible();
    const sidebar = page.getByRole("complementary");
    await expect(sidebar.getByRole("link", { name: "API Keys", exact: true })).toBeVisible();
    await expect(sidebar.getByRole("button", { name: "Log out", exact: true })).toBeVisible();
    const token = await getBrowserAccessToken(page);
    expect(token).toBeTruthy();
    const ctx: ApiTestContext = { token: token!, orgId: provision.orgSlug, request };
    const orgs = await apiGet(ctx, "/users/me/orgs");
    expect(orgs.status).toBe(200);
    expect(orgs.body.filter((org: { role: string }) => org.role === "owner")).toEqual([
      expect.objectContaining({ orgId: provision.orgId, slug: provision.orgSlug }),
    ]);
    await expectNoWebsite(request, provision.orgSlug);

    const createRes = await apiPost(ctx, `/orgs/${ctx.orgId}/api-keys`, {
      name: "Provision regression",
    });
    expect(createRes.status).toBe(201);
    expect(createRes.body.key).toMatch(/^gsk_/);
    const listRes = await apiGet(ctx, `/orgs/${ctx.orgId}/api-keys`);
    expect(listRes.status).toBe(200);
    expect(listRes.body).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "Provision regression" }),
    ]));
    const courses = await apiGet(
      { ...ctx, token: createRes.body.key }, `/orgs/${ctx.orgId}/courses`,
    );
    expect(courses.status).toBe(200);
    expect(courses.body).toEqual([]);
    expect((await apiGetPublic(request, `/orgs/${ctx.orgId}/courses`)).status).toBe(401);
    // The platform membership from sign-up does not grant creator permissions there.
    expect((await apiPost(ctx, "/orgs/graspful/api-keys", { name: "Denied" })).status).toBe(403);

    await sidebar.getByRole("button", { name: "Log out", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    const repeatProvisionResponse = page.waitForResponse((res) =>
      res.url().endsWith("/auth/provision") && res.request().method() === "POST",
    );
    await signInTestUser(page, email, "TestPassword123!", "graspful");
    const repeatProvision = await repeatProvisionResponse;
    expect(repeatProvision.status()).toBe(201);
    expect(await repeatProvision.json()).toMatchObject({
      orgId: provision.orgId, orgSlug: provision.orgSlug, created: false,
    });
    const memberships = await prisma.orgMembership.findMany({
      where: { role: "owner", user: { email } },
    });
    expect(memberships).toHaveLength(1);
    expect(memberships[0].orgId).toBe(provision.orgId);
    await expectNoWebsite(request, provision.orgSlug);
  });

  test("legacy registration creates a website only after explicit course import", async ({
    request,
  }) => {
    const ctx = await registerAndGetApiContext(request);
    await expectNoWebsite(request, ctx.orgId);
    const courseSlug = `provision-test-${Date.now()}`;

    const importRes = await apiPost(
      ctx,
      `/orgs/${ctx.orgId}/courses/import`,
      { yaml: courseYaml(courseSlug) },
    );

    expect(importRes.status).toBe(201);
    expect(importRes.body.courseId).toBeTruthy();
    const brands = await prisma.brand.findMany({ where: { orgSlug: ctx.orgId } });
    expect(brands).toHaveLength(1);
    const resolved = await apiGetPublic(request, `/brands/by-domain/${brands[0].domain}`);
    expect(resolved.status).toBe(200);
    expect(resolved.body.orgSlug).toBe(ctx.orgId);
  });

  test("academy import creates a website for a fresh org and reuses it on reimport", async ({ request }) => {
    const ctx = await registerAndGetApiContext(request);
    await expectNoWebsite(request, ctx.orgId);
    const academySlug = `provision-academy-${Date.now()}`;
    const courseSlug = `provision-course-${Date.now()}`;
    const payload = {
      manifestYaml: `
academy:
  id: ${academySlug}
  name: "Provision Test Academy"
  description: "A website created for an explicit academy import."
  version: "1.0"
courses:
  - id: ${courseSlug}
    name: "Provision Test Course"
    file: courses/test.yaml
`.trim(),
      courseYamls: { "courses/test.yaml": courseYaml(courseSlug) },
    };
    const imported = await apiPost(ctx, `/orgs/${ctx.orgId}/academies/import`, payload);
    expect(imported.status).toBe(201);
    expect(imported.body).toMatchObject({ academySlug, courseCount: 1 });
    const brands = await prisma.brand.findMany({ where: { orgSlug: ctx.orgId } });
    expect(brands).toHaveLength(1);
    expect(brands[0].name).toBe("Provision Test Academy");
    const resolved = await apiGetPublic(request, `/brands/by-domain/${brands[0].domain}`);
    expect(resolved.status).toBe(200);
    expect(resolved.body.orgSlug).toBe(ctx.orgId);

    const repeated = await apiPost(ctx, `/orgs/${ctx.orgId}/academies/import`, { ...payload, replace: true });
    expect(repeated.status).toBe(201);
    const brandsAfterRepeat = await prisma.brand.findMany({ where: { orgSlug: ctx.orgId } });
    expect(brandsAfterRepeat.map((brand) => brand.id)).toEqual([brands[0].id]);
  });

  test("legacy registration creates a website only after explicit brand import", async ({ request }) => {
    const ctx = await registerAndGetApiContext(request);
    await expectNoWebsite(request, ctx.orgId);
    try {
      const brand = await apiPost(ctx, "/brands", {
        slug: ctx.orgId,
        orgSlug: ctx.orgId,
        name: "Explicit website",
        domain: `${ctx.orgId}.graspful.ai`,
        tagline: "Created by the account owner",
        theme: {}, landing: {}, seo: {},
      });
      expect(brand.status).toBe(201);
      expect(brand.body.brand).toMatchObject({ orgSlug: ctx.orgId });
      expect(await prisma.brand.count({ where: { orgSlug: ctx.orgId } })).toBe(1);
      const resolved = await apiGetPublic(request, `/brands/by-domain/${ctx.orgId}.graspful.ai`);
      expect(resolved.status).toBe(200);
      expect(resolved.body.orgSlug).toBe(ctx.orgId);
    } finally {
      await prisma.brand.deleteMany({ where: { orgSlug: ctx.orgId } });
    }
  });
});

test.describe("Platform org auto-creation", () => {
  test("joining 'graspful' org works even if it didn't exist before", async ({
    page,
    request,
  }) => {
    await signUpBrandedTestUser(page, TEST_BRAND_ID);
    const token = await getBrowserAccessToken(page);

    // Try to join the graspful platform org
    const joinRes = await request.post(`${BACKEND_URL}/orgs/graspful/join`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: {},
    });
    // Should succeed (201) — auto-creates if missing
    expect(joinRes.status()).toBeLessThan(300);
    const body = await joinRes.json();
    expect(body.orgId).toBeTruthy();
  });
});

test.describe("Brand resolution", () => {
  test("graspful.ai domain resolves to graspful brand", async ({ page }) => {
    // In dev mode, use the graspful brand override
    await page.context().addCookies([
      {
        name: "dev-brand-override",
        value: "graspful",
        domain: "localhost",
        path: "/",
      },
    ]);

    await page.goto("/");
    const res = await page.goto("/");
    expect(res?.status()).toBe(200);
  });

  test("docs pages are accessible from main site", async ({ page }) => {
    // Verify all the doc routes that were previously referenced as docs.graspful.com
    for (const path of [
      "/docs/brand-schema",
      "/docs/course-schema",
      "/docs/quickstart",
    ]) {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
    }
  });
});
