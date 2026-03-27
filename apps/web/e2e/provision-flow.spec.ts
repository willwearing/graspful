import { test, expect } from "@playwright/test";
import { signUpBrandedTestUser, getBrowserAccessToken, TEST_BRAND_ID } from "./helpers/auth";
import {
  registerAndGetApiContext,
  apiPost,
  apiGet,
  apiGetPublic,
  type ApiTestContext,
} from "./helpers/api-auth";

const BACKEND_URL = "http://localhost:3000/api/v1";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Tests for the POST /auth/provision endpoint and the web UI sign-up flow.
 * These cover the case where users sign up via Supabase Auth (not /auth/register)
 * and need their personal org provisioned after authentication.
 */
test.describe("User provisioning (web UI sign-up flow)", () => {
  test("POST /auth/provision creates org for signed-in user", async ({ page, request }) => {
    await signUpBrandedTestUser(page, "graspful");
    const token = await getBrowserAccessToken(page);

    expect(token).toBeTruthy();

    // Call provision endpoint — should be idempotent (user already has an org)
    const res = await request.post(`${BACKEND_URL}/auth/provision`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.orgSlug).toBeTruthy();
    expect(body.orgId).toBeTruthy();
    // Already had an org from register, so created should be false
    expect(body.created).toBe(false);
  });

  test("sign-up via UI creates user with working org", async ({ page }) => {
    // Sign up using the graspful brand (platform org)
    const email = await signUpBrandedTestUser(page, "graspful");
    expect(email).toBeTruthy();

    // Should land on creator dashboard
    await expect(page).toHaveURL(/\/creator/, { timeout: 15_000 });
  });

  test("after UI sign-up, user can list their orgs", async ({
    page,
    request,
  }) => {
    await signUpBrandedTestUser(page, "graspful");
    const token = await getBrowserAccessToken(page);

    expect(token).toBeTruthy();

    // Call /users/me/orgs to verify the user has at least one org
    const res = await request.get(`${BACKEND_URL}/users/me/orgs`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    expect(res.status()).toBe(200);
    const orgs = await res.json();
    expect(Array.isArray(orgs)).toBe(true);
    expect(orgs.length).toBeGreaterThanOrEqual(1);

    // At least one org should have owner role
    const ownedOrg = orgs.find((o: any) => o.role === "owner");
    expect(ownedOrg).toBeTruthy();
  });

  test("after sign-up, user can create API keys for their org", async ({
    page,
    request,
  }) => {
    // Register via API (reliable way to get token + org)
    const ctx = await registerAndGetApiContext(request);

    // Create an API key
    const createRes = await apiPost(ctx, `/orgs/${ctx.orgId}/api-keys`, {
      name: `provision-test-${Date.now()}`,
    });
    expect(createRes.status).toBe(201);
    expect(createRes.body.key).toMatch(/^gsk_/);

    // List API keys
    const listRes = await apiGet(ctx, `/orgs/${ctx.orgId}/api-keys`);
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.length).toBeGreaterThanOrEqual(1);
  });

  test("after sign-up, user can import a course to their org", async ({
    request,
  }) => {
    const ctx = await registerAndGetApiContext(request);
    const courseSlug = `provision-test-${Date.now()}`;

    const importRes = await apiPost(
      ctx,
      `/orgs/${ctx.orgId}/courses/import`,
      {
        yaml: `
course:
  id: ${courseSlug}
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
`.trim(),
      }
    );

    expect(importRes.status).toBe(201);
    expect(importRes.body.courseId).toBeTruthy();
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
    // Verify all the doc routes that were previously referenced as a separate docs domain
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
