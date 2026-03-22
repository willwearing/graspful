import { test, expect } from "@playwright/test";
import {
  signUpAndGetApiContext,
  apiPost,
  apiGet,
  type ApiTestContext,
} from "./helpers/api-auth";

/** Minimal valid course YAML for testing import/review. */
function makeTestCourseYaml(slug: string): string {
  return `
course:
  id: ${slug}
  name: "E2E Test Course ${slug}"
  description: "A minimal course for e2e testing."
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
        instruction: "This is the instruction for alpha."
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
            explanation: "The sky appears blue due to Rayleigh scattering."
          - id: p-alpha-3
            type: fill_blank
            question: "Water is made of hydrogen and ___."
            correct: "oxygen"
            explanation: "H2O = hydrogen + oxygen."

  - id: concept-beta
    name: "Beta Concept"
    difficulty: 2
    estimatedMinutes: 10
    tags: [test]
    prerequisites: [concept-alpha]
    knowledgePoints:
      - id: kp-beta-1
        instruction: "This is the instruction for beta."
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
            explanation: "The Earth revolves around the Sun."
          - id: p-beta-3
            type: fill_blank
            question: "The chemical symbol for gold is ___."
            correct: "Au"
            explanation: "Au comes from the Latin 'aurum'."
`.trim();
}

test.describe("Course Import", () => {
  let ctx: ApiTestContext;

  test.beforeEach(async ({ page, request }) => {
    ctx = await signUpAndGetApiContext(page, request);
  });

  test("import course YAML creates draft", async () => {
    const slug = `e2e-import-${Date.now()}`;
    const yaml = makeTestCourseYaml(slug);

    const { status, body } = await apiPost(
      ctx,
      `/orgs/${ctx.orgId}/courses/import`,
      { yaml }
    );

    expect(status).toBe(201);
    expect(body.courseId).toBeTruthy();
    expect(body.created).toBeDefined();

    // Verify the course exists via list endpoint
    const listRes = await apiGet(ctx, `/orgs/${ctx.orgId}/courses`);
    expect(listRes.status).toBe(200);
    const course = listRes.body.find((c: any) => c.slug === slug);
    expect(course).toBeTruthy();
    expect(course.isPublished).toBe(false);
  });

  test("review course YAML returns quality checks", async () => {
    const slug = `e2e-review-${Date.now()}`;
    const yaml = makeTestCourseYaml(slug);

    const { status, body } = await apiPost(
      ctx,
      `/orgs/${ctx.orgId}/courses/review`,
      { yaml }
    );

    expect(status).toBe(201);
    expect(body.passed).toBeDefined();
    expect(typeof body.passed).toBe("boolean");
    expect(body.score).toBeTruthy();
    expect(body.stats).toBeDefined();
    expect(body.stats.concepts).toBe(2);
    expect(body.stats.kps).toBe(2);
    expect(body.stats.problems).toBe(6);
  });

  test("import with publish runs review gate", async () => {
    const slug = `e2e-pub-${Date.now()}`;
    const yaml = makeTestCourseYaml(slug);

    const { status, body } = await apiPost(
      ctx,
      `/orgs/${ctx.orgId}/courses/import`,
      { yaml, publish: true }
    );

    expect(status).toBe(201);
    expect(body.courseId).toBeTruthy();
    expect(body.review).toBeDefined();
    expect(body.review.passed).toBeDefined();
    expect(body.review.score).toBeTruthy();
  });

  test("publish draft course", async () => {
    const slug = `e2e-draft-pub-${Date.now()}`;
    const yaml = makeTestCourseYaml(slug);

    // Import as draft
    const importRes = await apiPost(
      ctx,
      `/orgs/${ctx.orgId}/courses/import`,
      { yaml }
    );
    expect(importRes.status).toBe(201);
    const courseId = importRes.body.courseId;

    // Publish it
    const pubRes = await apiPost(
      ctx,
      `/orgs/${ctx.orgId}/courses/${courseId}/publish`,
      {}
    );
    expect(pubRes.status).toBe(201);
    expect(pubRes.body.published).toBe(true);
    expect(pubRes.body.review).toBeDefined();
    expect(pubRes.body.review.passed).toBe(true);
  });

  test("invalid YAML returns validation error", async () => {
    const { status } = await apiPost(
      ctx,
      `/orgs/${ctx.orgId}/courses/import`,
      { yaml: "this is not: [valid: course: yaml" }
    );

    // Should return a 400 or 500 error, not 200/201
    expect(status).toBeGreaterThanOrEqual(400);
  });
});
