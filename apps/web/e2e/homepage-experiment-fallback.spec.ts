import { expect, test } from "@playwright/test";

// The isolated e2e environment disables real analytics ingestion.
for (const viewport of [{ width: 1280, height: 900 }, { width: 375, height: 812 }]) {
  test(`production homepage remains usable without flag service at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("http://graspful.ai:3001/?utm_source=measurement-regression");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator('[data-landing-variant="loading"]')).toHaveCount(0);
    const quickstart = page.locator('a[href="/docs/quickstart"]').first();
    await expect(quickstart).toBeVisible();
    await quickstart.click();
    await expect(page).toHaveURL(/\/docs\/quickstart$/);
    await expect(page.locator("h1")).toBeVisible();
  });
}
