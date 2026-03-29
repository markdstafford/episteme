import { describe, it, expect, beforeEach, vi } from "vitest";
import { useThreadsStore } from "@/stores/threads";
import type { Thread, ThreadEvent, QueuedComment } from "@/types/comments";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
const mockInvoke = vi.mocked(invoke);

const mockThread: Thread = {
  id: "t1",
  doc_id: "doc1",
  quoted_text: "hello",
  anchor_from: 0,
  anchor_to: 5,
  anchor_stale: false,
  status: "open",
  blocking: false,
  pinned: false,
  created_at: "2026-01-01",
  comments: [],
  events: [],
};

const mockEvent: ThreadEvent = {
  id: "e1",
  thread_id: "t1",
  event: "resolved",
  changed_by: "alice",
  changed_at: "2026-01-01",
};

describe("useThreadsStore", () => {
  beforeEach(() => {
    useThreadsStore.setState({
      threads: [],
      loading: false,
      activeDocId: null,
      queuedComments: [],
    });
    vi.clearAllMocks();
  });

  it("starts with empty threads", () => {
    expect(useThreadsStore.getState().threads).toEqual([]);
  });

  it("loadThreads populates store", async () => {
    mockInvoke.mockResolvedValueOnce([mockThread]);
    await useThreadsStore.getState().loadThreads("doc1", "hello world");
    expect(useThreadsStore.getState().threads).toHaveLength(1);
    expect(useThreadsStore.getState().threads[0].id).toBe("t1");
  });

  it("loadThreads clears threads when doc changes", async () => {
    useThreadsStore.setState({ threads: [mockThread], activeDocId: "doc1" });
    mockInvoke.mockResolvedValueOnce([]);
    await useThreadsStore.getState().loadThreads("doc2", "");
    expect(useThreadsStore.getState().threads).toHaveLength(0);
    expect(useThreadsStore.getState().activeDocId).toBe("doc2");
  });

  it("clearThreads empties the store", () => {
    useThreadsStore.setState({ threads: [mockThread] });
    useThreadsStore.getState().clearThreads();
    expect(useThreadsStore.getState().threads).toEqual([]);
  });
});

describe("mutation actions", () => {
  beforeEach(() => {
    useThreadsStore.setState({
      threads: [{ ...mockThread, events: [] }],
      loading: false,
      activeDocId: "doc1",
      queuedComments: [],
    });
    vi.clearAllMocks();
  });

  it("resolveThread updates status and appends event", async () => {
    mockInvoke.mockResolvedValueOnce({ ...mockEvent, event: "resolved" });
    await useThreadsStore.getState().resolveThread("t1");
    const t = useThreadsStore.getState().threads[0];
    expect(t.status).toBe("resolved");
    expect(t.events).toHaveLength(1);
    expect(t.events[0].event).toBe("resolved");
  });

  it("reopenThread updates status and appends re-opened event", async () => {
    useThreadsStore.setState({
      threads: [{ ...mockThread, status: "resolved", events: [] }],
    });
    mockInvoke.mockResolvedValueOnce({ ...mockEvent, event: "re-opened" });
    await useThreadsStore.getState().reopenThread("t1");
    expect(useThreadsStore.getState().threads[0].status).toBe("open");
  });

  it("toggleBlocking flips blocking and appends event", async () => {
    mockInvoke.mockResolvedValueOnce({ ...mockEvent, event: "blocking" });
    await useThreadsStore.getState().toggleBlocking("t1");
    expect(useThreadsStore.getState().threads[0].blocking).toBe(true);
  });

  it("togglePinned flips pinned", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    await useThreadsStore.getState().togglePinned("t1");
    expect(useThreadsStore.getState().threads[0].pinned).toBe(true);
  });
});

describe("queued comment lifecycle", () => {
  beforeEach(() => {
    useThreadsStore.setState({
      threads: [],
      loading: false,
      activeDocId: "doc1",
      queuedComments: [],
    });
    vi.clearAllMocks();
  });

  const mockQ: QueuedComment = {
    id: "q1",
    thread_id: null,
    doc_id: "d1",
    quoted_text: "text",
    anchor_from: 0,
    anchor_to: 4,
    body_original: "raw",
    body_enhanced: null,
    use_body_enhanced: true,
    blocking: false,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30000).toISOString(),
  };

  it("stageComment persists and stores queued entry", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    await useThreadsStore.getState().stageComment(mockQ);
    expect(useThreadsStore.getState().queuedComments).toHaveLength(1);
    expect(mockInvoke).toHaveBeenCalledWith("queue_comment", { queued: mockQ });
  });

  it("cancelQueuedComment removes from store and calls command", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    useThreadsStore.setState({ queuedComments: [mockQ] });
    await useThreadsStore.getState().cancelQueuedComment("q1");
    expect(useThreadsStore.getState().queuedComments).toHaveLength(0);
    expect(mockInvoke).toHaveBeenCalledWith("cancel_queued_comment", {
      id: "q1",
    });
  });
});
