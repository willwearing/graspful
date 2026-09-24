import { randomUUID } from "node:crypto";
import { expect, test as base, type APIRequestContext, type Page } from "@playwright/test";
import { getE2eEnvironment } from "../../../backend/scripts/e2e-env";
import { getBrowserAccessToken } from "../../web/e2e/helpers/auth";

const env = getE2eEnvironment(process.env);
const api = env.NEXT_PUBLIC_BACKEND_URL;
const site = "http://localhost:3002";
const password = "CreatorSiteTestPassword123!";
const adminHeaders = {
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
};

interface CreatorAccount {
  email: string;
  userId: string;
  orgId: string;
  orgSlug: string;
  apiKey: string;
}

const test = base.extend<{
  register: () => Promise<CreatorAccount>;
}>({
  register: async ({ request }, runTest) => {
    const accounts: CreatorAccount[] = [];
    await runTest(async () => {
      const email = `site-creator-${randomUUID()}@test.example.com`;
      const response = await request.post(`${api}/auth/register`, { data: { email, password } });
      expect(response.status()).toBe(201);
      const registration = await response.json() as Omit<CreatorAccount, "email" | "orgId">;
      const account = { ...registration, email, orgId: "" };
      accounts.push(account);
      const org = await request.get(`${env.SUPABASE_URL}/rest/v1/organizations`, {
        headers: adminHeaders, params: { slug: `eq.${account.orgSlug}`, select: "id" },
      });
      expect(org.status()).toBe(200);
      const rows = await org.json() as Array<{ id: string }>;
      expect(rows).toHaveLength(1);
      account.orgId = rows[0].id;
      return account;
    });

    // Delete only records owned by this fixture, from the validated local services.
    const cleanupFailures: string[] = [];
    async function remove(url: string, label: string, params?: Record<string, string>) {
      try {
        const response = await request.delete(url, { headers: adminHeaders, params });
        if (!response.ok()) cleanupFailures.push(`${label}: HTTP ${response.status()}`);
      } catch (error) {
        cleanupFailures.push(`${label}: ${error instanceof Error ? error.message : "request failed"}`);
      }
    }
    for (const account of accounts) {
      for (const [table, column, value] of [
        ["brands", "org_slug", account.orgSlug],
        ["organizations", "slug", account.orgSlug],
        ["users", "id", account.userId],
      ]) {
        await remove(`${env.SUPABASE_URL}/rest/v1/${table}`, `local ${table} fixture`, { [column]: `eq.${value}` });
      }
      await remove(`${env.SUPABASE_URL}/auth/v1/admin/users/${account.userId}`, "local auth fixture");
    }
    expect(cleanupFailures, "All creator fixtures must be removed").toEqual([]);
  },
});

async function signIn(page: Page, account: CreatorAccount) {
  await page.goto("/sign-in");
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page).toHaveURL(`${site}/creator`);
  await expectCreatorShell(page);
}

async function expectCreatorShell(page: Page) {
  const header = page.getByRole("banner");
  await expect(header.getByRole("link", { name: "Dashboard", exact: true })).toHaveAttribute("href", "/creator");
  await expect(header.getByRole("link", { name: "API Keys", exact: true })).toHaveAttribute("href", "/creator/api-keys");
  await expect(header.getByRole("link", { name: "New Course", exact: true })).toHaveAttribute("href", "/creator/manage");
  await expect(header.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign In", exact: true })).toHaveCount(0);
}

async function createNamedKey(request: APIRequestContext, account: CreatorAccount, name: string) {
  const response = await request.post(`${api}/orgs/${account.orgSlug}/api-keys`, {
    headers: { Authorization: `Bearer ${account.apiKey}` }, data: { name },
  });
  expect(response.status()).toBe(201);
  return response.json() as Promise<{ id: string; key: string }>;
}

async function addMembership(request: APIRequestContext, account: CreatorAccount, org: CreatorAccount, role: "member" | "admin") {
  const response = await request.post(`${env.SUPABASE_URL}/rest/v1/org_memberships`, {
    headers: adminHeaders,
    data: { id: randomUUID(), user_id: account.userId, org_id: org.orgId, role, updated_at: new Date().toISOString() },
  });
  expect(response.status()).toBe(201);
}

async function openKeyPage(page: Page, account: CreatorAccount) {
  const list = page.waitForResponse((response) =>
    response.request().method() === "GET" && response.url() === `${api}/orgs/${account.orgSlug}/api-keys`,
  );
  await page.goto("/creator/api-keys");
  expect((await list).status()).toBe(200);
  await expectCreatorShell(page);
  await expect(page.getByRole("button", { name: "Create API Key", exact: true })).toBeEnabled();
}

test.describe("Site creator access", () => {
  for (const route of ["/creator", "/creator/manage", "/creator/api-keys"]) {
    test(`anonymous ${route} access redirects without creator controls`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL((url) => url.origin === site && url.pathname === "/sign-in");
      await expect(page.getByText("Welcome back", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Sign In", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Sign out", exact: true })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "API Keys", exact: true })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "New Course", exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Create API Key", exact: true })).toHaveCount(0);
    });
  }

  test("an authenticated creator can navigate the dashboard, editor, and API keys", async ({ page, register }) => {
    const account = await register();
    await signIn(page, account);
    await expect(page.getByRole("heading", { name: "Creator Dashboard", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your Courses", exact: true })).toBeVisible();
    await expect(page.getByText("No courses yet. Create your first course to get started.", { exact: true })).toBeVisible();

    await page.getByRole("banner").getByRole("link", { name: "New Course", exact: true }).click();
    await expect(page).toHaveURL(`${site}/creator/manage`);
    await expect(page.getByRole("heading", { name: "New course", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Course content", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("button", { name: "Import draft", exact: true })).toBeEnabled();
    await expectCreatorShell(page);

    await openKeyPage(page, account);
    await expect(page.getByRole("heading", { name: "API Keys", exact: true })).toBeVisible();
    await expect(page.getByText("default", { exact: true })).toBeVisible();
    await page.getByRole("banner").getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(`${site}/`);
    await page.goto("/creator/api-keys");
    await expect(page).toHaveURL((url) => url.origin === site && url.pathname === "/sign-in");
    await expect(page.getByRole("button", { name: "Create API Key", exact: true })).toHaveCount(0);
  });

  test("API keys can be created, read once, used, and revoked with confirmation", async ({ page, request, register }) => {
    const account = await register();
    await signIn(page, account);
    await openKeyPage(page, account);
    const name = `Site key ${randomUUID()}`;
    await page.getByRole("button", { name: "Create API Key", exact: true }).click();
    await page.getByRole("textbox", { name: "API key name", exact: true }).fill(name);
    const created = page.waitForResponse((response) =>
      response.request().method() === "POST" && response.url() === `${api}/orgs/${account.orgSlug}/api-keys`,
    );
    await page.getByRole("button", { name: "Create Key", exact: true }).click();
    const createdResponse = await created;
    expect(createdResponse.status()).toBe(201);
    const { id, key } = await createdResponse.json() as { id: string; key: string };
    await expect(page.getByText("Your new API key (shown once):", { exact: true })).toBeVisible();
    await expect(page.getByText(key, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy API key", exact: true })).toBeVisible();
    await expect(page.getByText(name, { exact: true })).toBeVisible();
    expect((await request.get(`${api}/orgs/${account.orgSlug}/courses`, {
      headers: { Authorization: `Bearer ${key}` },
    })).status()).toBe(200);

    await page.reload();
    await expect(page.getByText(name, { exact: true })).toBeVisible();
    await expect(page.getByText(key, { exact: true })).toHaveCount(0);
    await expect(page.getByText("Your new API key (shown once):", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: `Revoke ${name}`, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Revoke API Key", exact: true });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect((await request.get(`${api}/orgs/${account.orgSlug}/courses`, {
      headers: { Authorization: `Bearer ${key}` },
    })).status()).toBe(200);

    await page.getByRole("button", { name: `Revoke ${name}`, exact: true }).click();
    const revoked = page.waitForResponse((response) =>
      response.request().method() === "DELETE" && response.url() === `${api}/orgs/${account.orgSlug}/api-keys/${id}`,
    );
    await dialog.getByRole("button", { name: "Revoke Key", exact: true }).click();
    expect((await revoked).status()).toBe(200);
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText(name, { exact: true })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("button", { name: "Create API Key", exact: true })).toBeEnabled();
    await expect(page.getByText(name, { exact: true })).toHaveCount(0);
    expect((await request.get(`${api}/orgs/${account.orgSlug}/courses`, {
      headers: { Authorization: `Bearer ${key}` },
    })).status()).toBe(401);
  });

  for (const membership of ["none", "member"] as const) {
    test(`an untrusted creator-org cookie is ignored when membership is ${membership}`, async ({ page, request, register }) => {
      const account = await register();
      const foreign = await register();
      const ownKeyName = `Own key ${randomUUID()}`;
      const foreignKeyName = `Foreign key ${randomUUID()}`;
      await createNamedKey(request, account, ownKeyName);
      const foreignKey = await createNamedKey(request, foreign, foreignKeyName);
      if (membership === "member") {
        await addMembership(request, account, foreign, "member");
      }
      await signIn(page, account);
      await page.context().addCookies([{ name: "creator-org", value: foreign.orgSlug, url: site }]);
      const requestedOrgs: string[] = [];
      page.on("request", (request) => {
        const match = new URL(request.url()).pathname.match(/^\/api\/v1\/orgs\/([^/]+)\/api-keys(?:\/|$)/);
        if (match) requestedOrgs.push(decodeURIComponent(match[1]));
      });
      await openKeyPage(page, account);
      await expect(page.getByText(ownKeyName, { exact: true })).toBeVisible();
      await expect(page.getByText(foreignKeyName, { exact: true })).toHaveCount(0);
      await expect(page.getByRole("alert")).toHaveCount(0);
      const token = await getBrowserAccessToken(page);
      expect(token).toBeTruthy();
      const denied = await request.get(`${api}/orgs/${foreign.orgSlug}/api-keys`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(denied.status()).toBe(403);

      const name = `Safe cookie key ${randomUUID()}`;
      await page.getByRole("button", { name: "Create API Key", exact: true }).click();
      await page.getByRole("textbox", { name: "API key name", exact: true }).fill(name);
      await page.getByRole("button", { name: "Create Key", exact: true }).click();
      await expect(page.getByText(name, { exact: true })).toBeVisible();
      expect(requestedOrgs.length).toBeGreaterThan(1);
      expect(new Set(requestedOrgs)).toEqual(new Set([account.orgSlug]));
      const foreignKeys = await request.get(`${api}/orgs/${foreign.orgSlug}/api-keys`, {
        headers: { Authorization: `Bearer ${foreign.apiKey}` },
      });
      expect(foreignKeys.status()).toBe(200);
      const keys = await foreignKeys.json() as Array<{ id: string; name: string }>;
      expect(keys).toEqual(expect.arrayContaining([expect.objectContaining({ id: foreignKey.id, name: foreignKeyName })]));
      expect(keys.map((key) => key.name)).not.toContain(name);
    });
  }

  test("a creator-org cookie selects an eligible second admin organization", async ({ page, request, register }) => {
    const account = await register();
    const other = await register();
    const ownKeyName = `Personal key ${randomUUID()}`;
    const otherKeyName = `Admin organization key ${randomUUID()}`;
    await createNamedKey(request, account, ownKeyName);
    await createNamedKey(request, other, otherKeyName);
    await addMembership(request, account, other, "admin");
    await signIn(page, account);
    await page.context().addCookies([{ name: "creator-org", value: other.orgSlug, url: site }]);
    await openKeyPage(page, other);
    await expect(page.getByText(otherKeyName, { exact: true })).toBeVisible();
    await expect(page.getByText(ownKeyName, { exact: true })).toHaveCount(0);
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
});
