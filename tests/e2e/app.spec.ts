import { test, expect } from "@playwright/test";

test.describe("App", () => {
  test("displays the app title", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveText("Episteme");
  });

  test("displays welcome message", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Open a folder to get started")).toBeVisible();
  });

  test("has correct page title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Episteme");
  });
});
