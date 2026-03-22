import { test, expect } from "@playwright/test";

const DOCS_PAGES = [
  { path: "/docs", heading: /documentation/i },
  { path: "/docs/quickstart", heading: /quick\s*start/i },
  { path: "/docs/cli", heading: /cli/i },
  { path: "/docs/mcp", heading: /mcp/i },
  { path: "/docs/course-schema", heading: /course/i },
  { path: "/docs/brand-schema", heading: /brand/i },
  { path: "/docs/billing", heading: /billing|revenue/i },
  { path: "/docs/review-gate", heading: /review|quality/i },
];

test.describe("Docs Pages Smoke Tests", () => {
  for (const { path, heading } of DOCS_PAGES) {
    test(`${path} loads and has heading`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(heading);
    });
  }

  test("docs index has navigation links", async ({ page }) => {
    await page.goto("/docs");
    // Should have links to sub-pages
    await expect(page.getByRole("link", { name: /quickstart/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /cli/i }).first()).toBeVisible();
  });

  test("docs pages have sidebar navigation", async ({ page }) => {
    await page.goto("/docs/cli");
    // Sidebar should have links to other docs pages
    const sidebar = page.locator("nav");
    await expect(sidebar.first()).toBeVisible();
  });

  test("docs/cli has command content", async ({ page }) => {
    await page.goto("/docs/cli");
    // Check page contains CLI commands (may be in code blocks)
    const content = await page.textContent("body");
    expect(content).toContain("validate");
    expect(content).toContain("import");
    expect(content).toContain("review");
  });

  test("docs/mcp has tool content", async ({ page }) => {
    await page.goto("/docs/mcp");
    const content = await page.textContent("body");
    expect(content).toContain("scaffold_course");
    expect(content).toContain("import_course");
  });

  test("docs/billing has revenue share info", async ({ page }) => {
    await page.goto("/docs/billing");
    const content = await page.textContent("body");
    expect(content).toMatch(/70.*30|30.*70/);
  });
});
