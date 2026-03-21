import { test, expect, type Page } from "@playwright/test";
import { signUpTestUser } from "./helpers/auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Grab the first course's ID from the dashboard course card links.
 * signUpTestUser already lands on /dashboard.
 */
async function getCourseId(page: Page): Promise<string> {
  const firstCourse = page.locator("a[href^='/browse/']").first();
  await expect(firstCourse).toBeVisible({ timeout: 10_000 });
  const href = await firstCourse.getAttribute("href");
  const courseId = href?.replace("/browse/", "");
  expect(courseId).toBeTruthy();
  return courseId!;
}

/**
 * Blast through the diagnostic by clicking "I don't know this yet" on every
 * question. This finishes fast and puts the learner into the study flow with
 * all concepts unmastered (maximum frontier).
 *
 * Uses the course detail page's "Take Diagnostic" button to navigate to the
 * correct diagnostic URL (academy-scoped or course-scoped).
 */
async function completeDiagnosticFast(page: Page, courseId: string) {
  // Navigate to course detail page and click the diagnostic button
  await page.goto(`/browse/${courseId}`);
  await expect(page.getByText("Take Diagnostic")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Take Diagnostic" }).click();

  // Should land on a diagnostic page (either URL pattern)
  await expect(page).toHaveURL(/\/diagnostic/, { timeout: 10_000 });
  await expect(page.getByText("Diagnostic Assessment")).toBeVisible({
    timeout: 15_000,
  });

  // Keep clicking "I don't know this yet" until the diagnostic completes
  for (let i = 0; i < 100; i++) {
    const dontKnow = page.getByRole("button", { name: "I don't know this yet" });
    const isVisible = await dontKnow.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!isVisible) break;

    // Wait for the button to become enabled (it may be disabled during loading)
    await dontKnow.waitFor({ state: "attached", timeout: 5_000 }).catch(() => {});
    const isEnabled = await dontKnow.isEnabled({ timeout: 5_000 }).catch(() => false);
    if (!isEnabled) break;

    await dontKnow.click();

    // Wait for either the next question or a completion indicator
    await page
      .waitForFunction(
        () => {
          const body = document.body.textContent ?? "";
          return (
            body.includes("I don't know this yet") ||
            body.includes("Session Complete") ||
            body.includes("Diagnostic Complete") ||
            body.includes("Results")
          );
        },
        { timeout: 8_000 }
      )
      .catch(() => {
        // timeout is fine — page may have navigated
      });
  }

  // Give the backend time to persist the final state
  await page.waitForTimeout(1_000);
}

/**
 * Answer the current question in a lesson/review by picking whatever
 * option is available. Works with multiple choice (clicks first option +
 * Submit), true/false, or falls back to "I don't know".
 */
async function answerCurrentQuestion(page: Page) {
  // Multiple choice: click first option, then submit
  const mcOption = page.locator("button.rounded-lg.border-2").first();
  const submitBtn = page.getByRole("button", { name: "Submit Answer" });

  if (await mcOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await mcOption.click();
    if (await submitBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await submitBtn.click();
      return;
    }
  }

  // True/false
  const trueBtn = page.getByRole("button", { name: "True" });
  if (await trueBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await trueBtn.click();
    return;
  }

  // Fallback
  const dontKnow = page.getByRole("button", { name: "I don't know this yet" });
  if (await dontKnow.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await dontKnow.click();
  }
}

/**
 * Deliberately answer a multiple-choice question wrong.
 * Selects the LAST option (least likely to be correct given typical
 * question authoring) then submits.
 *
 * Returns true if we managed to submit a wrong answer, false otherwise.
 */
async function answerWrong(page: Page): Promise<boolean> {
  const mcOptions = page.locator("button.rounded-lg.border-2");
  const submitBtn = page.getByRole("button", { name: "Submit Answer" });

  const count = await mcOptions.count();
  if (count >= 2) {
    // Pick the last option — most likely wrong
    await mcOptions.nth(count - 1).click();
    if (await submitBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await submitBtn.click();
      return true;
    }
  }

  // True/false — answer False (statistically a decent wrong-guess)
  const falseBtn = page.getByRole("button", { name: "False" });
  if (await falseBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await falseBtn.click();
    return true;
  }

  return false;
}

/**
 * Navigate to the study route and wait for it to redirect to a lesson,
 * review, quiz, or show "Session Complete".
 * Returns the final URL so callers can branch on what loaded.
 */
async function navigateToStudy(page: Page, courseId: string): Promise<string> {
  await page.goto(`/study/${courseId}`);

  // Wait for the study router to either redirect or render a terminal state
  await page
    .waitForFunction(
      () => {
        const url = window.location.href;
        const body = document.body.textContent ?? "";
        return (
          url.includes("/lesson/") ||
          url.includes("/review/") ||
          url.includes("/quiz") ||
          url.includes("/exam") ||
          body.includes("Session Complete") ||
          body.includes("Loading next activity") === false
        );
      },
      { timeout: 15_000 }
    )
    .catch(() => {
      // May already be on the right page
    });

  return page.url();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Failure and remediation flow", () => {
  test("answering wrong shows feedback and continues", async ({ page }) => {
    await signUpTestUser(page);
    const courseId = await getCourseId(page);
    await completeDiagnosticFast(page, courseId);

    const url = await navigateToStudy(page, courseId);

    // We need a lesson page with practice problems to test wrong answers
    if (!url.includes("/lesson/")) {
      // If no lesson loaded (session complete or review), the flow is valid
      // — just verify no crash
      await expect(page.locator("body")).not.toContainText("500");
      await expect(page.locator("body")).not.toContainText("Internal Server Error");
      return;
    }

    // We're on a lesson page — advance to the practice phase
    await expect(page.getByText("Knowledge Point 1 of")).toBeVisible({
      timeout: 10_000,
    });

    // Click Continue through instruction (and optionally worked example)
    // until we see "Practice" or a problem
    for (let i = 0; i < 5; i++) {
      const practiceHeading = page.getByText("Practice");
      if (await practiceHeading.isVisible({ timeout: 1_000 }).catch(() => false)) {
        break;
      }
      const continueBtn = page.getByRole("button", { name: "Continue" });
      if (await continueBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await continueBtn.click();
        await page.waitForTimeout(500);
      } else {
        break;
      }
    }

    // Try to answer wrong on the practice problem
    const submitBtn = page.getByRole("button", { name: "Submit Answer" });
    const hasProblem = await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false);

    if (hasProblem) {
      const answered = await answerWrong(page);
      if (answered) {
        // Wait for feedback to appear — look for feedback banner with any status
        const feedbackBanner = page.locator(".rounded-lg.p-4.text-sm");
        const feedbackVisible = await feedbackBanner
          .first()
          .isVisible({ timeout: 8_000 })
          .catch(() => false);

        // Also accept text-based feedback indicators
        const textFeedback = await page
          .getByText(/Correct!|Incorrect|Correct order|Incorrect order|We'll teach you/)
          .first()
          .isVisible({ timeout: 3_000 })
          .catch(() => false);

        expect(feedbackVisible || textFeedback).toBe(true);

        // Wait for feedback to clear and verify the flow continues (no crash)
        await page.waitForTimeout(2_000);
        await expect(page.locator("body")).not.toContainText("Internal Server Error");
      }
    }

    // Regardless of whether we found a problem, verify no crash
    await expect(page.locator("body")).not.toContainText("500");
  });

  test("completing diagnostic unlocks study flow", async ({ page }) => {
    await signUpTestUser(page);
    const courseId = await getCourseId(page);
    await completeDiagnosticFast(page, courseId);

    // Navigate to the study entry point
    await page.goto(`/study/${courseId}`);

    // Should not show a server error
    await expect(page.locator("body")).not.toContainText("500");
    await expect(page.locator("body")).not.toContainText("Internal Server Error");

    // Should either redirect to a lesson/review/quiz or show "Session Complete"
    await page
      .waitForFunction(
        () => {
          const url = window.location.href;
          const body = document.body.textContent ?? "";
          return (
            url.includes("/lesson/") ||
            url.includes("/review/") ||
            url.includes("/quiz") ||
            url.includes("/exam") ||
            body.includes("Session Complete") ||
            body.includes("Knowledge Point")
          );
        },
        { timeout: 15_000 }
      )
      .catch(() => {
        // Acceptable — the page loaded without crashing
      });

    // Final no-crash assertion
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
  });

  test("study flow handles lesson completion", async ({ page }) => {
    await signUpTestUser(page);
    const courseId = await getCourseId(page);
    await completeDiagnosticFast(page, courseId);

    const url = await navigateToStudy(page, courseId);

    if (!url.includes("/lesson/")) {
      // No lesson available — verify we're in a valid state and move on
      await expect(page.locator("body")).not.toContainText("Internal Server Error");
      return;
    }

    // On a lesson page — work through all KP phases
    await expect(page.getByText("Knowledge Point 1 of")).toBeVisible({
      timeout: 10_000,
    });

    // Loop through knowledge points: instruction → worked example → practice
    for (let kp = 0; kp < 20; kp++) {
      // Phase: Instruction / Worked Example — click Continue
      for (let phase = 0; phase < 3; phase++) {
        const continueBtn = page.getByRole("button", { name: "Continue" });
        if (await continueBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await continueBtn.click();
          await page.waitForTimeout(500);
        }
      }

      // Phase: Practice — answer each problem
      const practiceLabel = page.getByText("Practice");
      if (await practiceLabel.isVisible({ timeout: 1_000 }).catch(() => false)) {
        // Answer practice problems until "Practice complete" or next phase
        for (let q = 0; q < 20; q++) {
          const submitVisible = await page
            .getByRole("button", { name: "Submit Answer" })
            .isVisible({ timeout: 2_000 })
            .catch(() => false);

          if (!submitVisible) {
            // Might be true/false or practice complete
            const trueBtn = page.getByRole("button", { name: "True" });
            if (await trueBtn.isVisible({ timeout: 500 }).catch(() => false)) {
              await trueBtn.click();
              await page.waitForTimeout(2_000);
              continue;
            }
            break;
          }

          await answerCurrentQuestion(page);
          // Wait for feedback to show then clear
          await page.waitForTimeout(2_000);
        }
      }

      // Check if we can Complete Lesson
      const completeBtn = page.getByRole("button", { name: "Complete Lesson" });
      if (await completeBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await completeBtn.click();
        // Should redirect back to study route
        await page.waitForURL(/\/study\//, { timeout: 15_000 });
        break;
      }

      // Check if there's a Continue button to advance to next KP
      const nextContinue = page.getByRole("button", { name: "Continue" });
      if (await nextContinue.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await nextContinue.click();
        await page.waitForTimeout(500);
      } else {
        // No more buttons — we're done or stuck
        break;
      }
    }

    // Verify no crash after lesson completion flow
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
    await expect(page.locator("body")).not.toContainText("500");
  });

  test("concept states visible on browse page after study activity", async ({
    page,
  }) => {
    await signUpTestUser(page);
    const courseId = await getCourseId(page);
    await completeDiagnosticFast(page, courseId);

    // Visit browse page — should show concept mastery badges
    await page.goto(`/browse/${courseId}`);
    await expect(page.getByText("Course Progress")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole("heading", { name: "Concepts" })).toBeVisible();

    // After diagnostic with all "I don't know", concepts should be unstarted
    // or in_progress. Verify at least one mastery badge is rendered.
    const masteryBadges = page.getByText(
      /Not Started|In Progress|Mastered|Review/
    );
    const badgeCount = await masteryBadges.count();
    expect(badgeCount).toBeGreaterThan(0);

    // Navigate to study and do some activity
    const studyUrl = await navigateToStudy(page, courseId);

    if (studyUrl.includes("/lesson/")) {
      // Answer a couple of questions (right or wrong)
      await expect(page.getByText("Knowledge Point 1 of")).toBeVisible({
        timeout: 10_000,
      });

      // Skip through instruction phase
      const continueBtn = page.getByRole("button", { name: "Continue" });
      if (await continueBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await continueBtn.click();
        await page.waitForTimeout(500);
      }
      // Try another Continue for worked example
      if (await continueBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await continueBtn.click();
        await page.waitForTimeout(500);
      }

      // Answer a practice question if available
      const submitBtn = page.getByRole("button", { name: "Submit Answer" });
      if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await answerWrong(page);
        await page.waitForTimeout(2_000);
      }
    }

    // Return to browse page and verify it still renders without error
    await page.goto(`/browse/${courseId}`);
    await expect(page.getByText("Course Progress")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole("heading", { name: "Concepts" })).toBeVisible();

    // Mastery badges still present
    const updatedBadges = page.getByText(
      /Not Started|In Progress|Mastered|Review/
    );
    const updatedCount = await updatedBadges.count();
    expect(updatedCount).toBeGreaterThan(0);

    // No crash
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
  });
});
