import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FileTree } from "@/components/FileTree";
import { useFileTreeStore } from "@/stores/fileTree";
import type { FileNode } from "@/lib/fileTree";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockTree: FileNode[] = [
  {
    name: "specs",
    path: "/docs/specs",
    is_dir: true,
    children: [
      { name: "app.md", path: "/docs/specs/app.md", is_dir: false },
      { name: "feature.md", path: "/docs/specs/feature.md", is_dir: false },
    ],
  },
  { name: "README.md", path: "/docs/README.md", is_dir: false },
];

describe("FileTree", () => {
  beforeEach(() => {
    useFileTreeStore.setState({
      nodes: [],
      expandedPaths: new Set(),
      selectedFilePath: null,
      isLoading: false,
      error: null,
    });
  });

  it("shows empty message when no nodes", () => {
    render(<FileTree />);
    expect(screen.getByText("No markdown files found")).toBeInTheDocument();
  });

  it("renders top-level items", () => {
    useFileTreeStore.setState({ nodes: mockTree });
    render(<FileTree />);
    expect(screen.getByText("specs")).toBeInTheDocument();
    expect(screen.getByText("README")).toBeInTheDocument();
  });

  it("does not render children of collapsed folders", () => {
    useFileTreeStore.setState({ nodes: mockTree });
    render(<FileTree />);
    expect(screen.queryByText("app")).not.toBeInTheDocument();
  });

  it("renders children of expanded folders", () => {
    useFileTreeStore.setState({
      nodes: mockTree,
      expandedPaths: new Set(["/docs/specs"]),
    });
    render(<FileTree />);
    expect(screen.getByText("app")).toBeInTheDocument();
    expect(screen.getByText("feature")).toBeInTheDocument();
  });

  it("toggles folder on click", async () => {
    useFileTreeStore.setState({ nodes: mockTree });
    render(<FileTree />);

    await userEvent.click(screen.getByText("specs"));

    // After clicking, folder should be expanded
    expect(screen.getByText("app")).toBeInTheDocument();
  });

  it("selects file on click", async () => {
    useFileTreeStore.setState({ nodes: mockTree });
    render(<FileTree />);

    await userEvent.click(screen.getByText("README"));

    expect(useFileTreeStore.getState().selectedFilePath).toBe(
      "/docs/README.md"
    );
  });
});
