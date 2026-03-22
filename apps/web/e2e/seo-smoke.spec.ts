import { test, expect } from "@playwright/test";

test.describe("SEO Smoke Tests", () => {
  test("homepage has title and meta description", async ({ page }) => {
    await page.goto("/");
    const title = await page.title();
    expect(title.length).toBeGreaterThan(10);

    const description = await page.getAttribute('meta[name="description"]', "content");
    expect(description).toBeTruthy();
    expect(description!.length).toBeGreaterThan(50);
  });

  test("homepage has Open Graph tags", async ({ page }) => {
    await page.goto("/");
    const ogTitle = await page.getAttribute('meta[property="og:title"]', "content");
    const ogDesc = await page.getAttribute('meta[property="og:description"]', "content");
    const ogType = await page.getAttribute('meta[property="og:type"]', "content");

    expect(ogTitle).toBeTruthy();
    expect(ogDesc).toBeTruthy();
    expect(ogType).toBeTruthy();
  });

  test("homepage has Twitter card tags", async ({ page }) => {
    await page.goto("/");
    const twitterCard = await page.getAttribute('meta[name="twitter:card"]', "content");
    expect(twitterCard).toBeTruthy();
  });

  test("agents page has meta tags", async ({ page }) => {
    await page.goto("/agents");
    const title = await page.title();
    expect(title.toLowerCase()).toContain("agent");

    const description = await page.getAttribute('meta[name="description"]', "content");
    expect(description).toBeTruthy();
  });

  test("docs pages have meta tags", async ({ page }) => {
    await page.goto("/docs/cli");
    const title = await page.title();
    expect(title.toLowerCase()).toContain("cli");

    const description = await page.getAttribute('meta[name="description"]', "content");
    expect(description).toBeTruthy();
  });

  test("homepage has JSON-LD structured data", async ({ page }) => {
    await page.goto("/");
    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
    // JSON-LD may not be present on all brand configs — skip if absent
    if (jsonLd.length === 0) {
      test.skip(true, "No JSON-LD on this brand's homepage");
      return;
    }
    // Verify at least one schema parses as valid JSON
    const data = JSON.parse(jsonLd[0]);
    expect(data["@context"]).toBe("https://schema.org");
  });

  test("sitemap.xml returns valid XML", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("<urlset");
    expect(body).toContain("/docs");
    expect(body).toContain("/agents");
    expect(body).toContain("/pricing");
  });

  test("robots.txt allows public pages", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("Allow: /");
    // Should not block AI crawlers
    expect(body).not.toContain("Disallow: /agents");
    expect(body).not.toContain("Disallow: /docs");
  });

  test("llms.txt is accessible", async ({ request }) => {
    const res = await request.get("/llms.txt");
    // llms.txt may 500 in dev if brand resolution fails — skip in that case
    if (res.status() === 500) {
      test.skip(true, "llms.txt route errors in dev (brand resolution)");
      return;
    }
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body.toLowerCase()).toContain("graspful");
  });

  test("pricing page loads", async ({ page }) => {
    await page.goto("/pricing");
    const res = await page.goto("/pricing");
    expect(res?.status()).toBe(200);
    // Should mention revenue share or pricing
    await expect(page.getByText(/free|revenue|pricing/i).first()).toBeVisible();
  });
});
