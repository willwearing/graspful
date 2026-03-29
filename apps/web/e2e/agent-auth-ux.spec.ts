import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import * as path from "path";

const BACKEND_URL = "http://localhost:3000/api/v1";

/**
 * Tests for agent auth UX improvements:
 * 1. Auth-gated API endpoints return prescriptive errors when unauthenticated
 * 2. An authenticated flow works end-to-end (register in test env → get API key → use it)
 * 3. MCP tool definitions contain auth prerequisite text
 */

test.describe("Agent Auth UX — Prescriptive Errors", () => {
  test("unauthenticated course import returns 401 with actionable message", async ({
    request,
  }) => {
    const res = await request.post(
      `${BACKEND_URL}/orgs/fake-org/courses/import`,
      {
        data: { yaml: "course:\n  id: test", publish: false },
        headers: { "Content-Type": "application/json" },
        // No Authorization header
      }
    );

    expect(res.status()).toBe(401);
    const body = await res.json();
    // The error should tell the agent what to do, not just "Unauthorized"
    expect(body.message).toBeDefined();
  });

  test("unauthenticated course list returns 401", async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/orgs/fake-org/courses`, {
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status()).toBe(401);
  });

  test("unauthenticated publish returns 401", async ({ request }) => {
    const res = await request.post(
      `${BACKEND_URL}/orgs/fake-org/courses/fake-id/publish`,
      {
        data: {},
        headers: { "Content-Type": "application/json" },
      }
    );

    expect(res.status()).toBe(401);
  });
});

test.describe("Agent Auth UX — Register → Import Flow", () => {
  test("register via API, then import course with returned API key", async ({
    request,
  }) => {
    // 1. Register
    const email = `e2e-auth-ux-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.example.com`;
    const regRes = await request.post(`${BACKEND_URL}/auth/register`, {
      data: { email, password: "TestPassword123!" },
      headers: { "Content-Type": "application/json" },
    });

    expect(regRes.status()).toBe(201);
    const { orgSlug, apiKey } = await regRes.json();
    expect(apiKey).toMatch(/^gsk_/);
    expect(orgSlug).toBeTruthy();

    // 2. Import a course using the API key
    const courseSlug = `e2e-auth-ux-course-${Date.now()}`;
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
    const importBody = await importRes.json();
    expect(importBody.courseId).toBeTruthy();

    // 3. List courses using the same API key
    const listRes = await request.get(
      `${BACKEND_URL}/orgs/${orgSlug}/courses`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    expect(listRes.status()).toBe(200);
    const courses = await listRes.json();
    expect(Array.isArray(courses)).toBe(true);
    expect(courses.length).toBeGreaterThanOrEqual(1);
  });
});

test.describe("Agent Auth UX — MCP Tool Descriptions", () => {
  test("auth-gated tool descriptions mention terminal/browser auth and GRASPFUL_API_KEY", async () => {
    // Read the MCP source to verify tool descriptions contain auth guidance
    const mcpSource = require("fs").readFileSync(
      path.resolve(__dirname, "../../../packages/mcp/src/index.ts"),
      "utf-8"
    );

    const authGatedTools = [
      "graspful_import_course",
      "graspful_publish_course",
      "graspful_import_brand",
      "graspful_list_courses",
    ];

    for (const toolName of authGatedTools) {
      // Find the tool definition block
      const toolIdx = mcpSource.indexOf(`name: '${toolName}'`);
      expect(toolIdx).toBeGreaterThan(-1);

      // Extract the description (next ~500 chars should contain it)
      const descriptionBlock = mcpSource.substring(toolIdx, toolIdx + 600);

      expect(descriptionBlock).toContain("graspful register");
      expect(descriptionBlock).toContain("GRASPFUL_API_KEY");
      expect(descriptionBlock).toContain("Requires authentication");
    }
  });

  test("graspful_register tool is removed from MCP tool definitions", async () => {
    const mcpSource = require("fs").readFileSync(
      path.resolve(__dirname, "../../../packages/mcp/src/index.ts"),
      "utf-8"
    );

    expect(mcpSource).not.toContain("name: 'graspful_register'");
  });

  test("AGENTS.md documents auth-first workflow", async () => {
    const agentsMd = require("fs").readFileSync(
      path.resolve(__dirname, "../../../AGENTS.md"),
      "utf-8"
    );

    // Auth section should appear before Step 1
    const authIdx = agentsMd.indexOf("Authentication");
    const step1Idx = agentsMd.indexOf("## Step 1");
    expect(authIdx).toBeGreaterThan(-1);
    expect(authIdx).toBeLessThan(step1Idx);

    expect(agentsMd).toContain("graspful register");
    expect(agentsMd).toContain("GRASPFUL_API_KEY");
  });
});

/** Minimal valid course YAML for testing. */
function makeMinimalCourseYaml(slug: string): string {
  return `
course:
  id: ${slug}
  name: "Auth UX Test ${slug}"
  description: "A course for auth UX e2e testing."
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
