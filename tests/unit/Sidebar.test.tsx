import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Sidebar } from "@/components/Sidebar";
import { useWorkspaceStore } from "@/stores/workspace";
import { useSettingsStore } from "@/stores/settings";

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
    useSettingsStore.setState({ settingsOpen: false, activeCategory: "ai" });
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

  it("renders folder name header when folderPath is set", () => {
    useWorkspaceStore.setState({ folderPath: "/Users/alice/my-docs-folder" });
    render(<Sidebar><p>content</p></Sidebar>);
    expect(document.querySelector("[data-testid='folder-header']")).toBeInTheDocument();
    expect(screen.getByText("my-docs-folder")).toBeInTheDocument();
  });

  it("does not render folder name header when folderPath is null", () => {
    render(<Sidebar><p>content</p></Sidebar>);
    expect(document.querySelector("[data-testid='folder-header']")).not.toBeInTheDocument();
  });

  it("calls openFolder when folder name is clicked", () => {
    const openFolder = vi.fn();
    useWorkspaceStore.setState({
      folderPath: "/Users/alice/my-docs-folder",
      openFolder,
    });
    render(<Sidebar><p>content</p></Sidebar>);
    fireEvent.click(screen.getByText("my-docs-folder"));
    expect(openFolder).toHaveBeenCalledOnce();
  });

  it("folder name span has truncate class", () => {
    useWorkspaceStore.setState({ folderPath: "/Users/alice/my-docs-folder" });
    render(<Sidebar><p>content</p></Sidebar>);
    const span = screen.getByText("my-docs-folder");
    expect(span.className).toMatch(/truncate/);
  });

  it("folder header has flex row layout", () => {
    useWorkspaceStore.setState({ folderPath: "/Users/alice/my-docs-folder" });
    render(<Sidebar><p>content</p></Sidebar>);
    const header = document.querySelector("[data-testid='folder-header']");
    expect(header?.className).toMatch(/flex/);
  });

  it("does not render TitleBar inside Sidebar", () => {
    useWorkspaceStore.setState({ folderPath: "/Users/alice/my-docs-folder" });
    render(<Sidebar><p>content</p></Sidebar>);
    expect(screen.queryByRole("button", { name: /navigate back/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /navigate forward/i })).not.toBeInTheDocument();
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

  it("renders SettingsNav (Back to app button) when settingsOpen is true", () => {
    useSettingsStore.setState({ settingsOpen: true, activeCategory: "ai" });
    render(<Sidebar><p>file tree</p></Sidebar>);
    expect(screen.getByRole("button", { name: /back to app/i })).toBeInTheDocument();
    expect(screen.queryByText("file tree")).not.toBeInTheDocument();
  });

  it("renders children when settingsOpen is false", () => {
    useSettingsStore.setState({ settingsOpen: false });
    render(<Sidebar><p>file tree</p></Sidebar>);
    expect(screen.getByText("file tree")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /back to app/i })).not.toBeInTheDocument();
  });

});
