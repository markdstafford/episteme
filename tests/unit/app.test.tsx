import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "@/App";
import { useWorkspaceStore } from "@/stores/workspace";
import { useSettingsStore } from "@/stores/settings";
import { useShortcutsStore } from "@/stores/shortcuts";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("App", () => {
  beforeEach(() => {
    vi.mocked(listen).mockResolvedValue(vi.fn());
    vi.mocked(invoke).mockResolvedValue({});
    useWorkspaceStore.setState({
      folderPath: null,
      isLoading: false,
      error: null,
      openFolder: vi.fn(),
      loadSavedFolder: vi.fn(),
    });
    useSettingsStore.setState({ settingsOpen: false, activeCategory: "ai" });
    useShortcutsStore.setState({ actions: {}, actionsRestricted: false });
  });

  it("shows WelcomeScreen when no folder is open", () => {
    render(<App />);
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

  it("renders TitleBar in the main workspace layout", () => {
    useWorkspaceStore.setState({ folderPath: "/some/path" });
    render(<App />);
    expect(screen.getByRole("button", { name: /navigate back/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /navigate forward/i })).toBeInTheDocument();
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

  it("cleans up the menu:open-folder listener on unmount", async () => {
    const mockUnlisten = vi.fn();
    vi.mocked(listen).mockResolvedValue(mockUnlisten);

    const { unmount } = render(<App />);
    await waitFor(() => expect(listen).toHaveBeenCalledWith("menu:open-folder", expect.any(Function)));

    unmount();
    await waitFor(() => expect(mockUnlisten).toHaveBeenCalled());
  });

  it("does not show DesignKitchen on initial render", () => {
    useWorkspaceStore.setState({ folderPath: "/some/path" });
    render(<App />);
    expect(screen.queryByText("Design Kitchen")).not.toBeInTheDocument();
  });

  it("shows DesignKitchen overlay when Cmd+Shift+K is pressed in dev", async () => {
    useWorkspaceStore.setState({ folderPath: "/some/path" });
    render(<App />);

    expect(screen.queryByText("Design Kitchen")).not.toBeInTheDocument();

    fireEvent.keyDown(document, { code: "KeyK", metaKey: true, shiftKey: true });

    expect(screen.getByText("Design Kitchen")).toBeInTheDocument();
  });

  it("dismisses DesignKitchen when Cmd+Shift+K is pressed again in dev", async () => {
    useWorkspaceStore.setState({ folderPath: "/some/path" });
    render(<App />);

    fireEvent.keyDown(document, { code: "KeyK", metaKey: true, shiftKey: true });
    expect(screen.getByText("Design Kitchen")).toBeInTheDocument();

    fireEvent.keyDown(document, { code: "KeyK", metaKey: true, shiftKey: true });
    expect(screen.queryByText("Design Kitchen")).not.toBeInTheDocument();
  });

  it("registers menu:open-settings listener on mount", async () => {
    render(<App />);
    await waitFor(() => {
      expect(listen).toHaveBeenCalledWith("menu:open-settings", expect.any(Function));
    });
  });

  it("calls openSettings when menu:open-settings event fires", async () => {
    useWorkspaceStore.setState({ folderPath: "/some/path" });
    let settingsHandler: (() => void) | undefined;
    vi.mocked(listen).mockImplementation((event, handler) => {
      if (event === "menu:open-settings") settingsHandler = handler as () => void;
      return Promise.resolve(vi.fn());
    });
    render(<App />);
    await waitFor(() => expect(settingsHandler).toBeDefined());
    settingsHandler!();
    expect(useSettingsStore.getState().settingsOpen).toBe(true);
  });

  it("cleans up menu:open-settings listener on unmount", async () => {
    const mockUnlisten = vi.fn();
    vi.mocked(listen).mockResolvedValue(mockUnlisten);
    const { unmount } = render(<App />);
    await waitFor(() =>
      expect(listen).toHaveBeenCalledWith("menu:open-settings", expect.any(Function))
    );
    unmount();
    await waitFor(() => expect(mockUnlisten).toHaveBeenCalled());
  });

  it("pressing Esc closes settings when settings is open", () => {
    useWorkspaceStore.setState({ folderPath: "/some/path" });
    render(<App />);
    // Open settings via shortcut so the overlay stack is populated
    fireEvent.keyDown(document, { code: "Comma", metaKey: true });
    expect(useSettingsStore.getState().settingsOpen).toBe(true);
    fireEvent.keyDown(document, { code: "Escape" });
    expect(useSettingsStore.getState().settingsOpen).toBe(false);
  });

  it("pressing Esc does nothing when settings is closed", () => {
    useWorkspaceStore.setState({ folderPath: "/some/path" });
    useSettingsStore.setState({ settingsOpen: false });
    render(<App />);
    fireEvent.keyDown(document, { code: "Escape" });
    expect(useSettingsStore.getState().settingsOpen).toBe(false);
  });

  it("renders SettingsPanel in content area when settings is open", () => {
    useWorkspaceStore.setState({ folderPath: "/some/path" });
    useSettingsStore.setState({ settingsOpen: true, activeCategory: "ai" });
    render(<App />);
    // SettingsPanel renders the AWS profile section header from config
    expect(screen.getByText(/credentials/i)).toBeInTheDocument();
  });

  it("does not render an AI chat toggle button", () => {
    useWorkspaceStore.setState({ folderPath: "/some/path" });
    render(<App />);
    expect(screen.queryByTitle(/toggle ai assistant/i)).not.toBeInTheDocument();
  });

  it("renders normal layout when settings is closed", () => {
    useWorkspaceStore.setState({ folderPath: "/some/path" });
    useSettingsStore.setState({ settingsOpen: false });
    render(<App />);
    expect(screen.getByText("Select a document from the sidebar")).toBeInTheDocument();
    expect(screen.queryByText(/credentials/i)).not.toBeInTheDocument();
  });

  it("pressing Meta+Slash opens shortcuts panel", () => {
    render(<App />);
    fireEvent.keyDown(document, { code: "Slash", metaKey: true });
    expect(screen.getByRole("complementary", { name: /keyboard shortcuts/i })).toBeInTheDocument();
  });

  it("pressing Meta+Slash opens shortcuts panel even when actionsRestricted is true", () => {
    render(<App />);
    // Actions register on mount, so we set restricted AFTER render
    useShortcutsStore.getState().setActionsRestricted(true);
    fireEvent.keyDown(document, { code: "Slash", metaKey: true });
    expect(screen.getByRole("complementary", { name: /keyboard shortcuts/i })).toBeInTheDocument();
  });

  it("Escape closes most recently opened overlay (LIFO)", () => {
    useWorkspaceStore.setState({ folderPath: "/some/path" });
    render(<App />);

    // Open settings via shortcut
    fireEvent.keyDown(document, { code: "Comma", metaKey: true });
    expect(useSettingsStore.getState().settingsOpen).toBe(true);

    // Open shortcuts panel
    fireEvent.keyDown(document, { code: "Slash", metaKey: true });
    expect(screen.getByRole("complementary", { name: /keyboard shortcuts/i })).toBeInTheDocument();

    // Escape closes shortcuts panel (most recent), settings stays open
    fireEvent.keyDown(document, { code: "Escape" });
    expect(screen.queryByRole("complementary", { name: /keyboard shortcuts/i })).not.toBeInTheDocument();
    expect(useSettingsStore.getState().settingsOpen).toBe(true);

    // Escape again closes settings
    fireEvent.keyDown(document, { code: "Escape" });
    expect(useSettingsStore.getState().settingsOpen).toBe(false);
  });
});

describe("FooterBar in App", () => {
  beforeEach(() => {
    vi.mocked(listen).mockResolvedValue(vi.fn());
    vi.mocked(invoke).mockResolvedValue({});
    useWorkspaceStore.setState({
      folderPath: null,
      isLoading: false,
      error: null,
      openFolder: vi.fn(),
      loadSavedFolder: vi.fn(),
    });
    useSettingsStore.setState({ settingsOpen: false, activeCategory: "ai" });
    useShortcutsStore.setState({ actions: {}, actionsRestricted: false });
  });

  it("renders FooterBar in the no-folder layout", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /hide sidebar/i })).toBeInTheDocument();
  });

  it("renders FooterBar in the loading layout", () => {
    useWorkspaceStore.setState({ isLoading: true, folderPath: null });
    render(<App />);
    expect(screen.getByRole("button", { name: /hide sidebar/i })).toBeInTheDocument();
  });

  it("renders FooterBar in the main layout", () => {
    useWorkspaceStore.setState({ folderPath: "/some/path" });
    render(<App />);
    expect(screen.getByRole("button", { name: /hide sidebar/i })).toBeInTheDocument();
  });

  it("hides sidebar when sidebar toggle is clicked", async () => {
    useWorkspaceStore.setState({ folderPath: "/some/path" });
    render(<App />);
    expect(document.querySelector("aside")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /hide sidebar/i }));
    expect(document.querySelector("aside")).not.toBeInTheDocument();
  });

  it("shows sidebar again when toggle is clicked a second time", async () => {
    useWorkspaceStore.setState({ folderPath: "/some/path" });
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: /hide sidebar/i }));
    await userEvent.click(screen.getByRole("button", { name: /show sidebar/i }));
    expect(document.querySelector("aside")).toBeInTheDocument();
  });
});
