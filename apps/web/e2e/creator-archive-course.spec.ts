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
  name: "Archive Test Course ${slug}"
  description: "A course for archive e2e testing."
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

test.describe("Creator Archive Course", () => {
  let ctx: ApiTestContext;
  let courseSlug: string;

  test.beforeEach(async ({ page, request }) => {
    ctx = await signUpAndGetApiContext(page, request, GRASPFUL_BRAND);

    // Import a course via API so there's something to archive
    courseSlug = `e2e-archive-${Date.now()}`;
    const yaml = makeTestCourseYaml(courseSlug);
    const importRes = await apiPost(ctx, `/orgs/${ctx.orgId}/courses/import`, {
      yaml,
    });
    expect(importRes.status).toBe(201);
  });

  test("archive flow: click archive, confirm with slug, course disappears", async ({
    page,
  }) => {
    // Navigate to creator dashboard
    await page.goto("/creator");
    await page.waitForURL(/\/creator/, { timeout: 15_000 });

    // Verify the course card is visible
    await expect(
      page.getByText(`Archive Test Course ${courseSlug}`)
    ).toBeVisible({ timeout: 10_000 });

    // Click Archive button on the course card
    const archiveBtn = page.getByRole("button", { name: /Archive/i }).first();
    await expect(archiveBtn).toBeVisible();
    await archiveBtn.click();

    // Verify confirmation dialog appears
    await expect(page.getByText("Archive Course")).toBeVisible();
    await expect(
      page.getByText(/Type .* to confirm/i)
    ).toBeVisible();

    // Type the course slug to confirm
    const confirmInput = page.getByPlaceholder(courseSlug);
    await confirmInput.fill(courseSlug);

    // Click the confirm Archive button in the dialog
    const confirmBtn = page.getByRole("button", { name: "Archive Course" });
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // Verify course disappears from the list
    await expect(
      page.getByText(`Archive Test Course ${courseSlug}`)
    ).toBeHidden({ timeout: 10_000 });
  });
});
