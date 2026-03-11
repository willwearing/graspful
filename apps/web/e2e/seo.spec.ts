import { test, expect } from "@playwright/test";

test.describe("SEO", () => {
  test("landing page has correct meta tags", async ({ page }) => {
    await page.goto("/");

    // Title should contain brand name
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(10);

    // Meta description
    const description = await page
      .locator('meta[name="description"]')
      .getAttribute("content");
    expect(description).toBeTruthy();
    expect(description!.length).toBeGreaterThan(20);

    // OpenGraph tags
    const ogTitle = await page
      .locator('meta[property="og:title"]')
      .getAttribute("content");
    expect(ogTitle).toBeTruthy();

    const ogDescription = await page
      .locator('meta[property="og:description"]')
      .getAttribute("content");
    expect(ogDescription).toBeTruthy();

    const ogImage = await page
      .locator('meta[property="og:image"]')
      .getAttribute("content");
    expect(ogImage).toBeTruthy();
    // OG image should be an absolute URL
    expect(ogImage).toMatch(/^https?:\/\//);

    const ogType = await page
      .locator('meta[property="og:type"]')
      .getAttribute("content");
    expect(ogType).toBe("website");

    // Twitter card
    const twitterCard = await page
      .locator('meta[name="twitter:card"]')
      .getAttribute("content");
    expect(twitterCard).toBe("summary_large_image");
  });

  test("pricing page has page-specific title", async ({ page }) => {
    await page.goto("/pricing");
    const title = await page.title();
    expect(title.toLowerCase()).toContain("pricing");
  });

  test("JSON-LD structured data is present on landing page", async ({
    page,
  }) => {
    await page.goto("/");
    const jsonLdScripts = page.locator(
      'script[type="application/ld+json"]'
    );
    const count = await jsonLdScripts.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Parse and validate first JSON-LD block
    const content = await jsonLdScripts.first().textContent();
    expect(content).toBeTruthy();
    const parsed = JSON.parse(content!);
    expect(parsed["@context"]).toBe("https://schema.org");
    expect(parsed["@type"]).toBeTruthy();
  });

  test("sitemap.xml returns valid XML", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("<urlset");
    expect(body).toContain("<loc>");
    // Should include home, pricing, sign-up at minimum
    expect(body).toContain("/pricing");
    expect(body).toContain("/sign-up");
  });

  test("robots.txt returns valid content", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("User-Agent:");
    expect(body).toContain("Allow: /");
    expect(body).toContain("Disallow: /dashboard");
    expect(body).toContain("Sitemap:");
  });
});
