import { test, expect } from "@playwright/test";

const BACKEND_URL = "http://localhost:3000/api/v1";
const GRASPFUL_BRAND = "graspful";

/** Minimal valid course YAML for testing. */
function makeTestCourseYaml(slug: string): string {
  return `
course:
  id: ${slug}
  name: "Full Flow Test ${slug}"
  description: "A course for the full agent flow e2e test."
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

test.describe("Agent Full Flow (API → Browser)", () => {
  test("register via API, import course, verify in browser", async ({
    page,
    request,
  }) => {
    // 1. Register a new user via the API
    const email = `e2e-flow-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.example.com`;
    const password = "TestPassword123!";

    const regRes = await request.post(`${BACKEND_URL}/auth/register`, {
      data: { email, password },
      headers: { "Content-Type": "application/json" },
    });
    expect(regRes.status()).toBe(201);
    const { orgSlug, apiKey } = await regRes.json();

    // 2. Import a course using the API key
    const courseSlug = `e2e-flow-course-${Date.now()}`;
    const yaml = makeTestCourseYaml(courseSlug);

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

    // 3. Sign in via the browser on graspful brand
    await page.context().addCookies([
      {
        name: "dev-brand-override",
        value: orgSlug,
        domain: "localhost",
        path: "/",
      },
    ]);

    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign In" }).click();

    // Wait for redirect (could be /creator or /dashboard depending on brand)
    await page.waitForURL(/\/(creator|dashboard)/, { timeout: 15_000 });

    // 4. Navigate to creator dashboard to see the imported course
    await page.goto("/creator");

    // 5. Verify the imported course appears
    await expect(
      page.getByText(`Full Flow Test ${courseSlug}`)
    ).toBeVisible({ timeout: 15_000 });

    // 6. Click Edit to verify navigation to edit page
    const editBtn = page.getByRole("link", { name: /Edit/i }).first();
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Should navigate to the manage/edit page
    await page.waitForURL(/\/creator\/manage\//, { timeout: 10_000 });
    expect(page.url()).toContain(`/creator/manage/${courseId}`);

    // 7. Verify Monaco editor loads (YAML is present)
    await expect(
      page.getByRole("heading", { name: "Edit Course" })
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.locator(".monaco-editor").first()
    ).toBeVisible({ timeout: 20_000 });
  });
});
