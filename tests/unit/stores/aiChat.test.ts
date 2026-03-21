import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAiChatStore } from "@/stores/aiChat";
import { useFileTreeStore } from "@/stores/fileTree";
import type { Session } from "@/lib/session";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue([]),
  Channel: vi.fn().mockImplementation(function () {
    this.onmessage = vi.fn();
  }),
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

  it("clears authoringMode and authoringFilePath on resume", () => {
    const session = makeSession("abc", "hello");
    useAiChatStore.setState({
      sessions: [session],
      authoringMode: true,
      authoringFilePath: "/some/file.md",
    });
    useAiChatStore.getState().resumeSession("abc");
    expect(useAiChatStore.getState().authoringMode).toBe(false);
    expect(useAiChatStore.getState().authoringFilePath).toBeNull();
  });

  it("is a no-op when id is not found", () => {
    const session = makeSession("abc", "hello");
    useAiChatStore.setState({ sessions: [session], currentSession: session });
    useAiChatStore.getState().resumeSession("does-not-exist");
    expect(useAiChatStore.getState().currentSession?.id).toBe("abc");
  });
});

describe("saveCurrentSession — in-memory sync", () => {
  const makeSession = (id: string) => ({
    id,
    created_at: "2026-01-01T00:00:00Z",
    last_active_at: "2026-01-01T00:00:00Z",
    last_mode: "view",
    name: "Test",
    scope: { type: "workspace" as const },
    pinned: false,
    messages_all: [],
    messages_compacted: [],
  });

  beforeEach(async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue(undefined);
  });

  it("appends currentSession to sessions[] when it is new", async () => {
    const session = makeSession("new-1");
    useAiChatStore.setState({ currentSession: session, sessions: [] });
    await useAiChatStore.getState().saveCurrentSession();
    expect(useAiChatStore.getState().sessions).toHaveLength(1);
    expect(useAiChatStore.getState().sessions[0].id).toBe("new-1");
  });

  it("upserts currentSession in sessions[] when it already exists", async () => {
    const original = makeSession("existing-1");
    const updated = { ...original, name: "Updated name" };
    useAiChatStore.setState({ currentSession: updated, sessions: [original] });
    await useAiChatStore.getState().saveCurrentSession();
    const sessions = useAiChatStore.getState().sessions;
    expect(sessions).toHaveLength(1);
    expect(sessions[0].name).toBe("Updated name");
  });

  it("does not modify sessions[] when invoke fails", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockRejectedValueOnce(new Error("disk error"));
    const session = makeSession("fail-1");
    useAiChatStore.setState({ currentSession: session, sessions: [] });
    await useAiChatStore.getState().saveCurrentSession();
    expect(useAiChatStore.getState().sessions).toHaveLength(0);
  });
});

// Helper reused across new tests
function makeFullSession(id: string, overrides: Partial<Session> = {}): Session {
  return {
    id,
    created_at: "2026-01-01T00:00:00Z",
    last_active_at: "2026-01-01T00:00:00Z",
    last_mode: "view",
    name: "Test session",
    scope: { type: "workspace" as const },
    pinned: false,
    messages_all: [],
    messages_compacted: [],
    ...overrides,
  };
}

describe("renameSession", () => {
  beforeEach(async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue(undefined);
  });

  it("updates name on matching session in sessions[]", async () => {
    const session = makeFullSession("s1");
    useAiChatStore.setState({ sessions: [session], currentSession: null });
    await useAiChatStore.getState().renameSession("s1", "New Name");
    expect(useAiChatStore.getState().sessions[0].name).toBe("New Name");
  });

  it("also updates currentSession.name when id matches", async () => {
    const session = makeFullSession("s1");
    useAiChatStore.setState({ sessions: [session], currentSession: session });
    await useAiChatStore.getState().renameSession("s1", "New Name");
    expect(useAiChatStore.getState().currentSession?.name).toBe("New Name");
  });

  it("calls save_session with the updated session", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const session = makeFullSession("s1");
    useAiChatStore.setState({ sessions: [session], currentSession: null });
    await useAiChatStore.getState().renameSession("s1", "New Name");
    expect(invoke).toHaveBeenCalledWith("save_session", expect.objectContaining({
      session: expect.objectContaining({ id: "s1", name: "New Name" }),
    }));
  });

  it("is a no-op when id not found", async () => {
    const session = makeFullSession("s1");
    useAiChatStore.setState({ sessions: [session] });
    await useAiChatStore.getState().renameSession("does-not-exist", "X");
    expect(useAiChatStore.getState().sessions[0].name).toBe("Test session");
  });
});

describe("pinSession", () => {
  beforeEach(async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue(undefined);
  });

  it("updates pinned state in sessions[]", async () => {
    const session = makeFullSession("s1", { pinned: false });
    useAiChatStore.setState({ sessions: [session] });
    await useAiChatStore.getState().pinSession("s1", true);
    expect(useAiChatStore.getState().sessions[0].pinned).toBe(true);
  });

  it("calls pin_session Tauri command", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const session = makeFullSession("s1");
    useAiChatStore.setState({ sessions: [session] });
    await useAiChatStore.getState().pinSession("s1", true);
    expect(invoke).toHaveBeenCalledWith("pin_session", { id: "s1", pinned: true });
  });

  it("updates pinned to false when unpinning", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue(undefined);
    const session = makeFullSession("s1", { pinned: true });
    useAiChatStore.setState({ sessions: [session] });
    await useAiChatStore.getState().pinSession("s1", false);
    expect(useAiChatStore.getState().sessions[0].pinned).toBe(false);
    expect(invoke).toHaveBeenCalledWith("pin_session", { id: "s1", pinned: false });
  });
});

describe("deleteSession", () => {
  beforeEach(async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue(undefined);
  });

  it("removes session from sessions[]", async () => {
    const s1 = makeFullSession("s1");
    const s2 = makeFullSession("s2");
    useAiChatStore.setState({ sessions: [s1, s2], currentSession: s2 });
    await useAiChatStore.getState().deleteSession("s1");
    expect(useAiChatStore.getState().sessions.map(s => s.id)).toEqual(["s2"]);
  });

  it("calls delete_session Tauri command", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const s1 = makeFullSession("s1");
    useAiChatStore.setState({ sessions: [s1], currentSession: null });
    await useAiChatStore.getState().deleteSession("s1");
    expect(invoke).toHaveBeenCalledWith("delete_session", { id: "s1" });
  });

  it("calls newSession when deleting the active session", async () => {
    const s1 = makeFullSession("s1");
    useAiChatStore.setState({ sessions: [s1], currentSession: s1 });
    await useAiChatStore.getState().deleteSession("s1");
    // A new session is created — it will have a different id
    expect(useAiChatStore.getState().currentSession?.id).not.toBe("s1");
    expect(useAiChatStore.getState().currentSession).not.toBeNull();
  });
});

describe("suggestSessionName", () => {
  it("throws when session id is not found", async () => {
    useAiChatStore.setState({ sessions: [] });
    await expect(useAiChatStore.getState().suggestSessionName("missing")).rejects.toThrow("Session not found");
  });

  it("returns string from Tauri command", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue("Product spec review");
    const session = makeFullSession("s1", {
      messages_compacted: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
    });
    useAiChatStore.setState({ sessions: [session], awsProfile: "my-profile" });
    const name = await useAiChatStore.getState().suggestSessionName("s1");
    expect(name).toBe("Product spec review");
    expect(invoke).toHaveBeenCalledWith("ai_suggest_session_name", {
      messages: session.messages_compacted,
      awsProfile: "my-profile",
    });
  });
});

describe("sendMessage — session name auto-population", () => {
  beforeEach(async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue(undefined);
    useAiChatStore.setState({
      currentSession: {
        id: "sess-1",
        created_at: "2026-01-01T00:00:00Z",
        last_active_at: "2026-01-01T00:00:00Z",
        last_mode: "view",
        name: "",
        scope: { type: "workspace" },
        pinned: false,
        messages_all: [],
        messages_compacted: [],
      },
      sessions: [],
      messages: [],
      isStreaming: false,
      streamingContent: "",
      error: null,
      isAuthenticated: true,
      authChecked: true,
      awsProfile: "test-profile",
    });
  });

  it("sets name from first message content", async () => {
    await useAiChatStore.getState().sendMessage("Hello world");
    expect(useAiChatStore.getState().currentSession?.name).toBe("Hello world");
  });

  it("truncates name at 60 chars with ellipsis", async () => {
    const longMessage = "a".repeat(70);
    await useAiChatStore.getState().sendMessage(longMessage);
    const name = useAiChatStore.getState().currentSession?.name;
    expect(name).toBe("a".repeat(60) + "…");
  });

  it("does not overwrite name if already set", async () => {
    useAiChatStore.setState({
      currentSession: {
        ...useAiChatStore.getState().currentSession!,
        name: "Existing name",
      },
    });
    await useAiChatStore.getState().sendMessage("New message");
    expect(useAiChatStore.getState().currentSession?.name).toBe("Existing name");
  });
});
