import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("does not render a folder header when no folder is open", () => {
    useWorkspaceStore.setState({ folderPath: null });
    render(<Sidebar><p>content</p></Sidebar>);
    expect(document.querySelector("[data-testid='folder-header']")).not.toBeInTheDocument();
  });

  it("clicking the folder name calls openFolder", async () => {
    const openFolder = vi.fn();
    useWorkspaceStore.setState({
      folderPath: "/Users/alice/my-docs-folder",
      openFolder,
    });
    render(<Sidebar><p>content</p></Sidebar>);
    await userEvent.click(screen.getByText("my-docs-folder"));
    expect(openFolder).toHaveBeenCalledOnce();
  });

  it("header has a bottom border separating it from the file tree", () => {
    useWorkspaceStore.setState({ folderPath: "/Users/alice/my-docs-folder" });
    render(<Sidebar><p>content</p></Sidebar>);
    const header = document.querySelector("[data-testid='folder-header']");
    expect(header).toBeInTheDocument();
    expect(header?.className).toMatch(/border-b/);
  });

  it("folder name element has truncate class for long name handling", () => {
    useWorkspaceStore.setState({ folderPath: "/Users/alice/my-docs-folder" });
    render(<Sidebar><p>content</p></Sidebar>);
    const nameEl = screen.getByText("my-docs-folder");
    expect(nameEl.className).toMatch(/truncate/);
    expect(nameEl.className).toMatch(/min-w-0/);
  });

  it("header is a flex row to accommodate a future right-side button", () => {
    useWorkspaceStore.setState({ folderPath: "/Users/alice/my-docs-folder" });
    render(<Sidebar><p>content</p></Sidebar>);
    const header = document.querySelector("[data-testid='folder-header']");
    expect(header?.className).toMatch(/flex/);
    expect(header?.className).toMatch(/items-center/);
    expect(header?.className).toMatch(/justify-between/);
  });
});
