import { test, expect } from "@playwright/test";
import { apiGetPublic } from "./helpers/api-auth";

/**
 * Brand API tests — public GET endpoints.
 * POST/PATCH/DELETE require auth and are covered by integration tests.
 */
test.describe("Brands", () => {
  test("list brands returns array", async ({ request }) => {
    const { status, body } = await apiGetPublic(request, "/brands");

    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  test("get brand by slug — seeded brand if available", async ({ request }) => {
    const listRes = await apiGetPublic(request, "/brands");
    test.skip(listRes.body.length === 0, "No seeded brands — skipping");

    const slug = listRes.body[0].slug;
    const { status, body } = await apiGetPublic(request, `/brands/${slug}`);

    expect(status).toBe(200);
    expect(body.slug).toBe(slug);
    expect(body.name).toBeTruthy();
    expect(body.domain).toBeTruthy();
  });

  test("get brand by domain — seeded brand if available", async ({ request }) => {
    const listRes = await apiGetPublic(request, "/brands");
    test.skip(listRes.body.length === 0, "No seeded brands — skipping");

    const brand = listRes.body[0];
    const { status, body } = await apiGetPublic(
      request,
      `/brands/by-domain/${brand.domain}`
    );

    expect(status).toBe(200);
    expect(body.slug).toBe(brand.slug);
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
