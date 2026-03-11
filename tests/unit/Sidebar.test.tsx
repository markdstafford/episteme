import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Sidebar } from "@/components/Sidebar";
import { useWorkspaceStore } from "@/stores/workspace";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("Sidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkspaceStore.setState({
      folderPath: null,
      isLoading: false,
      error: null,
      openFolder: vi.fn(),
      loadSavedFolder: vi.fn(),
    });
  });

  it("renders children", () => {
    render(
      <Sidebar>
        <p>Test content</p>
      </Sidebar>
    );
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("renders as aside element", () => {
    render(
      <Sidebar>
        <p>Content</p>
      </Sidebar>
    );
    const aside = document.querySelector("aside");
    expect(aside).toBeInTheDocument();
  });

  it("shows folder basename when a folder is open", () => {
    useWorkspaceStore.setState({ folderPath: "/Users/alice/my-docs-folder" });
    render(<Sidebar><p>content</p></Sidebar>);
    expect(screen.getByText("my-docs-folder")).toBeInTheDocument();
  });

  it("shows folder basename for Windows-style paths", () => {
    useWorkspaceStore.setState({ folderPath: "C:\\Users\\alice\\my-docs-folder" });
    render(<Sidebar><p>content</p></Sidebar>);
    expect(screen.getByText("my-docs-folder")).toBeInTheDocument();
  });

  it("does not show the full path — only the final segment", () => {
    useWorkspaceStore.setState({ folderPath: "/Users/alice/my-docs-folder" });
    render(<Sidebar><p>content</p></Sidebar>);
    expect(screen.queryByText("/Users/alice/my-docs-folder")).not.toBeInTheDocument();
  });

  it("does not render the old folder-header div (replaced by TitleBar)", () => {
    useWorkspaceStore.setState({ folderPath: null });
    render(<Sidebar><p>content</p></Sidebar>);
    expect(document.querySelector("[data-testid='folder-header']")).not.toBeInTheDocument();
  });

  it("renders TitleBar as the first child of aside", () => {
    useWorkspaceStore.setState({ folderPath: "/Users/alice/my-docs-folder" });
    render(<Sidebar><p>content</p></Sidebar>);
    const aside = document.querySelector("aside");
    // TitleBar renders a div; it should be the first element child of aside
    expect(aside?.firstElementChild).not.toBeNull();
    // The scroll container (second child) should follow TitleBar
    const scrollContainer = aside?.children[1];
    expect(scrollContainer?.className).toMatch(/overflow-y-auto/);
  });
});
