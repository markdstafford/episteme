import { render, screen, fireEvent, within } from "@testing-library/react";
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
    const folderHeader = screen.getByTestId("folder-header");
    expect(
      within(folderHeader).getByRole("button", { name: /new document/i })
    ).toBeInTheDocument();
  });

  it("clicking New document opens the dialog", () => {
    render(<App />);

    expect(screen.queryByTestId("create-new-dialog")).not.toBeInTheDocument();

    const folderHeader = screen.getByTestId("folder-header");
    fireEvent.click(within(folderHeader).getByRole("button", { name: /new document/i }));

    expect(screen.getByTestId("create-new-dialog")).toBeInTheDocument();
  });

  it("selecting from the dialog opens the chat panel", () => {
    render(<App />);

    // Chat panel should not be visible initially
    expect(screen.queryByText("AI assistant")).not.toBeInTheDocument();

    const folderHeader = screen.getByTestId("folder-header");
    fireEvent.click(within(folderHeader).getByRole("button", { name: /new document/i }));
    fireEvent.click(screen.getByText("Select no skill"));

    // AiChatPanel header should now be visible
    expect(screen.getByText("AI assistant")).toBeInTheDocument();
  });

  it("selecting from the dialog calls startAuthoring and sets authoringMode", () => {
    render(<App />);

    const folderHeader = screen.getByTestId("folder-header");
    fireEvent.click(within(folderHeader).getByRole("button", { name: /new document/i }));
    fireEvent.click(screen.getByText("Select no skill"));

    expect(useAiChatStore.getState().authoringMode).toBe(true);
  });

  it("selecting from the dialog clears any previous messages", () => {
    useAiChatStore.setState({
      messages: [
        { role: "user", content: "previous message" },
        { role: "assistant", content: "previous reply" },
      ],
    });

    render(<App />);

    const folderHeader = screen.getByTestId("folder-header");
    fireEvent.click(within(folderHeader).getByRole("button", { name: /new document/i }));
    fireEvent.click(screen.getByText("Select no skill"));

    expect(useAiChatStore.getState().messages).toHaveLength(0);
  });

  it("selecting a skill sets activeSkill in the store", () => {
    render(<App />);

    const folderHeader = screen.getByTestId("folder-header");
    fireEvent.click(within(folderHeader).getByRole("button", { name: /new document/i }));
    fireEvent.click(screen.getByText("Select skill"));

    expect(useAiChatStore.getState().activeSkill).toBe("product-description");
  });

  it("closing the dialog without selecting does not open the chat panel", () => {
    render(<App />);

    // Chat panel should not be visible initially
    expect(screen.queryByText("AI assistant")).not.toBeInTheDocument();

    const folderHeader = screen.getByTestId("folder-header");
    fireEvent.click(within(folderHeader).getByRole("button", { name: /new document/i }));
    fireEvent.click(screen.getByText("Close dialog"));

    // Chat panel should still not be open
    expect(screen.queryByText("AI assistant")).not.toBeInTheDocument();
  });

  it("opening the dialog a second time resets authoring state again on select", () => {
    render(<App />);

    // First selection — simulates a session that has progressed
    const folderHeader = screen.getByTestId("folder-header");
    fireEvent.click(within(folderHeader).getByRole("button", { name: /new document/i }));
    fireEvent.click(screen.getByText("Select no skill"));
    useAiChatStore.setState({
      authoringFilePath: "/workspace/docs/draft.md",
      activeSkill: "product-description",
      messages: [{ role: "user", content: "write a doc" }],
    });

    // Second click then select — startAuthoring should clear messages and reset per-session fields
    fireEvent.click(within(screen.getByTestId("folder-header")).getByRole("button", { name: /new document/i }));
    fireEvent.click(screen.getByText("Select no skill"));

    const s = useAiChatStore.getState();
    expect(s.authoringMode).toBe(true);
    expect(s.messages).toHaveLength(0);
    expect(s.authoringFilePath).toBeNull();
    expect(s.activeSkill).toBeNull();
  });
});
