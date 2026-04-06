import { test, expect } from "@playwright/test";
import {
  signUpBrandedTestUser,
  getBrowserAccessToken,
  POSTHOG_TEST_BRAND_ID,
} from "./helpers/auth";

const BACKEND_URL = "http://localhost:3000/api/v1";
const ORG_SLUG = "posthog-tam";

/**
 * Verify that signing up on a branded academy site auto-joins the user
 * to the brand's org so they can browse and enroll in academies.
 *
 * This covers the bug where users signed up on a branded subdomain but
 * saw "No academies available yet." because they weren't added to the
 * brand's org.
 */
test.describe("Academy sign-up and browse", () => {
  test("provision with brandOrgSlug grants learner access to browse academies", async ({
    page,
  }) => {
    // 1. Sign up on the branded academy site
    await signUpBrandedTestUser(page, POSTHOG_TEST_BRAND_ID);
    const token = await getBrowserAccessToken(page);
    expect(token).toBeTruthy();

    // 2. Call provision with brandOrgSlug (simulates what auth callback does)
    const provisionRes = await fetch(`${BACKEND_URL}/auth/provision`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ brandOrgSlug: ORG_SLUG }),
    });
    expect(provisionRes.status).toBeLessThan(300);

    // 3. Verify the user can see academies on the browse page
    await page.goto("/browse");
    await expect(page.getByRole("heading", { name: "Browse Academies" })).toBeVisible({
      timeout: 10_000,
    });
    // Should NOT show the empty state
    await expect(page.getByText("No academies available yet.")).not.toBeVisible({
      timeout: 5_000,
    });
    // Should show at least one academy card with an "Open Academy" button
    await expect(
      page.getByRole("button", { name: "Open Academy" }).or(
        page.getByRole("link", { name: "Open Academy" })
      )
    ).toBeVisible({ timeout: 5_000 });
  });

  test("provision without brandOrgSlug does NOT grant access to other orgs", async ({
    page,
  }) => {
    // Sign up without a brand org slug
    await signUpBrandedTestUser(page, POSTHOG_TEST_BRAND_ID);
    const token = await getBrowserAccessToken(page);
    expect(token).toBeTruthy();

    // Call provision WITHOUT brandOrgSlug
    await fetch(`${BACKEND_URL}/auth/provision`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    // Calling the academy API directly should fail (403) since the user
    // is not a member of the brand's org
    const academyRes = await fetch(
      `${BACKEND_URL}/orgs/${ORG_SLUG}/academies`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    expect(academyRes.status).toBe(403);
  });

  test("learner membership is idempotent", async ({ page }) => {
    await signUpBrandedTestUser(page, POSTHOG_TEST_BRAND_ID);
    const token = await getBrowserAccessToken(page);
    expect(token).toBeTruthy();

    // Call provision with brandOrgSlug twice — should not error
    for (let i = 0; i < 2; i++) {
      const res = await fetch(`${BACKEND_URL}/auth/provision`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ brandOrgSlug: ORG_SLUG }),
      });
      expect(res.status).toBeLessThan(300);
    }

    // Should still be able to browse
    await page.goto("/browse");
    await expect(page.getByText("No academies available yet.")).not.toBeVisible({
      timeout: 5_000,
    });
  });
});
