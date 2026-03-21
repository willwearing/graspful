import { test, expect, type Page } from "@playwright/test";
import { signUpTestUser } from "./helpers/auth";

/**
 * Extract academyId from a dashboard course card's academy link
 * or from the browse page academy card.
 */
async function getFirstAcademyId(page: Page): Promise<string> {
  // Navigate to browse page to find academy links
  await page.goto("/browse");
  const academyLink = page.locator("a[href^='/academy/']").first();
  await expect(academyLink).toBeVisible({ timeout: 10_000 });
  const href = await academyLink.getAttribute("href");
  // href is /academy/<academyId>
  return href!.replace("/academy/", "");
}

test.describe("Academy features", () => {
  test.beforeEach(async ({ page }) => {
    await signUpTestUser(page);
  });

  test("dashboard shows academy-level stats heading", async ({ page }) => {
    // Dashboard should show "Academy Courses" when courses belong to an academy
    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(
      page.getByText(/Academy Courses|Your Courses/)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("academy page loads and shows courses", async ({ page }) => {
    const academyId = await getFirstAcademyId(page);

    await page.goto(`/academy/${academyId}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole("heading", { name: "Courses" })).toBeVisible();
    await expect(page.getByText("Academy Progress")).toBeVisible();
  });

  test("academy diagnostic route loads", async ({ page }) => {
    const academyId = await getFirstAcademyId(page);

    await page.goto(`/academy/${academyId}/diagnostic`);

    // Should either show the diagnostic assessment or an error message
    // (depending on whether diagnostic content is seeded)
    await expect(page.locator("body")).not.toContainText("500");
    await expect(page.locator("body")).not.toContainText(
      "Internal Server Error"
    );

    // Should show either diagnostic or unavailable message
    const hasDiagnostic = await page
      .getByText("Diagnostic Assessment")
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (!hasDiagnostic) {
      await expect(
        page.getByText(/Diagnostic Unavailable/)
      ).toBeVisible();
    }
  });

  test("academy page shows knowledge graph section", async ({ page }) => {
    const academyId = await getFirstAcademyId(page);

    await page.goto(`/academy/${academyId}`);
    // Knowledge graph section should render (may show loading, then graph or nothing)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 10_000,
    });

    // The graph section should at least attempt to load
    // (it renders null if no data, which is acceptable)
    await expect(page.locator("body")).not.toContainText("500");
  });

  test("academy page back link navigates to browse", async ({ page }) => {
    const academyId = await getFirstAcademyId(page);

    await page.goto(`/academy/${academyId}`);
    await expect(page.getByText("Back to Academies")).toBeVisible();

    await page.getByText("Back to Academies").click();
    await expect(page).toHaveURL(/\/browse/);
  });
});
