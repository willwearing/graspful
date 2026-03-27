import { test, expect } from "@playwright/test";

test.describe("Mobile responsive design", () => {
  test.use({ viewport: { width: 375, height: 812 } }); // iPhone viewport

  test("landing page renders on mobile viewport", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    // CTA should still be visible
    await expect(page.locator('a[href="/sign-up"]').first()).toBeVisible();
  });

  test("sign-in page renders on mobile viewport", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign In" })
    ).toBeVisible();
  });

  test("sign-up page renders on mobile viewport", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.getByText("Create your account")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("pricing page renders on mobile viewport", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("#pricing")).toBeVisible();
    await expect(page.getByText(/\$\d+|70\/30/).first()).toBeVisible();
  });

  test("no horizontal overflow on mobile", async ({ page }) => {
    await page.goto("/");
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasOverflow).toBe(false);
  });
});

test.describe("Tablet responsive design", () => {
  test.use({ viewport: { width: 768, height: 1024 } }); // iPad viewport

  test("landing page renders on tablet viewport", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    const featureHeadings = page.locator("section h3");
    expect(await featureHeadings.count()).toBeGreaterThanOrEqual(3);
  });
});
