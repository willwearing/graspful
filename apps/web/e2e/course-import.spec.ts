import { test, expect } from "@playwright/test";
import {
  signUpAndGetApiContext,
  apiPost,
  apiGet,
  type ApiTestContext,
} from "./helpers/api-auth";

/** Complete authored content for draft, review, publication, and replacement tests. */
function makeTestCourseYaml(slug: string): string {
  return `
course:
  id: ${slug}
  name: "E2E Test Course ${slug}"
  description: "Add whole numbers and use subtraction to check a sum."
  estimatedHours: 1
  version: "1.0"

concepts:
  - id: concept-alpha
    name: "Addition"
    difficulty: 1
    estimatedMinutes: 5
    tags: [test]
    knowledgePoints:
      - id: kp-alpha-1
        instruction: >-
          Addition combines two amounts into a sum. Start with the first
          number, then count forward by the second number. Adding zero
          leaves the first number unchanged. A missing addend is the amount
          you must add to the known addend to reach the sum.
        workedExample: >-
          To add 4 and 5, start at 4 and count five steps: 5, 6, 7, 8, 9.
          The sum is 9. In 4 plus a missing number equals 9, the missing
          addend is 5. Adding zero to 4 leaves the sum at 4.
        problems:
          - id: p-alpha-1
            type: multiple_choice
            question: "What is 1 + 1 in basic addition?"
            options: ["1", "2", "3", "4"]
            correct: 1
            explanation: "Basic addition: 1 + 1 = 2."
            difficulty: 1
          - id: p-alpha-2
            type: true_false
            question: "Adding zero increases a whole number."
            correct: "false"
            explanation: "Adding zero takes no counting steps, so the number stays unchanged."
            difficulty: 2
          - id: p-alpha-3
            type: fill_blank
            question: "If a sum is 9 and one addend is 4, the missing addend is ___."
            correct: "5"
            explanation: "Count five steps from 4 to reach 9, so the missing addend is 5."
            difficulty: 3

  - id: concept-beta
    name: "Subtraction"
    difficulty: 2
    estimatedMinutes: 10
    tags: [test]
    prerequisites: [concept-alpha]
    knowledgePoints:
      - id: kp-beta-1
        instruction: >-
          Subtraction finds how much remains after an amount is removed.
          Start with the total and count backward by the amount removed.
          Subtracting zero leaves the total unchanged. Check a subtraction
          by adding the remaining amount and the removed amount.
        workedExample: >-
          Start with 9 counters and remove 4 counters. Five counters remain,
          so 9 minus 4 is 5. Check the result by adding 5 and 4 to get 9.
          Removing zero counters from a group of 9 leaves all 9 counters.
        problems:
          - id: p-beta-1
            type: multiple_choice
            question: "What remains when you subtract 4 from 9?"
            options: ["3", "4", "5", "6"]
            correct: 2
            explanation: "Removing 4 from 9 leaves 5. Counting backward gives 8, 7, 6, 5."
            difficulty: 1
          - id: p-beta-2
            type: true_false
            question: "Subtracting zero from 9 leaves 9."
            correct: "true"
            explanation: "Subtracting zero removes nothing, so the total stays at 9."
            difficulty: 2
          - id: p-beta-3
            type: fill_blank
            question: "To check that 9 minus 4 is 5, add 5 and 4. The sum must be ___."
            correct: "9"
            explanation: "A subtraction check restores the original total: 5 plus 4 equals 9."
            difficulty: 3
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
    expect(body.passed, JSON.stringify(body.failures)).toBe(true);
    expect(body.score).toBe("10/10");
    expect(body.failures).toEqual([]);
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
    expect(body.published).toBe(true);
    expect(body.review).toBeDefined();
    expect(body.review.passed, JSON.stringify(body.review.failures)).toBe(true);
    expect(body.review.score).toBe("10/10");
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

  test("incomplete content stays draft when imported or published", async () => {
    const slug = `e2e-unfinished-${Date.now()}`;
    const yaml = `course:
  id: ${slug}
  name: "Unfinished arithmetic course"
  estimatedHours: 1
  version: "1.0"
concepts:
  - id: addition
    name: "Addition"
    difficulty: 1
    estimatedMinutes: 5
    knowledgePoints: []
`;
    const imported = await apiPost(
      ctx,
      `/orgs/${ctx.orgId}/courses/import`,
      { yaml, publish: true },
    );
    expect(imported.status).toBe(201);
    expect(imported.body.courseId).toBeTruthy();
    expect(imported.body.published).toBe(false);
    expect(imported.body.review.passed).toBe(false);
    expect(imported.body.reviewFailures).toEqual(expect.arrayContaining([
      expect.objectContaining({ check: "publication_readiness", passed: false }),
    ]));

    const published = await apiPost(
      ctx,
      `/orgs/${ctx.orgId}/courses/${imported.body.courseId}/publish`,
      {},
    );
    expect(published.status).toBe(201);
    expect(published.body.published).toBe(false);
    expect(published.body.review.passed).toBe(false);

    const listed = await apiGet(ctx, `/orgs/${ctx.orgId}/courses`);
    expect(listed.status).toBe(200);
    const course = listed.body.find((item: { id: string }) => item.id === imported.body.courseId);
    expect(course).toBeTruthy();
    expect(course.isPublished).toBe(false);
  });

  test("invalid YAML returns validation error", async () => {
    const { status } = await apiPost(
      ctx,
      `/orgs/${ctx.orgId}/courses/import`,
      { yaml: "this is not: [valid: course: yaml" }
    );

    expect(status).toBe(400);
  });
});
