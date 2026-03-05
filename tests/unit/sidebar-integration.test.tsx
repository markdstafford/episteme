import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "@/App";
import { useWorkspaceStore } from "@/stores/workspace";
import { useFileTreeStore } from "@/stores/fileTree";
import type { FileNode } from "@/lib/fileTree";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
const mockInvoke = vi.mocked(invoke);

const mockTree: FileNode[] = [
  {
    name: "specs",
    path: "/docs/specs",
    is_dir: true,
    children: [
      { name: "app.md", path: "/docs/specs/app.md", is_dir: false },
    ],
  },
  { name: "README.md", path: "/docs/README.md", is_dir: false },
];

describe("Sidebar integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkspaceStore.setState({
      folderPath: "/docs",
      isLoading: false,
      error: null,
      loadSavedFolder: vi.fn(),
    });
    useFileTreeStore.setState({
      nodes: mockTree,
      expandedPaths: new Set(),
      selectedFilePath: null,
      isLoading: false,
      error: null,
    });
  });

  it("renders tree after folder is open", () => {
    render(<App />);
    expect(screen.getByText("specs")).toBeInTheDocument();
    expect(screen.getByText("README")).toBeInTheDocument();
  });

  it("click folder → expands children", async () => {
    render(<App />);

    // Children should not be visible initially
    expect(screen.queryByText("app")).not.toBeInTheDocument();

    // Click folder to expand
    await userEvent.click(screen.getByText("specs"));

    expect(screen.getByText("app")).toBeInTheDocument();
  });

  it("click folder again → collapses children", async () => {
    render(<App />);

    await userEvent.click(screen.getByText("specs"));
    expect(screen.getByText("app")).toBeInTheDocument();

    await userEvent.click(screen.getByText("specs"));
    expect(screen.queryByText("app")).not.toBeInTheDocument();
  });

  it("click file → file selected in store", async () => {
    render(<App />);

    await userEvent.click(screen.getByText("README"));

    expect(useFileTreeStore.getState().selectedFilePath).toBe(
      "/docs/README.md"
    );
  });
});
