import { test, expect } from "@playwright/test";

test.describe("Markdown rendering", () => {
  test("empty state shows select document message", async ({ page }) => {
    await page.addInitScript(() => {
      (window as Record<string, unknown>).__TAURI_INTERNALS__ = {
        invoke: async (cmd: string) => {
          if (cmd === "load_preferences")
            return { last_opened_folder: "/test/docs" };
          if (cmd === "list_files")
            return [
              {
                name: "readme.md",
                path: "/test/docs/readme.md",
                is_dir: false,
              },
            ];
          if (cmd === "save_preferences") return undefined;
          return null;
        },
      };
    });

    await page.goto("/");

    await expect(
      page.getByText("Select a document from the sidebar")
    ).toBeVisible();
  });

  test("selecting file renders document content", async ({ page }) => {
    await page.addInitScript(() => {
      (window as Record<string, unknown>).__TAURI_INTERNALS__ = {
        invoke: async (cmd: string) => {
          if (cmd === "load_preferences")
            return { last_opened_folder: "/test/docs" };
          if (cmd === "list_files")
            return [
              {
                name: "readme.md",
                path: "/test/docs/readme.md",
                is_dir: false,
              },
            ];
          if (cmd === "save_preferences") return undefined;
          if (cmd === "read_file")
            return "---\ntitle: My Test Title\nstatus: draft\n---\n# Welcome\n\nBody content here.";
          return null;
        },
      };
    });

    await page.goto("/");

    // Click the file in the sidebar
    await page.getByText("readme").click();

    // Should render frontmatter bar
    const frontmatterBar = page.locator(".bg-gray-50");
    await expect(frontmatterBar).toBeVisible();
    await expect(frontmatterBar.getByText("title", { exact: true })).toBeVisible();
    await expect(frontmatterBar.getByText("My Test Title")).toBeVisible();
    await expect(frontmatterBar.getByText("status", { exact: true })).toBeVisible();
    await expect(frontmatterBar.getByText("draft")).toBeVisible();

    // Should render markdown in prose container
    await expect(page.locator(".prose")).toBeVisible();

    // Content should be in a centered container
    await expect(page.locator(".max-w-4xl")).toBeVisible();
  });

  test("document content area is scrollable", async ({ page }) => {
    const longContent =
      "# Long Document\n\n" + "Paragraph of text.\n\n".repeat(100);

    await page.addInitScript((content: string) => {
      (window as Record<string, unknown>).__TAURI_INTERNALS__ = {
        invoke: async (cmd: string) => {
          if (cmd === "load_preferences")
            return { last_opened_folder: "/test/docs" };
          if (cmd === "list_files")
            return [
              {
                name: "long.md",
                path: "/test/docs/long.md",
                is_dir: false,
              },
            ];
          if (cmd === "save_preferences") return undefined;
          if (cmd === "read_file") return content;
          return null;
        },
      };
    }, longContent);

    await page.goto("/");
    await page.getByText("long").click();

    // Should have overflow-y-auto on the content area
    await expect(page.locator(".overflow-y-auto").first()).toBeVisible();
  });
});
