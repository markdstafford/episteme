import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Sidebar } from "@/components/Sidebar";
import { useWorkspaceStore } from "@/stores/workspace";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue([]),
}));

// Mock CreateNewDialog to avoid full mount complexity in Sidebar tests
vi.mock("@/components/CreateNewDialog", () => ({
  CreateNewDialog: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="create-new-dialog">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

describe("Sidebar New document button", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkspaceStore.setState({
      folderPath: "/workspace/docs",
      isLoading: false,
      error: null,
      openFolder: vi.fn(),
      loadSavedFolder: vi.fn(),
    });
  });

  it("renders the New document button when a folder is open and onStartAuthoring is provided", () => {
    render(
      <Sidebar onStartAuthoring={vi.fn()}>
        <div />
      </Sidebar>
    );
    expect(screen.getByRole("button", { name: /new document/i })).toBeTruthy();
  });

  it("does not render the button when onStartAuthoring is not provided", () => {
    render(
      <Sidebar>
        <div />
      </Sidebar>
    );
    expect(screen.queryByRole("button", { name: /new document/i })).toBeNull();
  });

  it("clicking the button opens the dialog", () => {
    render(
      <Sidebar onStartAuthoring={vi.fn()}>
        <div />
      </Sidebar>
    );
    expect(screen.queryByTestId("create-new-dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /new document/i }));
    expect(screen.getByTestId("create-new-dialog")).toBeTruthy();
  });

  it("closing the dialog without selecting does not call onStartAuthoring", () => {
    const onStartAuthoring = vi.fn();
    render(
      <Sidebar onStartAuthoring={onStartAuthoring}>
        <div />
      </Sidebar>
    );
    fireEvent.click(screen.getByRole("button", { name: /new document/i }));
    fireEvent.click(screen.getByText("Close"));
    expect(onStartAuthoring).not.toHaveBeenCalled();
  });
});
