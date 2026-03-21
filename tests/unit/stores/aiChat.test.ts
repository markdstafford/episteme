import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAiChatStore } from "@/stores/aiChat";
import { useFileTreeStore } from "@/stores/fileTree";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue([]),
  Channel: vi.fn().mockImplementation(() => ({ onmessage: vi.fn() })),
}));

beforeEach(() => {
  useAiChatStore.setState({
    sessions: [],
    currentSession: null,
    messages: [],
    isStreaming: false,
    streamingContent: "",
    error: null,
  });
  useFileTreeStore.setState({ selectedFilePath: null });
});

describe("newSession action — scope derivation", () => {
  it("creates a workspace-scoped session when no file is selected", () => {
    useFileTreeStore.setState({ selectedFilePath: null });
    useAiChatStore.getState().newSession();
    const session = useAiChatStore.getState().currentSession;
    expect(session?.scope).toEqual({ type: "workspace" });
  });

  it("creates a document-scoped session when a file is selected", () => {
    useFileTreeStore.setState({ selectedFilePath: "/workspace/docs/spec.md" });
    useAiChatStore.getState().newSession();
    const session = useAiChatStore.getState().currentSession;
    expect(session?.scope).toEqual({ type: "document", path: "/workspace/docs/spec.md" });
  });

  it("creates a session with empty name", () => {
    useAiChatStore.getState().newSession();
    expect(useAiChatStore.getState().currentSession?.name).toBe("");
  });

  it("sets last_mode to 'view'", () => {
    useAiChatStore.getState().newSession();
    expect(useAiChatStore.getState().currentSession?.last_mode).toBe("view");
  });
});

describe("resumeSession", () => {
  const makeSession = (id: string, text: string) => ({
    id,
    created_at: "2026-01-15T14:00:00Z",
    last_active_at: "2026-01-15T14:00:00Z",
    last_mode: "view",
    name: text,
    scope: { type: "workspace" as const },
    pinned: false,
    messages_all: [
      {
        role: "user" as const,
        content: [{ type: "text" as const, text }],
        mode: null,
        model: null,
      },
      {
        role: "assistant" as const,
        content: [{ type: "text" as const, text: "response" }],
        mode: null,
        model: "claude-sonnet",
      },
    ],
    messages_compacted: [],
  });

  it("sets currentSession to the found session", () => {
    const session = makeSession("abc", "hello");
    useAiChatStore.setState({ sessions: [session] });
    useAiChatStore.getState().resumeSession("abc");
    expect(useAiChatStore.getState().currentSession?.id).toBe("abc");
  });

  it("reconstructs messages from messages_all", () => {
    const session = makeSession("abc", "hello");
    useAiChatStore.setState({ sessions: [session] });
    useAiChatStore.getState().resumeSession("abc");
    const messages = useAiChatStore.getState().messages;
    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual({ role: "user", content: "hello" });
    expect(messages[1]).toEqual({ role: "assistant", content: "response" });
  });

  it("clears streaming state and error on resume", () => {
    const session = makeSession("abc", "hello");
    useAiChatStore.setState({ sessions: [session], isStreaming: true, error: "old error" });
    useAiChatStore.getState().resumeSession("abc");
    expect(useAiChatStore.getState().isStreaming).toBe(false);
    expect(useAiChatStore.getState().error).toBeNull();
  });

  it("is a no-op when id is not found", () => {
    const session = makeSession("abc", "hello");
    useAiChatStore.setState({ sessions: [session], currentSession: session });
    useAiChatStore.getState().resumeSession("does-not-exist");
    expect(useAiChatStore.getState().currentSession?.id).toBe("abc");
  });
});
