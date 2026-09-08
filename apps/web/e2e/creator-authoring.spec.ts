import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { parse, stringify } from "yaml";
import { CourseYamlSchema } from "@graspful/shared";
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
  test("the shipped starter downloads as a valid course draft", async ({ page, request }) => {
    await signUpAndGetApiContext(page, request, "graspful");
    await page.goto("/creator/manage");
    await expect(page.getByRole("heading", { name: "New course" })).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download YAML" }).click(),
    ]);
    const file = await download.path();
    expect(file).toBeTruthy();
    const course = CourseYamlSchema.parse(parse(await readFile(file!, "utf8")));
    expect(course.course.id).toBe("my-course");
    expect(course.concepts[0].knowledgePoints).toEqual([]);
  });

  test("brand edits save independently and persist after reload", async ({ page, request }) => {
    const ctx = await signUpAndGetApiContext(page, request, "graspful");
    await page.goto("/creator/manage");
    await page.getByRole("tab", { name: "Brand settings" }).click();
    await expect(page.locator(".monaco-editor").first()).toBeVisible({ timeout: 20_000 });
    const brandYaml = await page.evaluate(() => {
      const monaco = (window as any).monaco;
      const model = monaco?.editor.getModels().find((item: { getValue: () => string }) => item.getValue().includes("# Settings for"));
      if (!model) throw new Error("Brand settings editor did not load");
      return model.getValue() as string;
    });
    const settings = parse(brandYaml);
    settings.tagline = "Brand changes saved through the creator editor.";
    const updatedYaml = stringify(settings);
    await setMonacoModelValue(page, "# Settings for", updatedYaml);
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().endsWith(`/brands/${ctx.orgId}`) && res.request().method() === "PATCH"),
      page.getByRole("button", { name: "Save brand settings" }).click(),
    ]);
    expect(response.ok()).toBeTruthy();
    expect(response.request().postDataJSON()).toEqual(settings);
    await expect(page.getByText("Brand settings saved.")).toBeVisible();
    await page.reload();
    await page.getByRole("tab", { name: "Brand settings" }).click();
    await expect(page.locator(".monaco-editor").first()).toBeVisible({ timeout: 20_000 });
    const persisted = await page.evaluate(() => (window as any).monaco.editor.getModels()
      .map((model: { getValue: () => string }) => model.getValue()).join("\n"));
    expect(persisted).toContain(settings.tagline);
    expect(page.url()).toMatch(/\/creator\/manage$/);
  });

  test("new course UI imports a course and lands on the edit page", async ({
    page,
    request,
  }) => {
    await signUpAndGetApiContext(page, request, "graspful");

    const slug = `ui-import-${Date.now()}`;
    const title = `UI Import Course ${slug}`;
    const yaml = makeUiCourseYaml(slug, title, "Imported through the creator UI.");

    await page.goto("/creator/manage");
    await page.getByRole("tab", { name: "Course content" }).click();
    await setMonacoModelValue(page, 'name: My course', yaml);

    await page.getByRole("button", { name: /Import draft/i }).click();

    await page.waitForURL(/\/creator\/manage\//, { timeout: 20_000 });
    await expect(
      page.getByRole("heading", { name: "Edit course" }),
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
    const originalTitle = `UI Edit course ${slug}`;
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
    await page.getByRole("tab", { name: "Course content" }).click();
    await setMonacoModelValue(page, originalDescription, updatedYaml);
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().endsWith(`/orgs/${ctx.orgId}/courses/import`) && res.request().method() === "POST"),
      page.getByRole("button", { name: "Save course changes" }).click(),
    ]);
    expect(response.ok()).toBeTruthy();
    expect(response.request().postDataJSON()).toEqual({ yaml: updatedYaml, replace: true });
    expect((await response.json()).courseId).toBe(courseId);

    await expect(page.getByText("Course changes saved.")).toBeVisible({
      timeout: 15_000,
    });

    await page.reload();
    await page.getByRole("tab", { name: "Course content" }).click();
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
    await page.getByRole("tab", { name: "Course content" }).click();
    await setMonacoModelValue(page, 'name: My course', yaml);

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /Download YAML/i }).click(),
    ]);

    expect(download.suggestedFilename()).toBe("course.yaml");
  });
});
