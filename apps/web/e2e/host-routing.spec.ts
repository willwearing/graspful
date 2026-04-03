import { expect, test } from "@playwright/test";

const platformUrl = "http://graspful.ai:3001";
const appUrl = "http://app.graspful.ai:3001";
const academyUrl = "http://firefighterprep.vercel.app:3001";

test.describe("Host-aware routing", () => {
  test("keeps graspful.ai as marketing and sends product traffic to app.graspful.ai", async ({
    page,
  }) => {
    await page.goto(`${platformUrl}/`);
    await expect(page).toHaveURL(`${platformUrl}/`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.goto(`${platformUrl}/dashboard`);
    await expect(page).toHaveURL(
      `${appUrl}/sign-in?redirect=%2Fdashboard`,
    );
  });

  test("treats app.graspful.ai as the creator control plane", async ({ page }) => {
    await page.goto(`${appUrl}/`);
    await expect(page).toHaveURL(`${appUrl}/sign-in`);
    await expect(page.getByText("Welcome back")).toBeVisible();

    await page.goto(`${appUrl}/pricing`);
    await expect(page).toHaveURL(`${platformUrl}/pricing`);
  });

  test("keeps academy domains learner-facing and routes platform pages away", async ({
    page,
  }) => {
    await page.goto(`${academyUrl}/`);
    await expect(page).toHaveURL(`${academyUrl}/`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.goto(`${academyUrl}/pricing`);
    await expect(page).toHaveURL(`${platformUrl}/pricing`);

    await page.goto(`${academyUrl}/creator`);
    await expect(page).toHaveURL(`${appUrl}/sign-in?redirect=%2Fcreator`);
  });
});
