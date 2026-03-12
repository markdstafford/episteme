import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "@/App";
import { useWorkspaceStore } from "@/stores/workspace";
import { listen } from "@tauri-apps/api/event";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

// Mock CreateNewDialog so tests can control selection without full dialog mount
vi.mock("@/components/CreateNewDialog", () => ({
  CreateNewDialog: ({
    onSelect,
    onClose,
  }: {
    onSelect: (skillName: string | null) => void;
    onClose: () => void;
  }) => (
    <div data-testid="create-new-dialog">
      <button onClick={() => onSelect(null)}>Select no skill</button>
      <button onClick={() => onSelect("product-description")}>
        Select skill
      </button>
      <button onClick={onClose}>Close dialog</button>
    </div>
  ),
}));

describe("Document authoring flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom does not implement scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
    vi.mocked(listen).mockResolvedValue(vi.fn());

    useWorkspaceStore.setState({
      folderPath: "/workspace/docs",
      isLoading: false,
      error: null,
      openFolder: vi.fn(),
      loadSavedFolder: vi.fn(),
    });
  });

  it("New document button is visible when a folder is open", () => {
    render(<App />);
    expect(
      screen.getByRole("button", { name: /new document/i })
    ).toBeInTheDocument();
  });

  it("clicking New document opens the dialog", () => {
    render(<App />);

    expect(screen.queryByTestId("create-new-dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /new document/i }));

    expect(screen.getByTestId("create-new-dialog")).toBeInTheDocument();
  });

});
