import { test, expect } from "@playwright/test";

const POST_PATH = "/blog/turn-docs-into-a-course-with-claude-code";

test.describe("Blog smoke tests", () => {
  test("/blog loads and links to the first post", async ({ page }) => {
    const res = await page.goto("/blog");
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(/blog/i);
    await expect(page.locator(`a[href="${POST_PATH}"]`).first()).toBeVisible();
  });

  test(`${POST_PATH} loads with heading, Article JSON-LD and CTA`, async ({ page }) => {
    const res = await page.goto(POST_PATH);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(
      /docs into a course with claude code/i,
    );
    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(jsonLd.some((text) => text.includes('"@type":"Article"'))).toBe(true);
    await expect(page.locator('a[href="/docs/quickstart"]').first()).toBeVisible();
  });

  test("/blog/ai-generated-course-quality-checklist loads with heading, Article JSON-LD and links", async ({ page }) => {
    const path = "/blog/ai-generated-course-quality-checklist";
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(
      /ai-generated course quality checklist/i,
    );
    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(jsonLd.some((text) => text.includes('"@type":"Article"'))).toBe(true);
    await expect(page.locator('a[href="/docs/review-gate"]').first()).toBeVisible();
    await expect(page.locator(`a[href="${POST_PATH}"]`).first()).toBeVisible();
    await expect(page.locator('a[href="/docs/quickstart"]').first()).toBeVisible();
  });

  test("/docs/review-gate links to the quality checklist", async ({ page }) => {
    await page.goto("/docs/review-gate");
    await expect(
      page.locator('main a[href="/blog/ai-generated-course-quality-checklist"]').first(),
    ).toBeVisible();
  });

  test("unknown blog slugs return 404", async ({ page }) => {
    const res = await page.goto("/blog/does-not-exist");
    expect(res?.status()).toBe(404);
  });
});
