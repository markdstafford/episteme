import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DocumentViewer } from "@/components/DocumentViewer";
import { useFileTreeStore } from "@/stores/fileTree";
import { useWorkspaceStore } from "@/stores/workspace";
import { useAiChatStore } from "@/stores/aiChat";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
const mockInvoke = vi.mocked(invoke);

describe("DocumentViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFileTreeStore.setState({
      nodes: [],
      expandedPaths: new Set(),
      selectedFilePath: null,
      isLoading: false,
      error: null,
    });
    useWorkspaceStore.setState({
      folderPath: "/workspace",
      isLoading: false,
      error: null,
    });
    useAiChatStore.setState({ documentReloadCounter: 0 } as any);
  });

  it("shows empty state when no file selected", () => {
    render(<DocumentViewer />);
    expect(
      screen.getByText("Select a document from the sidebar")
    ).toBeInTheDocument();
  });

  it("shows loading state while reading file", async () => {
    // Make invoke hang to keep loading state visible
    mockInvoke.mockImplementation(
      () => new Promise(() => {})
    );
    useFileTreeStore.setState({ selectedFilePath: "/workspace/doc.md" });

    render(<DocumentViewer />);
    expect(screen.getByText("Loading document...")).toBeInTheDocument();
  });

  it("shows error state on read failure", async () => {
    mockInvoke.mockRejectedValue("File not found");
    useFileTreeStore.setState({ selectedFilePath: "/workspace/missing.md" });

    render(<DocumentViewer />);
    await waitFor(() => {
      expect(
        screen.getByText(/Failed to load document/)
      ).toBeInTheDocument();
    });
  });

  it("renders markdown content on success", async () => {
    mockInvoke.mockResolvedValue("# Hello World\n\nSome content here.");
    useFileTreeStore.setState({ selectedFilePath: "/workspace/doc.md" });

    render(<DocumentViewer />);
    await waitFor(() => {
      expect(
        screen.queryByText("Loading document...")
      ).not.toBeInTheDocument();
    });
    // Verify prose wrapper exists (TipTap renders the content)
    expect(document.querySelector(".prose")).toBeInTheDocument();
  });

  it("renders frontmatter bar when frontmatter is present", async () => {
    mockInvoke.mockResolvedValue(
      "---\ntitle: Test Doc\nstatus: draft\n---\n# Content"
    );
    useFileTreeStore.setState({ selectedFilePath: "/workspace/doc.md" });

    render(<DocumentViewer />);
    await waitFor(() => {
      expect(screen.getByText("title")).toBeInTheDocument();
    });
    expect(screen.getByText("Test Doc")).toBeInTheDocument();
    expect(screen.getByText("status")).toBeInTheDocument();
    expect(screen.getByText("draft")).toBeInTheDocument();
  });

  it("does not render frontmatter bar when no frontmatter", async () => {
    mockInvoke.mockResolvedValue("# Just markdown\n\nNo frontmatter here.");
    useFileTreeStore.setState({ selectedFilePath: "/workspace/doc.md" });

    render(<DocumentViewer />);
    await waitFor(() => {
      expect(
        screen.queryByText("Loading document...")
      ).not.toBeInTheDocument();
    });
    // No frontmatter labels should appear
    expect(screen.queryByText("title")).not.toBeInTheDocument();
    expect(screen.queryByText("status")).not.toBeInTheDocument();
  });

  it("has correct layout classes and background token", async () => {
    mockInvoke.mockResolvedValue("# Doc");
    useFileTreeStore.setState({ selectedFilePath: "/workspace/doc.md" });

    const { container } = render(<DocumentViewer />);
    await waitFor(() => {
      expect(screen.queryByText("Loading document...")).not.toBeInTheDocument();
    });

    const outer = container.firstChild as HTMLElement;
    expect(outer.classList.contains("overflow-y-auto")).toBe(true);
    expect(outer.style.backgroundColor).toBe("var(--color-bg-base)");

    const contentCol = outer.lastElementChild as HTMLElement;
    expect(contentCol.style.maxWidth).toBe("var(--doc-content-width)");
    expect(contentCol.classList.contains("mx-auto")).toBe(true);
    expect(contentCol.classList.contains("max-w-4xl")).toBe(false);
    expect(contentCol.classList.contains("p-8")).toBe(false);
  });

  it("renders FrontmatterBar outside the content column when frontmatter present", async () => {
    mockInvoke.mockResolvedValue("---\ntitle: Test\n---\n# Content");
    useFileTreeStore.setState({ selectedFilePath: "/workspace/doc.md" });

    const { container } = render(<DocumentViewer />);
    await waitFor(() => {
      expect(screen.getByText("title")).toBeInTheDocument();
    });

    const outer = container.firstChild as HTMLElement;
    expect(outer.children.length).toBe(2);
    expect(outer.children[0].textContent).toContain("title");
    expect((outer.children[1] as HTMLElement).style.maxWidth).toBe("var(--doc-content-width)");
  });

  it("clears content when selected file changes to null", async () => {
    mockInvoke.mockResolvedValue("# Doc");
    useFileTreeStore.setState({ selectedFilePath: "/workspace/doc.md" });

    const { rerender } = render(<DocumentViewer />);
    await waitFor(() => {
      expect(document.querySelector(".prose")).toBeInTheDocument();
    });

    // Deselect file
    useFileTreeStore.setState({ selectedFilePath: null });
    rerender(<DocumentViewer />);

    expect(
      screen.getByText("Select a document from the sidebar")
    ).toBeInTheDocument();
  });
});
