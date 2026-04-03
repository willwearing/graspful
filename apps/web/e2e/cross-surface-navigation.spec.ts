import { expect, test, type Page } from "@playwright/test";
const appUrl = "http://app.graspful.ai:3001";

function captureConsoleErrors(page: Page) {
  const messages: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      messages.push(msg.text());
    }
  });
  return messages;
}

function getCrossSurfaceErrors(messages: string[]) {
  return messages.filter(
    (message) =>
      message.includes("CORS policy") ||
      (message.includes("Failed to load resource") && message.includes("ERR_FAILED")),
  );
}

test.describe("Cross-surface navigation chrome", () => {
  test("app auth pages do not emit cross-origin prefetch errors", async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto(`${appUrl}/sign-in`);
    await expect(page.getByText("Welcome back")).toBeVisible();
    await page.waitForLoadState("networkidle");

    expect(getCrossSurfaceErrors(errors)).toEqual([]);
  });
});
