import { test, expect } from "@playwright/test";

// These tests require `npm run dev` running at http://localhost:1420

test.describe("Keyboard shortcuts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("Meta+, opens the settings panel", async ({ page }) => {
    await page.keyboard.press("Meta+,");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });

  test("Meta+/ opens the quick reference dialog", async ({ page }) => {
    await page.keyboard.press("Meta+/");
    await expect(
      page.getByRole("dialog", { name: "Keyboard shortcuts" })
    ).toBeVisible();
  });

  test("Escape closes an open dialog", async ({ page }) => {
    await page.keyboard.press("Meta+/");
    await expect(
      page.getByRole("dialog", { name: "Keyboard shortcuts" })
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("dialog", { name: "Keyboard shortcuts" })
    ).not.toBeVisible();
  });
});
