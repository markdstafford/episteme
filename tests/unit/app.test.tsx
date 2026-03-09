import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "@/App";
import { useWorkspaceStore } from "@/stores/workspace";
import { listen } from "@tauri-apps/api/event";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("App", () => {
  beforeEach(() => {
    vi.mocked(listen).mockResolvedValue(vi.fn());
    useWorkspaceStore.setState({
      folderPath: null,
      isLoading: false,
      error: null,
      openFolder: vi.fn(),
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

  it("registers menu:open-folder listener on mount", async () => {
    render(<App />);
    await waitFor(() => {
      expect(listen).toHaveBeenCalledWith("menu:open-folder", expect.any(Function));
    });
  });

  it("calls openFolder when menu:open-folder event fires", async () => {
    const openFolder = vi.fn();
    useWorkspaceStore.setState({ openFolder });

    let eventHandler: (() => void) | undefined;
    vi.mocked(listen).mockImplementation((event, handler) => {
      if (event === "menu:open-folder") eventHandler = handler as () => void;
      return Promise.resolve(vi.fn());
    });

    render(<App />);
    await waitFor(() => expect(eventHandler).toBeDefined());

    eventHandler!();
    expect(openFolder).toHaveBeenCalledOnce();
  });

  it("cleans up menu event listeners on unmount", async () => {
    const mockUnlisten = vi.fn();
    vi.mocked(listen).mockResolvedValue(mockUnlisten);

    const { unmount } = render(<App />);
    await waitFor(() => expect(listen).toHaveBeenCalledWith("menu:open-folder", expect.any(Function)));
    await waitFor(() => expect(listen).toHaveBeenCalledWith("menu:open-settings", expect.any(Function)));

    unmount();
    await waitFor(() => expect(mockUnlisten).toHaveBeenCalledTimes(2));
  });
});
