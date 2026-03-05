import { test, expect } from "@playwright/test";

test.describe("Sidebar", () => {
  test("welcome screen shows when no folder is open", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: /open folder/i })
    ).toBeVisible();
    // Sidebar should not be visible on welcome screen
    await expect(page.locator("aside")).not.toBeVisible();
  });
});
