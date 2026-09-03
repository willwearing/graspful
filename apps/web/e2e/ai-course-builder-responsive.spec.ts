import { expect, test, type Locator } from "@playwright/test";

async function expectFullyWithinViewport(locator: Locator) {
  const bounds = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      viewportWidth: document.documentElement.clientWidth,
    };
  });

  expect(bounds.left).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(bounds.viewportWidth);
}

test.describe("AI course builder responsive layout", () => {
  for (const width of [320, 390, 768, 1280]) {
    test(`keeps workflow content visible at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/ai-course-builder");

      await expectFullyWithinViewport(
        page.getByRole("heading", {
          level: 2,
          name: "From source material to a live course",
        }),
      );
      await expectFullyWithinViewport(page.getByText("Terminal", { exact: true }));

      for (const card of await page.locator("ol > li").all()) {
        await expectFullyWithinViewport(card);
      }
    });
  }
});
