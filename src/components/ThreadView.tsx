import { useRef, useEffect, useState } from "react";
import { ArrowLeft, ArrowUp, ArrowDown, X, OctagonX, MessageSquarePlus } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { useThreadsStore } from "@/stores/threads";
import { suggestFix } from "@/lib/commentAiFix";
import { enhanceCommentBody, vetComment, suggestCommentText, isAuthError } from "@/lib/commentAi";
import type { Thread } from "@/types/comments";
import { relativeTime } from "@/lib/relativeTime";
import { useQueuedComment, COUNTDOWN_SECONDS } from "@/hooks/useQueuedComment";
import { QueuedCommentCard } from "@/components/QueuedCommentCard";
import type { CommentTriggerAnchor } from "@/components/MarkdownRenderer";

interface SharedProps {
  onClose: () => void;
  awsProfile: string;
  docContent: string;
  docFilePath?: string;
}

interface NewThreadProps extends SharedProps {
  mode: "new";
  anchor: CommentTriggerAnchor;
  onThreadCreated: (thread: Thread) => void;
  onAuthError?: () => void;
  workspacePath: string;
  deflectInstruction?: string;
  redirectInstruction?: string;
}

interface ReplyProps extends SharedProps {
  mode: "reply";
  thread: Thread;
  currentUser: string;
  docAuthor: string;
  onBack: () => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  aiEnhancementEnabled?: boolean;
  aiEnhancementTimeoutMs?: number;
}

export type ThreadViewProps = NewThreadProps | ReplyProps;

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

export function ThreadView(props: ThreadViewProps) {
  const { onClose, awsProfile, docContent, docFilePath } = props;
  // Reply-mode props (only available when mode="reply")
  const thread = props.mode === "reply" ? props.thread : null!;
  const currentUser = props.mode === "reply" ? props.currentUser : "";
  const docAuthor = props.mode === "reply" ? props.docAuthor : "";
  const onBack = props.mode === "reply" ? props.onBack : onClose;
  const onNavigatePrev = props.mode === "reply" ? props.onNavigatePrev : undefined;
  const onNavigateNext = props.mode === "reply" ? props.onNavigateNext : undefined;
  const aiEnhancementEnabled = props.mode === "reply" ? (props.aiEnhancementEnabled ?? true) : true;
  const aiEnhancementTimeoutMs = props.mode === "reply" ? (props.aiEnhancementTimeoutMs ?? 30000) : 30000;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [reopenConfirm, setReopenConfirm] = useState(false);
  const [fixInProgress, setFixInProgress] = useState(false);
  const [fixMessages, setFixMessages] = useState<string[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [replyProcessing, setReplyProcessing] = useState(false);

  // mode="new" state
  const [stage, setStage] = useState<"input" | "processing" | "deflect" | "queued">("input");
  const [deflectAnswer, setDeflectAnswer] = useState<string | null>(null);
  const [anchorState, setAnchorState] = useState(
    props.mode === "new" ? props.anchor : { from: 0, to: 0, quotedText: "" }
  );
  const concernRef = useRef<string>("");

  const { resolveThread, reopenThread, toggleBlocking, stageComment, commitComment,
          cancelQueuedComment, updateQueuedBlocking, toggleQueuedBody } =
    useThreadsStore();

  async function commitWithCallback(id: string, filePath?: string): Promise<unknown> {
    const result = await commitComment(id, filePath);
    if (props.mode === "new" && result && ("status" in (result as object) || "doc_id" in (result as object))) {
      props.onThreadCreated(result as Thread);
    }
    return result;
  }

  const queued = useQueuedComment({
    stageComment,
    commitComment: commitWithCallback,
    cancelQueuedComment,
    updateQueuedBlocking,
    toggleQueuedBody,
    docFilePath,
  });

  useEffect(() => {
    if (props.mode !== "reply") return;
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [props.mode === "reply" ? props.thread.comments : null, fixMessages]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (props.mode !== "reply") return;
    // Reset queued card UI when switching to a different thread
    queued.reset();
  }, [props.mode === "reply" ? props.thread.id : null]); // eslint-disable-line react-hooks/exhaustive-deps

  const virtualCard = props.mode === "reply"
    ? deriveVirtualCard(thread, currentUser, docAuthor)
    : null;

  const statusRowClass = props.mode === "reply"
    ? (thread.status === "resolved"
      ? "bg-(--color-state-success-subtle)"
      : thread.blocking
        ? "bg-(--color-state-danger-subtle)"
        : "")
    : "";

  const iconClass = props.mode === "reply"
    ? (thread.status === "resolved"
      ? "text-(--color-text-tertiary)"
      : thread.blocking
        ? "text-(--color-state-danger)"
        : "text-(--color-text-tertiary)")
    : "text-(--color-text-tertiary)";

  const statusLabel = props.mode === "reply"
    ? (thread.status === "resolved"
      ? "resolved"
      : thread.blocking
        ? "blocking"
        : "open")
    : "open";

  const lastEvent = props.mode === "reply"
    ? thread.events[thread.events.length - 1]
    : null;

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

  async function startNewThread(
    bodyOriginalText: string,
    currentAnchor: { from: number; to: number; quotedText: string },
    preEnhancedText?: string,
  ) {
    if (props.mode !== "new") return;

    const id = crypto.randomUUID();
    const now = new Date();
    const expires = new Date(now.getTime() + COUNTDOWN_SECONDS * 1000);

    setStage("queued");

    let docId: string | null = null;
    if (docFilePath) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        docId = await invoke<string>("ensure_doc_id_for_file", { filePath: docFilePath });
      } catch (e) {
        console.error("Failed to ensure doc_id:", e);
      }
    }

    await stageComment({
      id,
      thread_id: null,
      doc_id: docId,
      quoted_text: currentAnchor.quotedText,
      anchor_from: currentAnchor.from,
      anchor_to: currentAnchor.to,
      body_original: bodyOriginalText,
      body_enhanced: preEnhancedText ?? null,
      use_body_enhanced: true,
      blocking: queued.blocking,
      created_at: now.toISOString(),
      expires_at: expires.toISOString(),
    });

    queued.startQueued({ id, bodyOriginal: bodyOriginalText, bodyEnhanced: preEnhancedText ?? null });
  }

  async function handleSendConcern(concern: string) {
    if (!concern.trim() || props.mode !== "new") return;
    concernRef.current = concern;
    setInputValue("");
    setStage("processing");

    let vet: Awaited<ReturnType<typeof vetComment>>;
    try {
      vet = await vetComment({
        concern,
        docContent,
        quotedText: anchorState.quotedText,
        surroundingContext: docContent.slice(Math.max(0, anchorState.from - 100), anchorState.to + 100),
        relatedDocs: [],
        awsProfile,
        workspacePath: props.workspacePath,
        deflectInstruction: props.deflectInstruction,
        redirectInstruction: props.redirectInstruction,
      });
    } catch (e) {
      const msg = String(e);
      if (isAuthError(msg)) {
        props.onAuthError?.();
        return;
      }
      vet = { type: "proceed" };
    }

    if (vet.type === "deflect") {
      setDeflectAnswer(vet.answer);
      setStage("deflect");
      return;
    }

    let finalAnchor = anchorState;
    if (vet.type === "redirect") {
      const redirected = { from: vet.newFrom, to: vet.newTo, quotedText: vet.newQuotedText };
      setAnchorState(redirected);
      finalAnchor = redirected;
    }

    const suggested = await suggestCommentText({
      concern,
      quotedText: finalAnchor.quotedText,
      surroundingContext: docContent.slice(Math.max(0, finalAnchor.from - 100), finalAnchor.to + 100),
      docContent,
      awsProfile,
    });

    await startNewThread(concern, finalAnchor, suggested);
  }

  async function handleNoFileAnyway() {
    if (props.mode !== "new") return;
    const originalText = concernRef.current;
    if (!originalText.trim()) return;
    setStage("processing");

    const suggested = await suggestCommentText({
      concern: originalText,
      quotedText: anchorState.quotedText,
      surroundingContext: docContent.slice(Math.max(0, anchorState.from - 100), anchorState.to + 100),
      docContent,
      awsProfile,
    });

    await startNewThread(originalText, anchorState, suggested);
  }

  async function handleSendReply() {
    if (!inputValue.trim()) return;
    const body = inputValue;
    setInputValue("");

    setReplyProcessing(true);
    let enhanced: string | null = null;
    if (aiEnhancementEnabled) {
      enhanced = await enhanceCommentBody({
        body,
        quotedText: thread.quoted_text,
        docContent,
        threadComments: thread.comments,
        awsProfile,
        timeoutMs: aiEnhancementTimeoutMs,
      });
    }
    setReplyProcessing(false);

    const id = crypto.randomUUID();
    const now = new Date();
    const expires = new Date(now.getTime() + COUNTDOWN_SECONDS * 1000);

    await stageComment({
      id,
      thread_id: thread.id,
      doc_id: null,
      quoted_text: null,
      anchor_from: null,
      anchor_to: null,
      body_original: body,
      body_enhanced: enhanced,
      use_body_enhanced: true,
      blocking: queued.blocking,
      created_at: now.toISOString(),
      expires_at: expires.toISOString(),
    });

    queued.startQueued({ id, bodyOriginal: body, bodyEnhanced: enhanced });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      {props.mode === "new" ? (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-(--color-border-subtle)">
          <MessageSquarePlus size={14} className="text-(--color-text-secondary)" />
          <span className="text-[length:var(--font-size-ui-sm)] font-medium flex-1">New comment</span>
          <button onClick={onClose} className="text-(--color-text-tertiary) hover:text-(--color-text-secondary)">
            <X size={14} />
          </button>
        </div>
      ) : (
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
      )}

      {/* Quoted text block — mode="new" shows anchor text, mode="reply" shows thread quoted text */}
      {props.mode === "new" && (
        <div className="mx-3 mt-3 p-2 rounded-(--radius-base) border-2 border-(--color-border-subtle) bg-(--color-bg-subtle) text-[length:var(--font-size-ui-sm)] italic text-(--color-text-secondary)">
          "{anchorState.quotedText}"
        </div>
      )}
      {props.mode === "reply" && (
        <div className="mx-3 mt-3 p-2 rounded-(--radius-base) border-2 border-(--color-border-subtle) bg-(--color-bg-subtle) text-[length:var(--font-size-ui-sm)] italic text-(--color-text-secondary)">
          "{thread.quoted_text}"
        </div>
      )}

      {/* Status row — reply mode only */}
      {props.mode === "reply" && <Popover.Root open={historyOpen}>
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
      </Popover.Root>}

      {/* Comment list — reply mode only */}
      {props.mode === "reply" && <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
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
      </div>}

      {/* Scrollable middle area — new mode only */}
      {props.mode === "new" && (
        <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col justify-end space-y-2">
          {stage === "processing" && (
            <div className="text-(--color-text-tertiary) text-[length:var(--font-size-ui-sm)]">
              ✨ Checking document…
            </div>
          )}
          {stage === "deflect" && deflectAnswer && (
            <div className="border border-(--color-border-subtle) rounded-(--radius-base) p-3 text-[length:var(--font-size-ui-sm)]">
              <div className="text-(--color-text-secondary) mb-2">{deflectAnswer}</div>
              <div className="text-(--color-text-tertiary) text-[length:var(--font-size-ui-xs)] mb-2">
                ✨ Does that answer your concern?
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleNoFileAnyway} className="text-[length:var(--font-size-ui-xs)] px-2 py-1 border border-(--color-border-subtle) rounded-(--radius-sm) text-(--color-text-secondary) hover:text-(--color-text-primary)">
                  No, file anyway
                </button>
                <button onClick={onClose} className="text-[length:var(--font-size-ui-xs)] px-2 py-1 bg-(--color-accent) text-(--color-text-on-accent) rounded-(--radius-sm)">
                  Yes, thanks
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {props.mode === "new" && stage === "queued" && (
        <QueuedCommentCard
          displayBody={queued.displayBody}
          bodyEnhanced={queued.bodyEnhanced}
          useEnhanced={queued.useEnhanced}
          blocking={queued.blocking}
          countdown={queued.countdown}
          countdownSeconds={COUNTDOWN_SECONDS}
          error={queued.commitError}
          onToggleBody={queued.toggleBody}
          onCancel={() => { queued.cancel(); onClose(); }}
          onSetBlocking={queued.setBlocking}
          onRetry={queued.retryCommit}
          testId="queued-card"
          className="mx-3 mb-2"
        />
      )}

      {(props.mode === "reply" && (replyProcessing || !!queued.queuedId)) && (
        <QueuedCommentCard
          displayBody={queued.displayBody}
          bodyEnhanced={queued.bodyEnhanced}
          useEnhanced={queued.useEnhanced}
          blocking={queued.blocking}
          countdown={queued.countdown}
          countdownSeconds={COUNTDOWN_SECONDS}
          processing={replyProcessing}
          error={queued.commitError}
          onToggleBody={queued.toggleBody}
          onCancel={queued.cancel}
          onSetBlocking={queued.setBlocking}
          onRetry={queued.retryCommit}
          testId="queued-reply-card"
          className="mx-3 mb-2"
        />
      )}

      {/* Concern input — new mode only, input stage */}
      {props.mode === "new" && stage === "input" && (
        <div className="border-t border-(--color-border-subtle) p-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendConcern(inputValue);
              }
            }}
            placeholder="What's your question or concern?"
            className="w-full resize-none bg-transparent text-[length:var(--font-size-ui-sm)] outline-none"
            rows={2}
          />
          <div className="flex justify-end mt-1">
            <button
              onClick={() => handleSendConcern(inputValue)}
              disabled={!inputValue.trim()}
              className="text-[length:var(--font-size-ui-xs)] px-2 py-1 bg-(--color-accent) text-(--color-text-on-accent) rounded-(--radius-sm) disabled:opacity-40"
            >
              ↑
            </button>
          </div>
        </div>
      )}

      {/* Reply input — reply mode only */}
      {props.mode === "reply" && (
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
            disabled={!!queued.queuedId || replyProcessing}
            className="w-full resize-none bg-transparent text-[length:var(--font-size-ui-sm)] outline-none"
          />
          <div className="flex justify-end">
            <button
              disabled={!inputValue.trim() || !!queued.queuedId || replyProcessing}
              onClick={handleSendReply}
              className="text-[length:var(--font-size-ui-xs)] px-2 py-1 bg-(--color-accent) text-(--color-text-on-accent) rounded-(--radius-sm) disabled:opacity-40"
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
