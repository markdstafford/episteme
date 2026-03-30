import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(null),
  Channel: function () {
    this.onmessage = null;
  },
}));

vi.mock("@/stores/threads", () => ({
  useThreadsStore: vi.fn((selector?: (s: any) => any) => {
    const state = {
      threads: [
        {
          id: "thread-abc",
          doc_id: "d1",
          quoted_text: "hello world",
          anchor_from: 0,
          anchor_to: 11,
          anchor_stale: false,
          status: "open",
          blocking: false,
          pinned: false,
          created_at: "2026-01-01",
          comments: [
            {
              id: "c1",
              thread_id: "thread-abc",
              body: "A comment",
              author: "alice",
              created_at: "2026-01-01",
            },
          ],
          events: [
            {
              id: "e1",
              thread_id: "thread-abc",
              event: "open",
              changed_by: "alice",
              changed_at: "2026-01-01",
            },
          ],
        },
      ],
      activeDocContent: "",
      togglePinned: vi.fn(),
      loadThreads: vi.fn(),
    };
    if (typeof selector === "function") return selector(state);
    return state;
  }),
}));

const fileTreeState = { selectedFilePath: "/docs/test.md" };
vi.mock("@/stores/fileTree", () => ({
  useFileTreeStore: Object.assign(
    vi.fn((selector?: (s: any) => any) => {
      if (typeof selector === "function") return selector(fileTreeState);
      return fileTreeState;
    }),
    { getState: () => fileTreeState }
  ),
}));

vi.mock("@/stores/workspace", () => ({
  useWorkspaceStore: vi.fn((selector?: (s: any) => any) => {
    const state = { folderPath: "/docs" };
    if (typeof selector === "function") return selector(state);
    return state;
  }),
}));

import { AiChatPanel } from "@/components/AiChatPanel";
import { useAiChatStore } from "@/stores/aiChat";

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
  useAiChatStore.setState({
    messages: [],
    isStreaming: false,
    streamingContent: "",
    isAuthenticated: true,
    authChecked: true,
    awsProfile: null,
    currentSession: null,
    sessions: [],
    error: null,
    checkAuth: vi.fn().mockResolvedValue(undefined) as unknown as () => Promise<void>,
    login: vi.fn() as unknown as () => Promise<void>,
    setAwsProfile: vi.fn() as unknown as (profile: string) => Promise<void>,
    clearAwsProfile: vi.fn() as unknown as () => Promise<void>,
    sendMessage: vi.fn() as unknown as (content: string) => Promise<void>,
    newSession: vi.fn() as unknown as () => void,
    resumeSession: vi.fn() as unknown as (id: string) => void,
  });
});

describe("AiChatPanel onThreadActivated", () => {
  it("calls onThreadActivated with the thread id when a thread is clicked in ThreadsView", async () => {
    const onThreadActivated = vi.fn();

    render(
      <AiChatPanel
        commentTrigger={{ type: "threads-filtered", filterIds: ["thread-abc"] }}
        onCommentTriggerConsumed={vi.fn()}
        onThreadActivated={onThreadActivated}
      />
    );

    // The commentTrigger effect fires after render; flush it
    await act(async () => {});

    // The ThreadsView should be visible — find and click the thread row
    const threadRow = screen.getByText(/"hello world"/);
    fireEvent.click(threadRow);

    expect(onThreadActivated).toHaveBeenCalledWith("thread-abc");
  });
});
