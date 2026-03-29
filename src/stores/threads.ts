import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { Thread, Comment, ThreadEvent, QueuedComment } from "@/types/comments";

interface ThreadsStore {
  threads: Thread[];
  loading: boolean;
  activeDocId: string | null;
  activeDocContent: string;
  queuedComments: QueuedComment[];

  loadThreads: (docId: string, docContent: string) => Promise<void>;
  clearThreads: () => void;
  setActiveDocContent: (content: string) => void;

  resolveThread: (threadId: string) => Promise<void>;
  reopenThread: (threadId: string) => Promise<void>;
  toggleBlocking: (threadId: string) => Promise<void>;
  togglePinned: (threadId: string) => Promise<void>;

  stageComment: (q: QueuedComment) => Promise<void>;
  commitComment: (queuedId: string, docFilePath?: string) => Promise<Thread | Comment>;
  cancelQueuedComment: (id: string) => Promise<void>;
  updateQueuedBody: (id: string, bodyEnhanced: string) => Promise<void>;
  updateQueuedBlocking: (id: string, blocking: boolean) => Promise<void>;
  toggleQueuedBody: (id: string) => Promise<void>;
  initQueuedOnLaunch: () => Promise<void>;
}

export const useThreadsStore = create<ThreadsStore>((set, get) => ({
  threads: [],
  loading: false,
  activeDocId: null,
  activeDocContent: "",
  queuedComments: [],

  async loadThreads(docId, docContent) {
    set({ loading: true, activeDocId: docId, activeDocContent: docContent, threads: [] });
    try {
      const threads = await invoke<Thread[]>("load_threads", {
        docId,
        docContent,
      });
      set({ threads, loading: false });
    } catch (e) {
      console.error("loadThreads failed:", e);
      set({ loading: false });
    }
  },

  clearThreads() {
    set({ threads: [], activeDocId: null });
  },

  setActiveDocContent(content) {
    set({ activeDocContent: content });
  },

  async resolveThread(threadId) {
    const ev = await invoke<ThreadEvent>("update_thread_status", {
      threadId,
      status: "resolved",
    });
    set((s) => ({
      threads: s.threads.map((t) =>
        t.id === threadId
          ? { ...t, status: "resolved" as const, events: [...t.events, ev] }
          : t,
      ),
    }));
  },

  async reopenThread(threadId) {
    const ev = await invoke<ThreadEvent>("update_thread_status", {
      threadId,
      status: "open",
    });
    set((s) => ({
      threads: s.threads.map((t) =>
        t.id === threadId
          ? { ...t, status: "open" as const, events: [...t.events, ev] }
          : t,
      ),
    }));
  },

  async toggleBlocking(threadId) {
    const ev = await invoke<ThreadEvent>("toggle_blocking", { threadId });
    set((s) => ({
      threads: s.threads.map((t) =>
        t.id === threadId
          ? {
              ...t,
              blocking: ev.event === "blocking",
              events: [...t.events, ev],
            }
          : t,
      ),
    }));
  },

  async togglePinned(threadId) {
    await invoke("toggle_pinned", { threadId });
    set((s) => ({
      threads: s.threads.map((t) =>
        t.id === threadId ? { ...t, pinned: !t.pinned } : t,
      ),
    }));
  },

  async stageComment(q) {
    await invoke("queue_comment", { queued: q });
    set((s) => ({ queuedComments: [...s.queuedComments, q] }));
  },

  async commitComment(queuedId, docFilePath) {
    const result = await invoke<{ type: string } & Record<string, unknown>>(
      "commit_comment",
      { id: queuedId, docFilePath: docFilePath ?? null },
    );
    set((s) => {
      const withoutQueued = s.queuedComments.filter((q) => q.id !== queuedId);
      if (result.type === "thread") {
        return {
          queuedComments: withoutQueued,
          threads: [...s.threads, result as unknown as Thread],
        };
      } else {
        const c = result as unknown as Comment;
        return {
          queuedComments: withoutQueued,
          threads: s.threads.map((t) =>
            t.id === c.thread_id
              ? { ...t, comments: [...t.comments, c] }
              : t,
          ),
        };
      }
    });
    return result as unknown as Thread | Comment;
  },

  async cancelQueuedComment(id) {
    await invoke("cancel_queued_comment", { id });
    set((s) => ({
      queuedComments: s.queuedComments.filter((q) => q.id !== id),
    }));
  },

  async updateQueuedBlocking(id, blocking) {
    const q = get().queuedComments.find((q) => q.id === id);
    if (!q) return;
    const updated = { ...q, blocking };
    await invoke("queue_comment", { queued: updated });
    set((s) => ({
      queuedComments: s.queuedComments.map((q) =>
        q.id === id ? updated : q,
      ),
    }));
  },

  async updateQueuedBody(id, bodyEnhanced) {
    const q = get().queuedComments.find((q) => q.id === id);
    if (!q) return;
    const updated = { ...q, body_enhanced: bodyEnhanced };
    await invoke("queue_comment", { queued: updated });
    set((s) => ({
      queuedComments: s.queuedComments.map((q) =>
        q.id === id ? updated : q,
      ),
    }));
  },

  async toggleQueuedBody(id) {
    await invoke("toggle_queued_body", { id });
    set((s) => ({
      queuedComments: s.queuedComments.map((q) =>
        q.id === id ? { ...q, use_body_enhanced: !q.use_body_enhanced } : q,
      ),
    }));
  },

  async initQueuedOnLaunch() {
    try {
      const all = await invoke<QueuedComment[]>("load_queued_comments");
      const now = new Date();
      for (const q of all) {
        if (new Date(q.expires_at) <= now) {
          get().commitComment(q.id).catch(() => {});
        } else {
          set((s) => ({ queuedComments: [...s.queuedComments, q] }));
          const remaining = new Date(q.expires_at).getTime() - now.getTime();
          setTimeout(() => {
            get().commitComment(q.id).catch(() => {});
          }, remaining);
        }
      }
    } catch (e) {
      console.error("initQueuedOnLaunch failed:", e);
    }
  },
}));
