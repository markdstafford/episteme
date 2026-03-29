import { useState, useEffect } from "react";
import { useAiChatStore } from "@/stores/aiChat";
import { useFileTreeStore } from "@/stores/fileTree";
import { useWorkspaceStore } from "@/stores/workspace";
import { useThreadsStore } from "@/stores/threads";
import { invoke } from "@tauri-apps/api/core";
import { parsePreferences } from "@/lib/preferences";
import { ConfigurationView } from "@/components/ConfigurationView";
import { ChatView } from "@/components/ChatView";
import { SessionHistoryView } from "@/components/SessionHistoryView";
import { CreateThreadView } from "@/components/CreateThreadView";
import { ThreadView } from "@/components/ThreadView";
import { ThreadsView } from "@/components/ThreadsView";
import type { SessionScope } from "@/lib/session";
import type { CommentTriggerAnchor } from "@/components/MarkdownRenderer";

// ── Comment view state ────────────────────────────────────────────────────────

type CommentView =
  | { type: "create-thread"; anchor: CommentTriggerAnchor }
  | { type: "thread"; threadId: string; fromList: boolean }
  | { type: "threads" }
  | { type: "threads-filtered"; filterIds: string[] };

export interface AiChatPanelCommentTrigger {
  type: "create-thread" | "thread" | "threads-filtered";
  anchor?: CommentTriggerAnchor;
  threadId?: string;
  filterIds?: string[];
}

interface AiChatPanelProps {
  commentTrigger?: AiChatPanelCommentTrigger | null;
  onCommentTriggerConsumed?: () => void;
  onOpenThreadsView?: (open: () => void) => void;
}

export function AiChatPanel({
  commentTrigger,
  onCommentTriggerConsumed,
  onOpenThreadsView,
}: AiChatPanelProps) {
  const [view, setView] = useState<"chat" | "history">("chat");
  const [commentView, setCommentView] = useState<CommentView | null>(null);

  const {
    authChecked,
    isAuthenticated,
    currentSession,
    sessions,
    resumeSession,
    newSession,
    checkAuth,
    renameSession,
    pinSession,
    deleteSession,
    suggestSessionName,
    awsProfile,
  } = useAiChatStore();

  const selectedFilePath = useFileTreeStore((s) => s.selectedFilePath);
  const workspacePath = useWorkspaceStore((s) => s.folderPath) ?? "";
  const [githubLogin, setGithubLogin] = useState<string>("unknown");

  // Load github_login from preferences for comment authorship identity
  useEffect(() => {
    Promise.resolve(invoke("load_preferences"))
      .then((raw) => {
        if (raw == null) return;
        const prefs = parsePreferences(raw);
        if (prefs.github_login) setGithubLogin(prefs.github_login);
      })
      .catch(() => {});
  }, []);
  const threads = useThreadsStore((s) => s.threads);
  const activeDocContent = useThreadsStore((s) => s.activeDocContent);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Expose openThreadsView callback to parent (for footer button)
  useEffect(() => {
    onOpenThreadsView?.(() => setCommentView({ type: "threads" }));
  }, [onOpenThreadsView]);

  // Handle incoming comment triggers from parent (e.g. from decoration clicks)
  useEffect(() => {
    if (!commentTrigger) return;
    if (commentTrigger.type === "create-thread" && commentTrigger.anchor) {
      setCommentView({ type: "create-thread", anchor: commentTrigger.anchor });
    } else if (commentTrigger.type === "thread" && commentTrigger.threadId) {
      setCommentView({
        type: "thread",
        threadId: commentTrigger.threadId,
        fromList: false,
      });
    } else if (commentTrigger.type === "threads-filtered" && commentTrigger.filterIds) {
      setCommentView({
        type: "threads-filtered",
        filterIds: commentTrigger.filterIds,
      });
    }
    onCommentTriggerConsumed?.();
  }, [commentTrigger, onCommentTriggerConsumed]);

  const closeToChat = () => setCommentView(null);

  const isConfigurationView = !authChecked || !isAuthenticated;
  if (isConfigurationView) {
    return <ConfigurationView />;
  }

  // ── Comment views override standard chat/history ──────────────────────────

  if (commentView) {
    if (commentView.type === "create-thread") {
      return (
        <CreateThreadView
          anchor={commentView.anchor}
          onClose={closeToChat}
          onThreadCreated={(thread) => {
            setCommentView({ type: "thread", threadId: thread.id, fromList: false });
          }}
          awsProfile={awsProfile ?? ""}
          workspacePath={workspacePath}
          docContent={activeDocContent}
          docFilePath={selectedFilePath ?? undefined}
        />
      );
    }

    if (commentView.type === "thread") {
      const thread = threads.find((t) => t.id === commentView.threadId);
      if (thread) {
        const sorted = [...threads].sort((a, b) => a.anchor_from - b.anchor_from);
        const idx = sorted.findIndex((t) => t.id === thread.id);
        return (
          <ThreadView
            thread={thread}
            currentUser={githubLogin}
            docAuthor={githubLogin}
            onBack={
              commentView.fromList
                ? () => setCommentView({ type: "threads" })
                : closeToChat
            }
            onClose={closeToChat}
            onNavigatePrev={
              idx > 0
                ? () =>
                    setCommentView({
                      type: "thread",
                      threadId: sorted[idx - 1].id,
                      fromList: commentView.fromList,
                    })
                : undefined
            }
            onNavigateNext={
              idx < sorted.length - 1
                ? () =>
                    setCommentView({
                      type: "thread",
                      threadId: sorted[idx + 1].id,
                      fromList: commentView.fromList,
                    })
                : undefined
            }
            awsProfile={awsProfile ?? ""}
            docContent={activeDocContent}
            docFilePath={selectedFilePath ?? undefined}
          />
        );
      }
      // Thread not found — fall through to chat
      closeToChat();
    }

    if (
      commentView.type === "threads" ||
      commentView.type === "threads-filtered"
    ) {
      return (
        <ThreadsView
          onClose={closeToChat}
          onThreadClick={(id) =>
            setCommentView({ type: "thread", threadId: id, fromList: true })
          }
          filterThreadIds={
            commentView.type === "threads-filtered"
              ? commentView.filterIds
              : undefined
          }
        />
      );
    }
  }

  // ── Standard chat/history views ───────────────────────────────────────────

  if (view === "history") {
    const currentScope: SessionScope = selectedFilePath
      ? { type: "document", path: selectedFilePath }
      : { type: "workspace" };
    return (
      <SessionHistoryView
        sessions={sessions}
        currentSessionId={currentSession?.id ?? null}
        currentScope={currentScope}
        onResume={(id) => {
          resumeSession(id);
          setView("chat");
        }}
        onNewSession={() => {
          newSession();
          setView("chat");
        }}
        onBack={() => setView("chat")}
        onPin={(id, pinned) => pinSession(id, pinned)}
        onRename={(id, name) => renameSession(id, name)}
        onSuggestName={(id) => suggestSessionName(id)}
        onDelete={(id) => {
          const isActive = currentSession?.id === id;
          deleteSession(id);
          if (isActive) setView("chat");
        }}
      />
    );
  }

  return (
    <ChatView
      onShowHistory={() => setView("history")}
      onNewSession={() => {
        newSession();
        setView("chat");
      }}
    />
  );
}

// Export for FooterBar: threads view active state
export function useThreadsViewActive(): boolean {
  // This can't easily be a hook since the state is local to AiChatPanel.
  // FooterBar should track this via a callback — see App.tsx integration.
  return false;
}
