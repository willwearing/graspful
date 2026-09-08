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
  { path: "/docs/course-creation-guide", heading: /course|creation|guide/i },
  { path: "/docs/design-guide", heading: /design/i },
  { path: "/docs/glossary", heading: /glossary/i },
  { path: "/docs/how-it-works", heading: /how.*works/i },
  { path: "/docs/concepts/adaptive-diagnostics", heading: /diagnostic/i },
  { path: "/docs/concepts/knowledge-graph", heading: /knowledge.*graph/i },
  { path: "/docs/concepts/mastery-learning", heading: /mastery/i },
  { path: "/docs/concepts/spaced-repetition", heading: /spaced.*repetition/i },
  { path: "/docs/concepts/task-selection", heading: /task.*selection/i },
  { path: "/docs/concepts/gamification", heading: /gamification/i },
  { path: "/docs/concepts/learning-staircase", heading: /staircase|learning/i },
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

  test("quickstart separates authoring, draft import, and confirmed publication", async ({ page }) => {
    await page.goto("/docs/quickstart");
    const headings = await page.getByRole("heading", { level: 2 }).allTextContents();
    expect(headings.slice(0, 6).map((heading) => heading.trim())).toEqual([
      "1. Install the CLI",
      "2. Plan and author the course",
      "3. Validate and review",
      "4. Register before importing",
      "5. Import as a draft",
      "6. Publish and confirm the result",
    ]);
    const content = await page.textContent("body");
    expect(content).toContain("published: false");
    expect(content).toContain("published: true");
    expect(content).toContain("cannot pass the publication review");
    expect(content).toContain("external agent");
    expect(content).not.toMatch(/course is live!|under 5 minutes/i);
  });

  test("review gate documents the active checks", async ({ page }) => {
    await page.goto("/docs/review-gate");
    const content = await page.textContent("body");
    expect(content).toContain("publication_readiness");
    expect(content).toContain("problem_teaching_alignment");
    expect(content).not.toContain("cross_concept_coverage");
  });

  test("docs/billing states that paid subscriptions are unavailable", async ({ page }) => {
    await page.goto("/docs/billing");
    const content = await page.textContent("body");
    expect(content).toContain("Paid subscriptions are not available yet");
  });
});
