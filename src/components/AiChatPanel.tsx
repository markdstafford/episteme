import { useState, useEffect, useCallback } from "react";
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
  | { type: "thread"; threadId: string; fromList: boolean; filterIds?: string[] }
  | { type: "threads" }
  | { type: "threads-filtered"; filterIds: string[] };

export interface AiChatPanelCommentTrigger {
  type: "create-thread" | "thread" | "threads" | "threads-filtered" | "close";
  anchor?: CommentTriggerAnchor;
  threadId?: string;
  filterIds?: string[];
}

interface AiChatPanelProps {
  commentTrigger?: AiChatPanelCommentTrigger | null;
  onCommentTriggerConsumed?: () => void;
  onThreadActivated?: (threadId: string) => void;
  onCommentViewChange?: (type: CommentView["type"] | null) => void;
}

export function AiChatPanel({
  commentTrigger,
  onCommentTriggerConsumed,
  onThreadActivated,
  onCommentViewChange,
}: AiChatPanelProps) {
  const [view, setView] = useState<"chat" | "history">("chat");
  const [commentView, setCommentViewRaw] = useState<CommentView | null>(null);
  const [lastThreadId, setLastThreadId] = useState<string | null>(null);

  const handleSetCommentView = useCallback((cv: CommentView | null) => {
    setCommentViewRaw(cv);
    onCommentViewChange?.(cv?.type ?? null);
  }, [onCommentViewChange]);

  // Alias for readability inside this component
  const setCommentView = handleSetCommentView;

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
  const [deflectInstruction, setDeflectInstruction] = useState<string | undefined>(undefined);
  const [redirectInstruction, setRedirectInstruction] = useState<string | undefined>(undefined);

  // Load user identity and custom vetting instructions from preferences
  useEffect(() => {
    Promise.resolve(invoke("load_preferences"))
      .then((raw) => {
        if (raw == null) return;
        const prefs = parsePreferences(raw);
        if (prefs.github_login) setGithubLogin(prefs.github_login);
        // Empty string means "use the default"; only override when non-empty
        if (prefs.comment_deflect_instruction) setDeflectInstruction(prefs.comment_deflect_instruction);
        if (prefs.comment_redirect_instruction) setRedirectInstruction(prefs.comment_redirect_instruction);
      })
      .catch(() => {});
  }, []);
  const threads = useThreadsStore((s) => s.threads);
  const activeDocContent = useThreadsStore((s) => s.activeDocContent);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

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
    } else if (commentTrigger.type === "threads") {
      setCommentView({ type: "threads" });
    } else if (commentTrigger.type === "threads-filtered" && commentTrigger.filterIds) {
      setCommentView({
        type: "threads-filtered",
        filterIds: commentTrigger.filterIds,
      });
    } else if (commentTrigger.type === "close") {
      handleSetCommentView(null);
    }
    onCommentTriggerConsumed?.();
  }, [commentTrigger, onCommentTriggerConsumed]);

  const closeToChat = () => setCommentView(null);

  // Re-run auth check, which will set isAuthenticated=false if token expired,
  // causing the next render to show ConfigurationView.
  const handleAuthError = () => {
    checkAuth();
    setCommentView(null);
  };

  const isConfigurationView = !authChecked || !isAuthenticated;
  if (isConfigurationView) {
    return <ConfigurationView />;
  }

  // ── Panel container — all views share this wrapper for consistent width ───

  const panelClass =
    "w-[var(--width-ai-panel)] flex flex-col h-full border-l border-(--color-border-subtle) bg-(--color-bg-base)";

  // ── Comment views override standard chat/history ──────────────────────────

  if (commentView) {
    if (commentView.type === "create-thread") {
      return (
        <div className={panelClass}>
          <CreateThreadView
            anchor={commentView.anchor}
            onClose={closeToChat}
            onAuthError={handleAuthError}
            onThreadCreated={(thread) => {
              setCommentView({ type: "thread", threadId: thread.id, fromList: false });
            }}
            awsProfile={awsProfile ?? ""}
            workspacePath={workspacePath}
            docContent={activeDocContent}
            docFilePath={selectedFilePath ?? undefined}
            deflectInstruction={deflectInstruction}
            redirectInstruction={redirectInstruction}
          />
        </div>
      );
    }

    if (commentView.type === "thread") {
      const thread = threads.find((t) => t.id === commentView.threadId);
      if (thread) {
        const allSorted = [...threads].sort((a, b) => a.anchor_from - b.anchor_from);
        // If this thread was opened from a filtered view, restrict prev/next to that set
        const sorted = commentView.filterIds
          ? allSorted.filter((t) => commentView.filterIds!.includes(t.id))
          : allSorted;
        const idx = sorted.findIndex((t) => t.id === thread.id);
        return (
          <div className={panelClass}>
            <ThreadView
              mode="reply"
              thread={thread}
              currentUser={githubLogin}
              docAuthor={githubLogin}
              onBack={
                commentView.fromList
                  ? () => setCommentView(
                      commentView.filterIds
                        ? { type: "threads-filtered", filterIds: commentView.filterIds }
                        : { type: "threads" }
                    )
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
                        filterIds: commentView.filterIds,
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
                        filterIds: commentView.filterIds,
                      })
                  : undefined
              }
              awsProfile={awsProfile ?? ""}
              docContent={activeDocContent}
              docFilePath={selectedFilePath ?? undefined}
            />
          </div>
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
        <div className={panelClass}>
          <ThreadsView
            onClose={closeToChat}
            onThreadClick={(id) => {
              onThreadActivated?.(id);
              setLastThreadId(id);
              setCommentView({
                type: "thread",
                threadId: id,
                fromList: true,
                filterIds: commentView.type === "threads-filtered" ? commentView.filterIds : undefined,
              });
            }}
            filterThreadIds={
              commentView.type === "threads-filtered"
                ? commentView.filterIds
                : undefined
            }
            activeThreadId={lastThreadId ?? undefined}
          />
        </div>
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
