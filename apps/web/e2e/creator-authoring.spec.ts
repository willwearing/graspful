import { test, expect, type Page } from "@playwright/test";
import {
  signUpAndGetApiContext,
  type ApiTestContext,
} from "./helpers/api-auth";

function makeUiCourseYaml(slug: string, title: string, description: string): string {
  return `
course:
  id: ${slug}
  name: "${title}"
  description: "${description}"
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
        workedExample: "Adding 1 and 1 gives 2."
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
`.trim();
}

async function setMonacoModelValue(
  page: Page,
  predicateText: string,
  nextValue: string,
) {
  await expect(page.locator(".monaco-editor").first()).toBeVisible({ timeout: 20_000 });

  await page.evaluate(
    ({ predicateText, nextValue }) => {
      const monaco = (window as any).monaco;
      if (!monaco?.editor) {
        throw new Error("Monaco editor is not ready");
      }

      const model = monaco.editor
        .getModels()
        .find((candidate: { getValue: () => string }) =>
          candidate.getValue().includes(predicateText),
        );

      if (!model) {
        throw new Error(`Could not find Monaco model containing: ${predicateText}`);
      }

      model.setValue(nextValue);
    },
    { predicateText, nextValue },
  );
}

test.describe("Creator authoring flow", () => {
  test("new course UI imports a course and lands on the edit page", async ({
    page,
    request,
  }) => {
    await signUpAndGetApiContext(page, request, "graspful");

    const slug = `ui-import-${Date.now()}`;
    const title = `UI Import Course ${slug}`;
    const yaml = makeUiCourseYaml(slug, title, "Imported through the creator UI.");

    await page.goto("/creator/manage");
    await page.getByRole("tab", { name: "Course Content" }).click();
    await setMonacoModelValue(page, 'name: "My Course"', yaml);

    await page.getByRole("button", { name: /Import to Platform/i }).click();

    await page.waitForURL(/\/creator\/manage\//, { timeout: 20_000 });
    await expect(
      page.getByRole("heading", { name: "Edit Course" }),
    ).toBeVisible();

    await page.goto("/creator");
    await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });
  });

  test("edit UI saves updated YAML and the change persists after reload", async ({
    page,
    request,
  }) => {
    const ctx: ApiTestContext = await signUpAndGetApiContext(page, request, "graspful");
    const slug = `ui-edit-${Date.now()}`;
    const originalTitle = `UI Edit Course ${slug}`;
    const originalDescription = "Original description from the API import.";
    const updatedDescription = "Updated description saved through the UI.";
    const originalYaml = makeUiCourseYaml(slug, originalTitle, originalDescription);
    const updatedYaml = makeUiCourseYaml(slug, originalTitle, updatedDescription);

    const importRes = await request.post(
      `http://localhost:3000/api/v1/orgs/${ctx.orgId}/courses/import`,
      {
        headers: {
          Authorization: `Bearer ${ctx.token}`,
          "Content-Type": "application/json",
        },
        data: { yaml: originalYaml },
      },
    );
    expect(importRes.ok()).toBeTruthy();
    const { courseId } = (await importRes.json()) as { courseId: string };

    await page.goto(`/creator/manage/${courseId}`);
    await page.getByRole("tab", { name: "Course Content" }).click();
    await setMonacoModelValue(page, originalDescription, updatedYaml);
    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(page.getByText("Changes saved successfully.")).toBeVisible({
      timeout: 15_000,
    });

    await page.reload();
    await page.getByRole("tab", { name: "Course Content" }).click();
    await expect(page.locator(".monaco-editor").first()).toBeVisible({ timeout: 20_000 });

    const persisted = await page.evaluate(() => {
      const monaco = (window as any).monaco;
      if (!monaco?.editor) return "";
      return monaco.editor
        .getModels()
        .map((model: { getValue: () => string }) => model.getValue())
        .join("\n");
    });

    expect(persisted).toContain(updatedDescription);
  });

  test("download YAML from the new-course UI produces a course file", async ({
    page,
    request,
  }) => {
    await signUpAndGetApiContext(page, request, "graspful");

    const slug = `ui-download-${Date.now()}`;
    const title = `UI Download Course ${slug}`;
    const yaml = makeUiCourseYaml(slug, title, "Downloaded through the creator UI.");

    await page.goto("/creator/manage");
    await page.getByRole("tab", { name: "Course Content" }).click();
    await setMonacoModelValue(page, 'name: "My Course"', yaml);

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /Download YAML/i }).click(),
    ]);

    expect(download.suggestedFilename()).toBe("course.yaml");
  });
});
