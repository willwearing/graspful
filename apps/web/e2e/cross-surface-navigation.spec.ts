import { expect, test, type Page } from "@playwright/test";
const platformUrl = "http://graspful.ai:3001";
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
  test("marketing auth links use document navigation", async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto(platformUrl);
    await page.getByRole("link", { name: "Agents", exact: true }).click();
    await expect(page).toHaveURL(`${platformUrl}/agents`);

    const signUpRequestPromise = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return url.pathname === "/sign-up";
    });
    await page.getByRole("link", { name: "Get Started Free" }).click();
    const signUpRequest = await signUpRequestPromise;

    expect(signUpRequest.resourceType()).toBe("document");
    await expect(page).toHaveURL(/\/sign-up/);
    expect(getCrossSurfaceErrors(errors)).toEqual([]);
  });

  test("app auth pages do not emit cross-origin prefetch errors", async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto(`${appUrl}/sign-in`);
    await expect(page.getByText("Welcome back")).toBeVisible();
    await page.waitForLoadState("networkidle");

    expect(getCrossSurfaceErrors(errors)).toEqual([]);
  });
});
