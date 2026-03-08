import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "@/App";
import { useWorkspaceStore } from "@/stores/workspace";
import { useAiChatStore } from "@/stores/aiChat";
import { listen } from "@tauri-apps/api/event";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
  Channel: function () {
    this.onmessage = null;
  },
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

    useAiChatStore.setState({
      messages: [],
      isStreaming: false,
      streamingContent: "",
      error: null,
      authoringMode: false,
      authoringFilePath: null,
      activeSkill: null,
      documentReloadCounter: 0,
      isAuthenticated: false,
      authChecked: true,
      awsProfile: null,
      checkAuth: vi.fn() as unknown as () => Promise<void>,
    });
  });

  it("New document button is visible when a folder is open", () => {
    render(<App />);
    expect(
      screen.getByRole("button", { name: /new document/i })
    ).toBeInTheDocument();
  });

  it("clicking New document opens the chat panel", () => {
    render(<App />);

    // Chat panel should not be visible initially
    expect(screen.queryByText("AI assistant")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /new document/i }));

    // AiChatPanel header should now be visible
    expect(screen.getByText("AI assistant")).toBeInTheDocument();
  });

  it("clicking New document calls startAuthoring and sets authoringMode", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /new document/i }));

    expect(useAiChatStore.getState().authoringMode).toBe(true);
  });

  it("clicking New document clears any previous messages", () => {
    useAiChatStore.setState({
      messages: [
        { role: "user", content: "previous message" },
        { role: "assistant", content: "previous reply" },
      ],
    });

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /new document/i }));

    expect(useAiChatStore.getState().messages).toHaveLength(0);
  });

  it("clicking New document a second time resets authoring state again", () => {
    render(<App />);

    // First click — simulates a session that has progressed
    fireEvent.click(screen.getByRole("button", { name: /new document/i }));
    useAiChatStore.setState({
      authoringFilePath: "/workspace/docs/draft.md",
      activeSkill: "product-description",
      messages: [{ role: "user", content: "write a doc" }],
    });

    // Second click — startAuthoring should clear messages and reset per-session fields
    fireEvent.click(screen.getByRole("button", { name: /new document/i }));

    const s = useAiChatStore.getState();
    expect(s.authoringMode).toBe(true);
    expect(s.messages).toHaveLength(0);
    expect(s.authoringFilePath).toBeNull();
    expect(s.activeSkill).toBeNull();
  });
});
