import { test, expect, type Page } from "@playwright/test";
import { signUpTestUser } from "./helpers/auth";

async function answerCurrentQuestion(page: Page) {
  const optionButton = page.locator("button.rounded-lg.border-2").first();
  const submitButton = page.getByRole("button", { name: "Submit Answer" });

  if (await optionButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await optionButton.click();
    if (await submitButton.isVisible({ timeout: 500 }).catch(() => false)) {
      await submitButton.click();
      return;
    }
  }

  const trueButton = page.getByRole("button", { name: "True" });
  if (await trueButton.isVisible({ timeout: 500 }).catch(() => false)) {
    await trueButton.click();
    return;
  }

  await page.getByRole("button", { name: "I don't know this yet" }).click();
}

test.describe("Learner happy path", () => {
  test("new learner can sign up, start diagnostic, and reach a study lesson", async ({
    page,
  }) => {
    await signUpTestUser(page);

    // Dashboard shows course cards — click the first one to reach course detail
    const firstCourse = page.locator("a[href^='/browse/']").first();
    await expect(firstCourse).toBeVisible({ timeout: 10_000 });
    const href = await firstCourse.getAttribute("href");
    const courseId = href?.replace("/browse/", "");
    expect(courseId).toBeTruthy();

    await firstCourse.click();
    await expect(page.getByText("Course Progress")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Take Diagnostic" }).click();

    await expect(page).toHaveURL(new RegExp(`/diagnostic/${courseId}$`));
    await expect(page.getByText("Diagnostic Assessment")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("Question 1 of")).toBeVisible({ timeout: 10_000 });

    await answerCurrentQuestion(page);
    await expect(page.getByText("Question 2 of")).toBeVisible({ timeout: 10_000 });

    await page.goto(`/study/${courseId}`);
    await expect(page.getByText("Knowledge Point 1 of")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Lesson Unavailable")).not.toBeVisible();
  });
});
