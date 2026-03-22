import { test, expect } from "@playwright/test";
import { apiGetPublic } from "./helpers/api-auth";

/**
 * Brand API tests — these endpoints are public (no auth guard on BrandsController).
 * We test against seeded brand data rather than creating new brands,
 * since brand creation triggers Vercel domain provisioning as a side effect.
 */
test.describe("Brands", () => {
  test("list all brands returns non-empty array", async ({ request }) => {
    const { status, body } = await apiGetPublic(request, "/brands");

    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);
  });

  test("get brand by slug returns brand details", async ({ request }) => {
    // First, list brands to get a valid slug
    const listRes = await apiGetPublic(request, "/brands");
    expect(listRes.status).toBe(200);
    expect(listRes.body.length).toBeGreaterThanOrEqual(1);

    const slug = listRes.body[0].slug;
    const { status, body } = await apiGetPublic(request, `/brands/${slug}`);

    expect(status).toBe(200);
    expect(body.slug).toBe(slug);
    expect(body.name).toBeTruthy();
    expect(body.domain).toBeTruthy();
    expect(body.orgId).toBeTruthy();
  });

  test("get brand by domain returns brand", async ({ request }) => {
    // Get a brand to know its domain
    const listRes = await apiGetPublic(request, "/brands");
    const brand = listRes.body[0];
    const domain = brand.domain;

    const { status, body } = await apiGetPublic(
      request,
      `/brands/by-domain/${domain}`
    );

    expect(status).toBe(200);
    expect(body.slug).toBe(brand.slug);
    expect(body.domain).toBe(domain);
  });

  test("non-existent brand slug returns 404", async ({ request }) => {
    const { status } = await apiGetPublic(
      request,
      "/brands/definitely-not-a-real-brand-slug-xyz"
    );
    expect(status).toBe(404);
  });

  test("non-existent domain returns 404", async ({ request }) => {
    const { status } = await apiGetPublic(
      request,
      "/brands/by-domain/this-domain-does-not-exist.example.com"
    );
    expect(status).toBe(404);
  });
});
