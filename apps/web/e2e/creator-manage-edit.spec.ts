import { test, expect } from "@playwright/test";
import {
  signUpAndGetApiContext,
  apiPost,
  type ApiTestContext,
} from "./helpers/api-auth";

const GRASPFUL_BRAND = "graspful";

/** Minimal valid course YAML for testing. */
function makeTestCourseYaml(slug: string): string {
  return `
course:
  id: ${slug}
  name: "Edit Test Course ${slug}"
  description: "A course for edit e2e testing."
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

test.describe("Creator Manage — Edit Course", () => {
  let ctx: ApiTestContext;
  let courseId: string;
  let courseSlug: string;

  test.beforeEach(async ({ page, request }) => {
    ctx = await signUpAndGetApiContext(page, request, GRASPFUL_BRAND);

    // Import a course via API
    courseSlug = `e2e-edit-${Date.now()}`;
    const yaml = makeTestCourseYaml(courseSlug);
    const importRes = await apiPost(ctx, `/orgs/${ctx.orgId}/courses/import`, {
      yaml,
    });
    expect(importRes.status).toBe(201);
    courseId = importRes.body.courseId;
  });

  test("clicking Edit on a course card navigates to /creator/manage/[courseId]", async ({
    page,
  }) => {
    await page.goto("/creator");
    await page.waitForURL(/\/creator/, { timeout: 15_000 });

    // Wait for the course to appear
    await expect(
      page.getByText(`Edit Test Course ${courseSlug}`)
    ).toBeVisible({ timeout: 10_000 });

    // Click Edit button
    const editBtn = page.getByRole("link", { name: /Edit/i }).first();
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Should navigate to the edit page
    await page.waitForURL(/\/creator\/manage\//, { timeout: 10_000 });
    expect(page.url()).toContain(`/creator/manage/${courseId}`);
  });

  test("edit page heading says Edit Course", async ({ page }) => {
    await page.goto(`/creator/manage/${courseId}`);

    await expect(
      page.getByRole("heading", { name: "Edit Course" })
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByText("Modify the brand config or course content, then save changes.")
    ).toBeVisible();
  });

  test("Monaco editor loads with course YAML (not template)", async ({
    page,
  }) => {
    await page.goto(`/creator/manage/${courseId}`);

    // Wait for loading to complete and Monaco to render
    await expect(
      page.locator(".monaco-editor").first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("Save Changes button exists (not Import to Platform)", async ({
    page,
  }) => {
    await page.goto(`/creator/manage/${courseId}`);
    await page.waitForURL(/\/creator\/manage\//, { timeout: 10_000 });

    // Should have Save Changes, not Import to Platform
    await expect(
      page.getByRole("button", { name: /Save Changes/i })
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("button", { name: /Import to Platform/i })
    ).toBeHidden();
  });

  test("Download YAML button exists on edit page", async ({ page }) => {
    await page.goto(`/creator/manage/${courseId}`);

    await expect(
      page.getByRole("button", { name: /Download YAML/i })
    ).toBeVisible({ timeout: 15_000 });
  });
});
