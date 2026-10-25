import { expect, test } from "@playwright/test";
import { signUpAsCreator } from "./helpers/auth";

const platformUrl = "http://graspful.ai:3001";
const academyUrl = "http://firefighterprep.vercel.app:3001";

const SHARED_MARKETING_PATHS = [
  "/pricing",
  "/agents",
  "/ai-course-builder",
  "/academies",
  "/docs",
  "/docs/quickstart",
];

test.describe("Homepage first paint", () => {
  // Without JavaScript, only the server HTML renders. The hero must not wait on hydration or flags.
  test.use({ javaScriptEnabled: false });

  for (const url of [`${platformUrl}/`, `${academyUrl}/`]) {
    test(`ships a visible hero in the server HTML at ${url}`, async ({ page }) => {
      await page.goto(url);

      await expect(page.locator("h1").first()).toBeVisible();
      await expect(page.locator('[data-landing-variant="loading"]')).toHaveCount(0);
    });
  }
});

test.describe("Shared marketing pages", () => {
  test("never set cookies, so Vercel's CDN can cache them", async ({ request }) => {
    for (const path of SHARED_MARKETING_PATHS) {
      const response = await request.get(`${platformUrl}${path}`, {
        headers: { cookie: "sb-127-auth-token=stale-session" },
      });

      expect(response.status(), path).toBe(200);
      expect(response.headers()["set-cookie"], path).toBeUndefined();
    }
  });

  test("signed-in creators keep marketing access and session routing", async ({ page }) => {
    await signUpAsCreator(page);

    for (const path of ["/pricing", "/docs"]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.locator("h1").first()).toBeVisible();
      expect(response?.headers()["set-cookie"], path).toBeUndefined();
    }

    // These decisions depend on the session, so the proxy still reads it.
    await page.goto("/");
    await expect(page).toHaveURL(/\/creator/);
    await page.goto("/sign-in");
    await expect(page).toHaveURL(/\/creator/);
  });

  test("anonymous visitors are still sent to sign-in from product routes", async ({ page }) => {
    await page.goto("/creator");
    await expect(page).toHaveURL(/\/sign-in\?redirect=%2Fcreator/);
  });
});
