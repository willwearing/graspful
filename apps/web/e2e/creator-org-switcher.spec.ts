import { test, expect } from "@playwright/test";
import { signUpAsCreator } from "./helpers/auth";

test.describe("Creator Org Switcher", () => {
  test("org switcher is hidden when user has only one org", async ({
    page,
  }) => {
    await signUpAsCreator(page);

    // Fresh user belongs to exactly one org.
    // The OrgSwitcher component returns null when orgs.length <= 1.
    // Verify the switcher is NOT visible.
    await page.waitForTimeout(2000); // Allow the async fetch to complete

    // The org switcher renders a button with a Building2 icon and ChevronsUpDown.
    // If hidden, we should not find the "Organizations" dropdown trigger.
    const switcher = page.getByRole("button", { name: /Organizations/i });
    await expect(switcher).toBeHidden();
  });
});
