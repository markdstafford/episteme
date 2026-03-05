import { test, expect } from "@playwright/test";

test.describe("Open Folder", () => {
  test("displays welcome screen on first launch", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveText("Episteme");
    await expect(
      page.locator("text=Open a folder to get started")
    ).toBeVisible();
  });

  test("Open Folder button is visible and clickable", async ({ page }) => {
    await page.goto("/");
    const button = page.getByRole("button", { name: /open folder/i });
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
  });
});
