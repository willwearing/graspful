import { test, expect } from "@playwright/test";

const BACKEND_URL = "http://localhost:3000/api/v1";
const WEB_URL = "http://localhost:3001";

/**
 * Tests for agent cold-start discovery:
 * When an agent discovers Graspful for the first time, can it figure out
 * how to register and start building courses from the docs alone?
 */

// ─── llms-full.txt discovery ────────────────────────────────────────────────

test.describe("Agent Discovery — llms-full.txt", () => {
  let llmsFullContent: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.get(`${WEB_URL}/llms-full.txt`);
    expect(res.status()).toBe(200);
    llmsFullContent = await res.text();
  });

  test("has Authentication section before CLI Commands", async () => {
    const authIdx = llmsFullContent.indexOf("## Authentication");
    const cliIdx = llmsFullContent.indexOf("## CLI Commands");

    expect(authIdx).toBeGreaterThan(-1);
    expect(cliIdx).toBeGreaterThan(-1);
    expect(authIdx).toBeLessThan(cliIdx);
  });

  test("Authentication section mentions graspful register and graspful_register", async () => {
    const authSection = llmsFullContent.substring(
      llmsFullContent.indexOf("## Authentication"),
      llmsFullContent.indexOf("## CLI Commands")
    );

    expect(authSection).toContain("graspful register");
    expect(authSection).toContain("graspful_register");
  });

  test("Quick Start includes register step", async () => {
    const quickStartIdx = llmsFullContent.indexOf("## Quick Start");
    const authIdx = llmsFullContent.indexOf("## Authentication");
    const quickStartSection = llmsFullContent.substring(quickStartIdx, authIdx);

    expect(quickStartSection).toContain("graspful register");
  });

  test("MCP Tools section includes graspful_register", async () => {
    const mcpIdx = llmsFullContent.indexOf("## MCP Tools");
    const mcpSection = llmsFullContent.substring(mcpIdx);

    expect(mcpSection).toContain("### graspful_register");
    expect(mcpSection).toContain("Create a new Graspful account");
  });

  test("auth-gated MCP tools are marked as AUTH REQUIRED", async () => {
    const mcpIdx = llmsFullContent.indexOf("## MCP Tools");
    const mcpSection = llmsFullContent.substring(mcpIdx);

    expect(mcpSection).toContain("graspful_import_course (AUTH REQUIRED)");
    expect(mcpSection).toContain("graspful_publish_course (AUTH REQUIRED)");
    expect(mcpSection).toContain("graspful_import_brand (AUTH REQUIRED)");
    expect(mcpSection).toContain("graspful_list_courses (AUTH REQUIRED)");
  });

  test("Typical Agent Workflow starts with Register", async () => {
    const workflowIdx = llmsFullContent.indexOf("## Typical Agent Workflow");
    const workflowSection = llmsFullContent.substring(workflowIdx);

    expect(workflowSection).toContain("1. **Register**");
    expect(workflowSection).toContain("graspful_register");
  });
});

// ─── agents.md route ────────────────────────────────────────────────────────

test.describe("Agent Discovery — /agents.md", () => {
  test("serves AGENTS.md with Authentication section", async ({ request }) => {
    const res = await request.get(`${WEB_URL}/agents.md`);
    expect(res.status()).toBe(200);

    const content = await res.text();
    expect(content).toContain("Authentication");
    expect(content).toContain("graspful_register");
  });
});

// ─── /agents page (browser) ────────────────────────────────────────────────

test.describe("Agent Discovery — /agents page", () => {
  test("lists graspful_register in MCP tools", async ({ page }) => {
    await page.goto("/agents");
    await expect(
      page.locator("code").getByText("register", { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText("Call this first")
    ).toBeVisible();
  });

  test("workflow starts with registration step", async ({ page }) => {
    await page.goto("/agents");
    await expect(
      page.getByText("Register for an API key")
    ).toBeVisible();
  });
});

// ─── Full discovery flow: docs → register → import ──────────────────────────

test.describe("Agent Discovery — Full Flow", () => {
  test("agent can go from llms-full.txt to working course", async ({
    request,
  }) => {
    // 1. Agent fetches llms-full.txt and discovers registration is needed
    const docsRes = await request.get(`${WEB_URL}/llms-full.txt`);
    expect(docsRes.status()).toBe(200);
    const docs = await docsRes.text();
    expect(docs).toContain("graspful register");
    expect(docs).toContain("graspful_register");

    // 2. Agent registers using the API endpoint discovered in docs
    const email = `e2e-discovery-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.example.com`;
    const regRes = await request.post(`${BACKEND_URL}/auth/register`, {
      data: { email, password: "TestPassword123!" },
      headers: { "Content-Type": "application/json" },
    });
    expect(regRes.status()).toBe(201);
    const { orgSlug, apiKey } = await regRes.json();
    expect(apiKey).toMatch(/^gsk_/);

    // 3. Agent imports a course using the API key
    const courseSlug = `e2e-discovery-${Date.now()}`;
    const yaml = makeMinimalCourseYaml(courseSlug);

    const importRes = await request.post(
      `${BACKEND_URL}/orgs/${orgSlug}/courses/import`,
      {
        data: { yaml },
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );
    expect(importRes.status()).toBe(201);
    const { courseId } = await importRes.json();
    expect(courseId).toBeTruthy();
  });
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeMinimalCourseYaml(slug: string): string {
  return `
course:
  id: ${slug}
  name: "Discovery Test ${slug}"
  description: "A course for discovery flow e2e testing."
  estimatedHours: 1
  version: "1.0"

concepts:
  - id: concept-alpha
    name: "Alpha Concept"
    difficulty: 1
    estimatedMinutes: 5
    tags: [test]
    knowledgePoints:
      - id: kp-alpha-1
        instruction: "Instruction for alpha."
        problems:
          - id: p-alpha-1
            type: multiple_choice
            question: "What is 1 + 1?"
            options: ["1", "2", "3", "4"]
            correct: 1
            explanation: "1 + 1 = 2."
          - id: p-alpha-2
            type: true_false
            question: "The sky is blue."
            correct: "true"
            explanation: "Rayleigh scattering."
          - id: p-alpha-3
            type: fill_blank
            question: "Water is made of hydrogen and ___."
            correct: "oxygen"
            explanation: "H2O."

  - id: concept-beta
    name: "Beta Concept"
    difficulty: 2
    estimatedMinutes: 10
    tags: [test]
    prerequisites: [concept-alpha]
    knowledgePoints:
      - id: kp-beta-1
        instruction: "Instruction for beta."
        problems:
          - id: p-beta-1
            type: multiple_choice
            question: "What is 2 + 2?"
            options: ["2", "3", "4", "5"]
            correct: 2
            explanation: "2 + 2 = 4."
          - id: p-beta-2
            type: true_false
            question: "Earth orbits the Sun."
            correct: "true"
            explanation: "Yes it does."
          - id: p-beta-3
            type: fill_blank
            question: "The symbol for gold is ___."
            correct: "Au"
            explanation: "From Latin aurum."
`.trim();
}
