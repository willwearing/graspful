import { test, expect } from "@playwright/test";
import {
  signUpAndGetApiContext,
  apiPost,
  apiGet,
  apiDelete,
  apiGetWithKey,
  type ApiTestContext,
} from "./helpers/api-auth";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

test.describe("API Keys", () => {
  let ctx: ApiTestContext;

  test.beforeEach(async ({ page, request }) => {
    ctx = await signUpAndGetApiContext(page, request);
  });

  test("create API key returns key with gsk_ prefix", async () => {
    const { status, body } = await apiPost(
      ctx,
      `/orgs/${ctx.orgId}/api-keys`,
      { name: `test-key-${Date.now()}` }
    );

    expect(status).toBe(201);
    expect(body.key).toBeTruthy();
    expect(body.key).toMatch(/^gsk_/);
    expect(body.id).toMatch(UUID_RE);
  });

  test("list API keys shows created key", async () => {
    const keyName = `list-test-${Date.now()}`;

    // Create a key
    const createRes = await apiPost(ctx, `/orgs/${ctx.orgId}/api-keys`, {
      name: keyName,
    });
    expect(createRes.status).toBe(201);
    const keyPrefix = createRes.body.key.slice(0, 12);

    // List keys
    const { status, body } = await apiGet(ctx, `/orgs/${ctx.orgId}/api-keys`);
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);

    const found = body.find((k: any) => k.name === keyName);
    expect(found).toBeTruthy();
    expect(found.keyPrefix).toBe(keyPrefix);
    // Full key should NOT be in the list response
    expect(found.key).toBeUndefined();
  });

  test("revoke API key removes it from list", async () => {
    // Create a key
    const createRes = await apiPost(ctx, `/orgs/${ctx.orgId}/api-keys`, {
      name: `revoke-test-${Date.now()}`,
    });
    expect(createRes.status).toBe(201);
    const keyId = createRes.body.id;

    // Delete the key
    const deleteRes = await apiDelete(
      ctx,
      `/orgs/${ctx.orgId}/api-keys/${keyId}`
    );
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.deleted).toBe(true);

    // Verify it's gone
    const listRes = await apiGet(ctx, `/orgs/${ctx.orgId}/api-keys`);
    const found = listRes.body.find((k: any) => k.id === keyId);
    expect(found).toBeUndefined();
  });

  test("authenticate with API key", async () => {
    // Create a key
    const createRes = await apiPost(ctx, `/orgs/${ctx.orgId}/api-keys`, {
      name: `auth-test-${Date.now()}`,
    });
    expect(createRes.status).toBe(201);
    const rawKey = createRes.body.key;

    // Use the API key to call a protected endpoint (list courses for this org)
    const { status } = await apiGetWithKey(
      ctx.request,
      `/orgs/${ctx.orgId}/courses`,
      rawKey
    );
    expect(status).toBe(200);
  });

  test("invalid API key returns 401", async ({ request }) => {
    const { status } = await apiGetWithKey(
      request,
      `/orgs/${ctx.orgId}/courses`,
      "gsk_invalid_key_that_does_not_exist"
    );
    expect(status).toBe(401);
  });
});
