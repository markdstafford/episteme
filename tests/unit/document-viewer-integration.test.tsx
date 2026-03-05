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

describe("Document viewer integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFileTreeStore.setState({
      nodes: [
        { name: "readme.md", path: "/workspace/readme.md", is_dir: false },
        { name: "guide.md", path: "/workspace/guide.md", is_dir: false },
      ],
      expandedPaths: new Set(),
      selectedFilePath: null,
      isLoading: false,
      error: null,
    });
    useWorkspaceStore.setState({
      folderPath: "/workspace",
      isLoading: false,
      error: null,
      loadSavedFolder: vi.fn(),
    });
  });

  it("select file → content renders in viewer", async () => {
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "read_file")
        return "---\ntitle: Readme\n---\n# Hello World";
      if (cmd === "list_files") return [];
      return null;
    });

    render(<App />);

    // Click a file in the sidebar
    const fileItem = screen.getByText("readme");
    await userEvent.click(fileItem);

    // Document should render with frontmatter
    await waitFor(() => {
      expect(screen.getByText("title")).toBeInTheDocument();
    });
    expect(screen.getByText("Readme")).toBeInTheDocument();
    expect(document.querySelector(".prose")).toBeInTheDocument();
  });

  it("file with frontmatter → frontmatter bar shown", async () => {
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "read_file")
        return "---\nstatus: published\nauthor: Alice\n---\n# Doc";
      if (cmd === "list_files") return [];
      return null;
    });

    render(<App />);

    await userEvent.click(screen.getByText("readme"));

    await waitFor(() => {
      expect(screen.getByText("status")).toBeInTheDocument();
    });
    expect(screen.getByText("published")).toBeInTheDocument();
    expect(screen.getByText("author")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("file without frontmatter → no frontmatter bar", async () => {
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "read_file") return "# Just Markdown\n\nNo frontmatter.";
      if (cmd === "list_files") return [];
      return null;
    });

    render(<App />);

    await userEvent.click(screen.getByText("readme"));

    await waitFor(() => {
      expect(document.querySelector(".prose")).toBeInTheDocument();
    });
    // No frontmatter labels
    expect(screen.queryByText("status")).not.toBeInTheDocument();
    expect(screen.queryByText("author")).not.toBeInTheDocument();
  });

  it("switching files updates the viewer", async () => {
    let callCount = 0;
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "read_file") {
        callCount++;
        return callCount === 1
          ? "---\nstatus: alpha\n---\n# First Doc"
          : "---\nstatus: beta\n---\n# Second Doc";
      }
      if (cmd === "list_files") return [];
      return null;
    });

    render(<App />);

    // Click first file
    await userEvent.click(screen.getByText("readme"));
    await waitFor(() => {
      expect(screen.getByText("alpha")).toBeInTheDocument();
    });

    // Click second file
    await userEvent.click(screen.getByText("guide"));
    await waitFor(() => {
      expect(screen.getByText("beta")).toBeInTheDocument();
    });
  });

  it("read error → error message shown", async () => {
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "read_file") throw new Error("Permission denied");
      if (cmd === "list_files") return [];
      return null;
    });

    render(<App />);

    await userEvent.click(screen.getByText("readme"));

    await waitFor(() => {
      expect(screen.getByText(/Failed to load document/)).toBeInTheDocument();
    });
  });
});
