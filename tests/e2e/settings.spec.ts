import { test, expect } from "@playwright/test";

// These tests require `npm run tauri dev` running at http://localhost:1420
// The app must have a workspace folder open (app shows WelcomeScreen without one)

test.describe("Settings dialog", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("opens via Cmd+, keyboard shortcut", async ({ page }) => {
    await page.keyboard.press("Meta+,");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });

  test("closes via Escape", async ({ page }) => {
    await page.keyboard.press("Meta+,");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Settings" })).not.toBeVisible();
  });

  test("closes via X button", async ({ page }) => {
    await page.keyboard.press("Meta+,");
    await page.getByLabel("Close settings").click();
    await expect(page.getByRole("heading", { name: "Settings" })).not.toBeVisible();
  });

  test("AWS profile field is present and editable", async ({ page }) => {
    await page.keyboard.press("Meta+,");
    const input = page.getByLabel("AWS Profile");
    await expect(input).toBeVisible();
    await expect(input).toBeEnabled();
  });
});
