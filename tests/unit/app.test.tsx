import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "@/App";
import { useWorkspaceStore } from "@/stores/workspace";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("App", () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      folderPath: null,
      isLoading: false,
      error: null,
      loadSavedFolder: vi.fn(),
    });
  });

  it("shows WelcomeScreen when no folder is open", () => {
    render(<App />);
    expect(screen.getByText("Episteme")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /open folder/i })
    ).toBeInTheDocument();
  });

  it("shows loading state", () => {
    useWorkspaceStore.setState({ isLoading: true, folderPath: null });

    render(<App />);
    expect(screen.getByText("Loading folder...")).toBeInTheDocument();
  });

  it("shows workspace layout when folder is open", () => {
    useWorkspaceStore.setState({ folderPath: "/some/path" });

    render(<App />);
    expect(screen.getByText("Select a document from the sidebar")).toBeInTheDocument();
    expect(document.querySelector("aside")).toBeInTheDocument();
  });

  it("calls loadSavedFolder on mount", () => {
    const loadSavedFolder = vi.fn();
    useWorkspaceStore.setState({ loadSavedFolder });

    render(<App />);
    expect(loadSavedFolder).toHaveBeenCalledOnce();
  });
});
