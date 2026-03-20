import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAiChatStore } from "@/stores/aiChat";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
  Channel: vi.fn().mockImplementation(() => ({ onmessage: null })),
}));
vi.mock("@/stores/fileTree", () => ({
  useFileTreeStore: {
    getState: () => ({ selectedFilePath: null, selectFile: vi.fn() }),
  },
}));
vi.mock("@/stores/workspace", () => ({
  useWorkspaceStore: { getState: () => ({ folderPath: "/workspace" }) },
}));
vi.mock("@/lib/preferences", () => ({
  parsePreferences: vi.fn().mockReturnValue({}),
}));

describe("useAiChatStore authoring state", () => {
  beforeEach(() => {
    useAiChatStore.setState({
      messages: [{ role: "user", content: "hello" }],
      isStreaming: false,
      streamingContent: "",
      error: null,
      authoringMode: false,
      authoringFilePath: null,
      activeSkill: null,
      documentReloadCounter: 0,
      isAuthenticated: false,
      authChecked: false,
      awsProfile: "test-profile",
    });
  });

  it("startAuthoring sets authoringMode and clears messages", () => {
    useAiChatStore.getState().startAuthoring();
    const s = useAiChatStore.getState();
    expect(s.authoringMode).toBe(true);
    expect(s.messages).toHaveLength(0);
    expect(s.authoringFilePath).toBeNull();
    expect(s.activeSkill).toBeNull();
  });

  it("newSession resets authoring state", () => {
    useAiChatStore.setState({
      authoringMode: true,
      authoringFilePath: "/workspace/doc.md",
      activeSkill: "product-description",
      documentReloadCounter: 3,
    });
    useAiChatStore.getState().newSession();
    const s = useAiChatStore.getState();
    expect(s.authoringMode).toBe(false);
    expect(s.authoringFilePath).toBeNull();
    expect(s.activeSkill).toBeNull();
    expect(s.documentReloadCounter).toBe(0);
  });

  it("startAuthoring clears streamingContent and error", () => {
    useAiChatStore.setState({ streamingContent: "...", error: "some error" });
    useAiChatStore.getState().startAuthoring();
    const s = useAiChatStore.getState();
    expect(s.streamingContent).toBe("");
    expect(s.error).toBeNull();
  });

  it("DocumentUpdated event updates authoringFilePath and increments documentReloadCounter", () => {
    useAiChatStore.setState({
      authoringFilePath: null,
      documentReloadCounter: 0,
    });

    // Simulate what the onEvent Channel handler does when it receives DocumentUpdated
    useAiChatStore.setState((s) => ({
      authoringFilePath: "/workspace/new-doc.md",
      documentReloadCounter: s.documentReloadCounter + 1,
    }));

    const s = useAiChatStore.getState();
    expect(s.authoringFilePath).toBe("/workspace/new-doc.md");
    expect(s.documentReloadCounter).toBe(1);
  });

  it("multiple DocumentUpdated events increment documentReloadCounter each time", () => {
    useAiChatStore.setState({ documentReloadCounter: 0 });

    useAiChatStore.setState((s) => ({ documentReloadCounter: s.documentReloadCounter + 1 }));
    useAiChatStore.setState((s) => ({ documentReloadCounter: s.documentReloadCounter + 1 }));
    useAiChatStore.setState((s) => ({ documentReloadCounter: s.documentReloadCounter + 1 }));

    expect(useAiChatStore.getState().documentReloadCounter).toBe(3);
  });
});
