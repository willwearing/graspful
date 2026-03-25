import { test, expect } from "@playwright/test";

const BACKEND_URL = "http://localhost:3000/api/v1";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Shared state across serial tests ────────────────────────────────────────

let apiKey: string;
let orgSlug: string;

function authHeaders(extraHeaders?: Record<string, string>) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    ...extraHeaders,
  };
}

test.describe.serial("Agent Brand Import (API only)", () => {
  // ── Step 1: Register ──────────────────────────────────────────

  test("register a new user", async ({ request }) => {
    const email = `e2e-brand-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.example.com`;

    const res = await request.post(`${BACKEND_URL}/auth/register`, {
      data: { email, password: "TestPassword123!" },
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.userId).toMatch(UUID_RE);
    expect(body.orgSlug).toBeTruthy();
    expect(body.apiKey).toMatch(/^gsk_/);

    apiKey = body.apiKey;
    orgSlug = body.orgSlug;
  });

  // ── Step 2: Import brand with correct flat DTO shape ──────────

  test("import brand with correct flat DTO shape", async ({ request }) => {
    const slug = `e2e-brand-${Date.now()}`;
    const dto = {
      slug,
      name: "Test Brand",
      domain: `${slug}.graspful.com`,
      tagline: "Test tagline",
      logoUrl: "/logo.svg",
      orgSlug,
      theme: { preset: "blue" },
      landing: {
        hero: { headline: "Test", subheadline: "Test", ctaText: "Go" },
        features: { heading: "Features", items: [] },
        howItWorks: { heading: "How", items: [] },
        faq: [],
      },
      seo: { title: "Test", description: "Test", keywords: [] },
      pricing: {},
    };

    const res = await request.post(`${BACKEND_URL}/brands`, {
      data: dto,
      headers: authHeaders(),
    });

    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.brand).toBeTruthy();
  });

  // ── Step 3: Reject invalid brand payload with 400 ─────────────

  test("reject invalid brand payload with 400", async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/brands`, {
      data: {
        brand: { id: "test", name: "Bad" },
        theme: {},
      },
      headers: authHeaders(),
    });

    expect(res.status()).toBe(400);
  });
});
