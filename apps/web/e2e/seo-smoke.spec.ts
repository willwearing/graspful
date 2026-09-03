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

  test("AI course builder page loads with canonical metadata", async ({ page }) => {
    const response = await page.goto("/ai-course-builder");

    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /AI course builder.*learning that adapts/i,
      }),
    ).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://graspful.ai/ai-course-builder",
    );
  });

  test("AI course builder stays usable on desktop and mobile", async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") runtimeErrors.push(message.text());
    });
    page.on("pageerror", (error) => runtimeErrors.push(error.message));

    for (const viewport of [
      { width: 1280, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/ai-course-builder");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByRole("link", { name: "Build your first course" })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true);
    }

    expect(runtimeErrors).toEqual([]);
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
    // JSON-LD can vary across brand configurations.
    if (jsonLd.length === 0) {
      test.skip(true, "No JSON-LD on this brand's homepage");
      return;
    }
    // Verify at least one schema parses as valid JSON
    const data = JSON.parse(jsonLd[0]);
    expect(data["@context"]).toBe("https://schema.org");

    const schemas = jsonLd.map((value) => JSON.parse(value));
    const schemaTypes = schemas.map((schema) => schema["@type"]);
    expect(schemaTypes.filter((type) => type === "SoftwareApplication")).toHaveLength(1);
    expect(schemaTypes).not.toContain("Course");
    expect(schemaTypes).not.toContain("EducationalOccupationalCredential");
    const website = schemas.find((schema) => schema["@type"] === "WebSite");
    expect(website?.potentialAction).toBeUndefined();
  });

  test("sitemap.xml returns valid XML", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("<urlset");
    expect(body).toContain("/docs");
    expect(body).toContain("/agents");
    expect(body).toContain("/ai-course-builder");
    expect(body).toContain("/pricing");
  });

  test("robots.txt allows public pages", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("Allow: /");
    // Crawlers need access to private pages to read their noindex metadata.
    expect(body).not.toContain("Disallow:");
    for (const userAgent of [
      "OAI-SearchBot",
      "ClaudeBot",
      "Claude-User",
      "Claude-SearchBot",
      "PerplexityBot",
      "Perplexity-User",
    ]) {
      expect(body).toContain(`User-Agent: ${userAgent}`);
    }
  });

  test("llms.txt is accessible", async ({ request }) => {
    const res = await request.get("/llms.txt");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/markdown");
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
