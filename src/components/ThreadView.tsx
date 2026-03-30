import { useRef, useEffect, useState } from "react";
import { ArrowLeft, ArrowUp, ArrowDown, X, OctagonX } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { useThreadsStore } from "@/stores/threads";
import { suggestFix } from "@/lib/commentAiFix";
import type { Thread } from "@/types/comments";
import { relativeTime } from "@/lib/relativeTime";

export interface ThreadViewProps {
  thread: Thread;
  currentUser: string;
  docAuthor: string;
  onBack: () => void;
  onClose: () => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  awsProfile: string;
  docContent: string;
  docFilePath?: string;
}

type VirtualCard = "suggest" | "resolve" | "reopen" | null;

function deriveVirtualCard(
  thread: Thread,
  currentUser: string,
  docAuthor: string,
): VirtualCard {
  if (thread.status === "resolved") return "reopen";
  const isDocEditor = currentUser === docAuthor;
  if (!isDocEditor) return null;
  if (thread.comments.length === 0) return null;
  const lastComment = thread.comments[thread.comments.length - 1];
  return lastComment.author !== docAuthor ? "suggest" : "resolve";
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export function ThreadView({
  thread,
  currentUser,
  docAuthor,
  onBack,
  onClose,
  onNavigatePrev,
  onNavigateNext,
  awsProfile,
  docContent,
  docFilePath,
}: ThreadViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [reopenConfirm, setReopenConfirm] = useState(false);
  const [fixInProgress, setFixInProgress] = useState(false);
  const [fixMessages, setFixMessages] = useState<string[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { resolveThread, reopenThread, toggleBlocking, stageComment, commitComment } =
    useThreadsStore();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thread.comments, fixMessages]);

  const virtualCard = deriveVirtualCard(thread, currentUser, docAuthor);

  const statusRowClass =
    thread.status === "resolved"
      ? "bg-(--color-state-success-subtle)"
      : thread.blocking
        ? "bg-(--color-state-danger-subtle)"
        : "";

  const iconClass =
    thread.status === "resolved"
      ? "text-(--color-text-tertiary)"
      : thread.blocking
        ? "text-(--color-state-danger)"
        : "text-(--color-text-tertiary)";

  const statusLabel =
    thread.status === "resolved"
      ? "resolved"
      : thread.blocking
        ? "blocking"
        : "open";

  const lastEvent = thread.events[thread.events.length - 1];

  function handleHistoryMouseEnter() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setHistoryOpen(true);
  }

  function handleHistoryMouseLeave() {
    closeTimer.current = setTimeout(() => setHistoryOpen(false), 80);
  }

  async function handleSuggestFix() {
    setFixInProgress(true);
    const result = await suggestFix({ thread, docContent, awsProfile });
    if (result) {
      setFixMessages([`Proposed fix: "${result.fix}"\n\n${result.reply}`]);
    }
    setFixInProgress(false);
  }

  async function handleSendReply() {
    if (!inputValue.trim()) return;
    const id = crypto.randomUUID();
    const now = new Date();
    const expires = new Date(now.getTime() + 30000);
    setInputValue("");
    await stageComment({
      id,
      thread_id: thread.id,
      doc_id: null,
      quoted_text: null,
      anchor_from: null,
      anchor_to: null,
      body_original: inputValue,
      body_enhanced: null,
      use_body_enhanced: false,
      blocking: false,
      created_at: now.toISOString(),
      expires_at: expires.toISOString(),
    });
    setTimeout(() => commitComment(id, docFilePath).catch(() => {}), 30000);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-(--color-border-subtle)">
        <button
          onClick={onBack}
          className="text-(--color-text-tertiary) hover:text-(--color-text-secondary) mr-1"
        >
          <ArrowLeft size={14} />
        </button>
        <span className="flex-1 text-[length:var(--font-size-ui-sm)] truncate font-medium">
          "{truncate(thread.quoted_text, 25)}"
        </span>
        <button
          onClick={onNavigatePrev}
          disabled={!onNavigatePrev}
          className="text-(--color-text-tertiary) disabled:opacity-30"
        >
          <ArrowUp size={14} />
        </button>
        <button
          onClick={onNavigateNext}
          disabled={!onNavigateNext}
          className="text-(--color-text-tertiary) disabled:opacity-30"
        >
          <ArrowDown size={14} />
        </button>
        <button onClick={onClose} className="text-(--color-text-tertiary) ml-1">
          <X size={14} />
        </button>
      </div>

      {/* Quoted text block */}
      <div className="mx-3 mt-3 p-2 rounded-(--radius-base) border-2 border-(--color-border-subtle) bg-(--color-bg-subtle) text-[length:var(--font-size-ui-sm)] italic text-(--color-text-secondary)">
        "{thread.quoted_text}"
      </div>

      {/* Status row */}
      <Popover.Root open={historyOpen}>
        <Popover.Trigger asChild>
          <div
            data-testid="status-row"
            onMouseEnter={handleHistoryMouseEnter}
            onMouseLeave={handleHistoryMouseLeave}
            onClick={() => setHistoryOpen(v => !v)}
            className={`flex items-center gap-2 mx-3 mt-0.5 px-2 py-1 rounded-(--radius-sm) cursor-default text-[length:var(--font-size-ui-xs)] ${statusRowClass}`}
          >
            <button
              onClick={() => thread.status === "open" && toggleBlocking(thread.id)}
              disabled={thread.status === "resolved"}
              className={`${iconClass} disabled:cursor-default`}
            >
              <OctagonX size={12} />
            </button>
            <span className="text-(--color-text-tertiary)">
              {statusLabel}
              {lastEvent ? ` · ${lastEvent.changed_by} · ${relativeTime(lastEvent.changed_at)}` : ""}
            </span>
          </div>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            onMouseEnter={handleHistoryMouseEnter}
            onMouseLeave={handleHistoryMouseLeave}
            side="bottom"
            align="start"
            className="bg-(--color-bg-elevated) border border-(--color-border-subtle) rounded-(--radius-base) p-2 shadow-md z-50"
          >
            <div className="space-y-1">
              {thread.events.map((ev) => (
                <div
                  key={ev.id}
                  className="text-[length:var(--font-size-ui-xs)] text-(--color-text-secondary)"
                >
                  → {ev.event} &nbsp;&nbsp; {ev.changed_by} · {relativeTime(ev.changed_at)}
                </div>
              ))}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {/* Comment list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {thread.comments.map((c) => (
          <div
            key={c.id}
            className={`flex flex-col ${c.author === currentUser ? "items-end" : "items-start"}`}
          >
            <span className="text-[length:var(--font-size-ui-xs)] text-(--color-text-tertiary) mb-1">
              {c.author} · {relativeTime(c.created_at)}
            </span>
            <div
              className={`px-3 py-2 rounded-(--radius-base) text-[length:var(--font-size-ui-sm)] max-w-[85%] ${
                c.author === currentUser
                  ? "bg-(--color-accent) text-(--color-text-on-accent)"
                  : "bg-(--color-bg-subtle)"
              }`}
            >
              {c.body}
            </div>
          </div>
        ))}

        {/* AI fix messages */}
        {fixMessages.map((m, i) => (
          <div
            key={i}
            className="bg-(--color-bg-subtle) px-3 py-2 rounded-(--radius-base) text-[length:var(--font-size-ui-sm)]"
          >
            ✨ {m}
          </div>
        ))}

        {/* Virtual cards */}
        {virtualCard === "suggest" && !fixInProgress && (
          <div className="border border-(--color-border-subtle) rounded-(--radius-base) p-3 text-[length:var(--font-size-ui-sm)]">
            <div className="text-(--color-text-secondary) mb-2">
              ✨ Want me to suggest a fix for this thread?
            </div>
            <button
              onClick={handleSuggestFix}
              className="text-[length:var(--font-size-ui-xs)] px-2 py-1 bg-(--color-accent) text-(--color-text-on-accent) rounded-(--radius-sm)"
            >
              Suggest a fix
            </button>
          </div>
        )}
        {virtualCard === "resolve" && (
          <div className="border border-(--color-border-subtle) rounded-(--radius-base) p-3 text-[length:var(--font-size-ui-sm)]">
            <div className="text-(--color-text-secondary) mb-2">
              ✨ Ready to mark this thread as resolved?
            </div>
            <button
              onClick={() => resolveThread(thread.id)}
              className="text-[length:var(--font-size-ui-xs)] px-2 py-1 bg-(--color-accent) text-(--color-text-on-accent) rounded-(--radius-sm)"
            >
              Mark as resolved
            </button>
          </div>
        )}
        {virtualCard === "reopen" && (
          <div className="border border-(--color-border-subtle) rounded-(--radius-base) p-3 text-[length:var(--font-size-ui-sm)]">
            <div className="text-(--color-text-secondary) mb-2">
              ✨ This thread was marked as resolved.
            </div>
            {reopenConfirm ? (
              <div className="flex gap-2 text-[length:var(--font-size-ui-xs)]">
                <span>Re-open this thread?</span>
                <button
                  onClick={() => {
                    reopenThread(thread.id);
                    setReopenConfirm(false);
                  }}
                  className="text-(--color-state-warning)"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setReopenConfirm(false)}
                  className="text-(--color-text-tertiary)"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setReopenConfirm(true)}
                className="text-[length:var(--font-size-ui-xs)] px-2 py-1 border border-(--color-border-subtle) rounded-(--radius-sm)"
              >
                Re-open
              </button>
            )}
          </div>
        )}
      </div>

      {/* Reply input */}
      <div className="border-t border-(--color-border-subtle) p-2">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendReply();
            }
          }}
          placeholder="Reply…"
          rows={2}
          className="w-full resize-none bg-transparent text-[length:var(--font-size-ui-sm)] outline-none"
        />
        <div className="flex justify-end">
          <button
            disabled={!inputValue.trim()}
            onClick={handleSendReply}
            className="text-[length:var(--font-size-ui-xs)] px-2 py-1 bg-(--color-accent) text-(--color-text-on-accent) rounded-(--radius-sm) disabled:opacity-40"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
