import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "@/App";
import { useWorkspaceStore } from "@/stores/workspace";
import { useFileTreeStore } from "@/stores/fileTree";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
const mockInvoke = vi.mocked(invoke);

describe("Open folder integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkspaceStore.setState({
      folderPath: null,
      isLoading: false,
      error: null,
    });
    useFileTreeStore.setState({
      nodes: [],
      expandedPaths: new Set(),
      selectedFilePath: null,
      isLoading: false,
      error: null,
    });
  });

  it("click Open Folder → dialog → path returned → store updated → UI updates", async () => {
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "load_preferences") return { last_opened_folder: null };
      if (cmd === "open_folder") return "/test/docs";
      if (cmd === "save_preferences") return undefined;
      if (cmd === "list_files") return [];
      return null;
    });

    render(<App />);

    // Wait for loadSavedFolder to complete and welcome screen to appear
    const button = await screen.findByRole("button", { name: /open folder/i });
    expect(button).toBeInTheDocument();

    // Click Open Folder
    await userEvent.click(button);

    // Should show workspace layout with sidebar
    await waitFor(() => {
      expect(screen.getByText("Select a document from the sidebar")).toBeInTheDocument();
    });

    expect(useWorkspaceStore.getState().folderPath).toBe("/test/docs");
  });

  it("dialog cancelled → store unchanged", async () => {
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "load_preferences") return { last_opened_folder: null };
      if (cmd === "open_folder") return null;
      return null;
    });

    render(<App />);

    const button = await screen.findByRole("button", { name: /open folder/i });
    await userEvent.click(button);

    // Should still show welcome screen
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /open folder/i })
      ).toBeInTheDocument();
    });

    expect(useWorkspaceStore.getState().folderPath).toBeNull();
  });

  it("error case → error displayed", async () => {
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "load_preferences") return { last_opened_folder: null };
      if (cmd === "open_folder") throw new Error("Permission denied");
      return null;
    });

    render(<App />);

    const button = await screen.findByRole("button", { name: /open folder/i });
    await userEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/could not open folder/i)).toBeInTheDocument();
    });
  });
});
