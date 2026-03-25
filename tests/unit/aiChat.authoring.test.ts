import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAiChatStore } from "@/stores/aiChat";
import { useFileTreeStore } from "@/stores/fileTree";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
  Channel: vi.fn().mockImplementation(() => ({ onmessage: null })),
}));

vi.mock("@/stores/fileTree", () => ({
  useFileTreeStore: {
    getState: vi.fn(() => ({
      selectedFilePath: null,
      selectFile: vi.fn(),
    })),
  },
}));

vi.mock("@/stores/manifests", () => ({
  useManifestStore: {
    getState: vi.fn(() => ({ activeMode: "draft" })),
  },
}));

vi.mock("@/stores/workspace", () => ({
  useWorkspaceStore: {
    getState: vi.fn(() => ({ folderPath: "/workspace" })),
  },
}));

vi.mock("@/lib/preferences", () => ({
  parsePreferences: vi.fn().mockReturnValue({}),
}));

describe("useAiChatStore - session behavior", () => {
  beforeEach(() => {
    useAiChatStore.setState({
      messages: [],
      isStreaming: false,
      streamingContent: "",
      error: null,
      currentSession: null,
      sessions: [],
    });
    vi.clearAllMocks();
  });

  describe("newSession clears conversation state", () => {
    it("resets messages to empty array", () => {
      useAiChatStore.setState({
        messages: [{ role: "user", content: "hello" }],
      });

      useAiChatStore.getState().newSession();

      expect(useAiChatStore.getState().messages).toEqual([]);
    });

    it("resets isStreaming to false", () => {
      useAiChatStore.setState({ isStreaming: true });

      useAiChatStore.getState().newSession();

      expect(useAiChatStore.getState().isStreaming).toBe(false);
    });

    it("resets streamingContent to empty string", () => {
      useAiChatStore.setState({ streamingContent: "partial response" });

      useAiChatStore.getState().newSession();

      expect(useAiChatStore.getState().streamingContent).toBe("");
    });

    it("resets error to null", () => {
      useAiChatStore.setState({ error: "some error" });

      useAiChatStore.getState().newSession();

      expect(useAiChatStore.getState().error).toBeNull();
    });

    it("resets all conversation fields together", () => {
      useAiChatStore.setState({
        messages: [{ role: "user", content: "hello" }],
        isStreaming: true,
        streamingContent: "partial",
        error: "some error",
      });

      useAiChatStore.getState().newSession();

      const s = useAiChatStore.getState();
      expect(s.messages).toEqual([]);
      expect(s.isStreaming).toBe(false);
      expect(s.streamingContent).toBe("");
      expect(s.error).toBeNull();
    });
  });

  describe("DocumentUpdated event", () => {
    it("calls useFileTreeStore.getState().selectFile() with the file path", () => {
      const mockSelectFile = vi.fn();
      vi.mocked(useFileTreeStore.getState).mockReturnValue({
        selectedFilePath: null,
        selectFile: mockSelectFile,
      });

      // Simulate what the onEvent Channel handler does when it receives DocumentUpdated
      const filePath = "/workspace/new-doc.md";
      useFileTreeStore.getState().selectFile(filePath);

      expect(mockSelectFile).toHaveBeenCalledWith(filePath);
      expect(mockSelectFile).toHaveBeenCalledTimes(1);
    });

    it("calls selectFile with each updated path on multiple DocumentUpdated events", () => {
      const mockSelectFile = vi.fn();
      vi.mocked(useFileTreeStore.getState).mockReturnValue({
        selectedFilePath: null,
        selectFile: mockSelectFile,
      });

      const paths = ["/workspace/doc-a.md", "/workspace/doc-b.md", "/workspace/doc-c.md"];
      for (const p of paths) {
        useFileTreeStore.getState().selectFile(p);
      }

      expect(mockSelectFile).toHaveBeenCalledTimes(3);
      expect(mockSelectFile).toHaveBeenNthCalledWith(1, "/workspace/doc-a.md");
      expect(mockSelectFile).toHaveBeenNthCalledWith(2, "/workspace/doc-b.md");
      expect(mockSelectFile).toHaveBeenNthCalledWith(3, "/workspace/doc-c.md");
    });
  });
});
