import { test, expect } from "@playwright/test";
import { signUpTestUser } from "./helpers/auth";

/**
 * Answer whatever diagnostic question is on screen.
 * Works across all problem types (multiple choice, true/false, etc.)
 * by using the "I don't know" escape hatch when a simple click path isn't available.
 */
async function answerCurrentQuestion(page: import("@playwright/test").Page) {
  // Try multiple choice first: click first option + submit
  const mcOption = page.locator("button.rounded-lg.border-2").first();
  const submitBtn = page.getByRole("button", { name: "Submit Answer" });

  if (await mcOption.isVisible({ timeout: 1000 }).catch(() => false)) {
    await mcOption.click();
    if (await submitBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await submitBtn.click();
      return;
    }
  }

  // Try true/false
  const trueBtn = page.getByRole("button", { name: "True" });
  if (await trueBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await trueBtn.click();
    return;
  }

  // Fallback: "I don't know"
  await page.getByRole("button", { name: "I don't know this yet" }).click();
}

test.describe("Diagnostic flow", () => {
  let courseId: string;

  test.beforeEach(async ({ page }) => {
    await signUpTestUser(page);

    // Grab courseId from the dashboard course card (signUpTestUser lands on /dashboard)
    const firstCourse = page.locator("a[href^='/browse/']").first();
    await expect(firstCourse).toBeVisible({ timeout: 10_000 });
    const href = await firstCourse.getAttribute("href");
    courseId = href!.replace("/browse/", "");
  });

  test("diagnostic loads and shows question 1", async ({ page }) => {
    await page.goto(`/diagnostic/${courseId}`);

    await expect(page.getByText("Diagnostic Assessment")).toBeVisible();
    await expect(page.getByText("Question 1 of")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: "I don't know this yet" })).toBeVisible();
  });

  test("answering a question advances to the next", async ({ page }) => {
    await page.goto(`/diagnostic/${courseId}`);
    await expect(page.getByText("Question 1 of")).toBeVisible({ timeout: 10_000 });

    await answerCurrentQuestion(page);

    await expect(page.getByText("Question 2 of")).toBeVisible({ timeout: 10_000 });
  });

  test("session resumes after page reload", async ({ page }) => {
    await page.goto(`/diagnostic/${courseId}`);
    await expect(page.getByText("Question 1 of")).toBeVisible({ timeout: 10_000 });

    await answerCurrentQuestion(page);
    await expect(page.getByText("Question 2 of")).toBeVisible({ timeout: 10_000 });

    await page.reload();

    await expect(page.getByText("Question 2 of")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Question 1 of")).not.toBeVisible();
  });

  test("'I don't know' advances to next question", async ({ page }) => {
    await page.goto(`/diagnostic/${courseId}`);
    await expect(page.getByText("Question 1 of")).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "I don't know this yet" }).click();

    await expect(page.getByText("Question 2 of")).toBeVisible({ timeout: 10_000 });
  });
});
