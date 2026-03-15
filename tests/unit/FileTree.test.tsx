import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FileTree } from "@/components/FileTree";
import { useFileTreeStore } from "@/stores/fileTree";
import { useShortcutsStore } from "@/stores/shortcuts";
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

function registerFileTreeActions() {
  const { registerAction } = useShortcutsStore.getState();
  registerAction({ id: "filetree.navigateUp", label: "Navigate up", defaultBinding: "ArrowUp", category: "File tree", firesThroughInputs: false });
  registerAction({ id: "filetree.navigateDown", label: "Navigate down", defaultBinding: "ArrowDown", category: "File tree", firesThroughInputs: false });
  registerAction({ id: "filetree.collapse", label: "Collapse", defaultBinding: "ArrowLeft", category: "File tree", firesThroughInputs: false });
  registerAction({ id: "filetree.expand", label: "Expand", defaultBinding: "ArrowRight", category: "File tree", firesThroughInputs: false });
  registerAction({ id: "filetree.open", label: "Open file", defaultBinding: "Enter", category: "File tree", firesThroughInputs: false });
}

describe("FileTree", () => {
  beforeEach(() => {
    useFileTreeStore.setState({
      nodes: [],
      expandedPaths: new Set(),
      selectedFilePath: null,
      isLoading: false,
      error: null,
    });
    useShortcutsStore.setState({ actions: {}, customBindings: {} });
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

describe("FileTree keyboard navigation", () => {
  beforeEach(() => {
    useFileTreeStore.setState({
      nodes: mockTree,
      expandedPaths: new Set(["/docs/specs"]),
      selectedFilePath: null,
      isLoading: false,
      error: null,
    });
    useShortcutsStore.setState({ actions: {}, customBindings: {} });
    registerFileTreeActions();
  });

  function getTree() {
    return screen.getByRole("tree");
  }

  it("ArrowDown moves focus to next visible item", () => {
    render(<FileTree />);
    // Visible order: /docs/specs, /docs/specs/app.md, /docs/specs/feature.md, /docs/README.md
    // Initial focused path is the first item (/docs/specs)
    fireEvent.keyDown(getTree(), { code: "ArrowDown" });
    // After one ArrowDown the focused path should be /docs/specs/app.md
    // We verify by firing ArrowDown again and then Enter to open the second child
    fireEvent.keyDown(getTree(), { code: "ArrowDown" });
    fireEvent.keyDown(getTree(), { code: "Enter" });
    expect(useFileTreeStore.getState().selectedFilePath).toBe("/docs/specs/feature.md");
  });

  it("ArrowUp moves focus to previous visible item", () => {
    render(<FileTree />);
    // Navigate down to /docs/specs/app.md then back up to /docs/specs
    fireEvent.keyDown(getTree(), { code: "ArrowDown" });
    fireEvent.keyDown(getTree(), { code: "ArrowUp" });
    fireEvent.keyDown(getTree(), { code: "Enter" });
    // /docs/specs is a dir — Enter toggles it (collapse), not selectFile
    // selectedFilePath stays null, but if it were a file it would be selected.
    // Instead verify we're back on specs by collapsing it
    expect(useFileTreeStore.getState().expandedPaths.has("/docs/specs")).toBe(false);
  });

  it("ArrowRight expands a collapsed directory", () => {
    useFileTreeStore.setState({ expandedPaths: new Set() });
    render(<FileTree />);
    // Focus is on /docs/specs (collapsed); ArrowRight should expand it
    fireEvent.keyDown(getTree(), { code: "ArrowRight" });
    expect(useFileTreeStore.getState().expandedPaths.has("/docs/specs")).toBe(true);
  });

  it("ArrowLeft collapses an expanded directory", () => {
    render(<FileTree />);
    // /docs/specs is expanded; focus starts there
    fireEvent.keyDown(getTree(), { code: "ArrowLeft" });
    expect(useFileTreeStore.getState().expandedPaths.has("/docs/specs")).toBe(false);
  });

  it("Enter opens a file", () => {
    render(<FileTree />);
    // Navigate down three times to reach /docs/README.md
    fireEvent.keyDown(getTree(), { code: "ArrowDown" });
    fireEvent.keyDown(getTree(), { code: "ArrowDown" });
    fireEvent.keyDown(getTree(), { code: "ArrowDown" });
    fireEvent.keyDown(getTree(), { code: "Enter" });
    expect(useFileTreeStore.getState().selectedFilePath).toBe("/docs/README.md");
  });
});
