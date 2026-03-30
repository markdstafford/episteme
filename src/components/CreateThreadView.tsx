import { useState } from "react";
import { MessageSquarePlus, X } from "lucide-react";
import { useThreadsStore } from "@/stores/threads";
import { vetComment, suggestCommentText, enhanceCommentBody, isAuthError } from "@/lib/commentAi";
import type { Thread } from "@/types/comments";
import type { CommentTriggerAnchor } from "@/components/MarkdownRenderer";
import { useQueuedComment, COUNTDOWN_SECONDS } from "@/hooks/useQueuedComment";
import { QueuedCommentCard } from "@/components/QueuedCommentCard";

interface ChatMsg {
  role: "user" | "ai";
  content: string;
}

type FlowStage = "input" | "processing" | "deflect" | "queued";

export interface CreateThreadViewProps {
  anchor: CommentTriggerAnchor;
  onClose: () => void;
  onThreadCreated: (thread: Thread) => void;
  onAuthError?: () => void;
  awsProfile: string;
  workspacePath: string;
  docContent: string;
  docFilePath?: string;
  aiEnhancementEnabled?: boolean;
  aiEnhancementTimeoutMs?: number;
  deflectInstruction?: string;
  redirectInstruction?: string;
}

export function CreateThreadView({
  anchor: initialAnchor,
  onClose,
  onThreadCreated,
  onAuthError,
  awsProfile,
  workspacePath,
  docContent,
  docFilePath,
  aiEnhancementEnabled = true,
  aiEnhancementTimeoutMs = 30000,
  deflectInstruction,
  redirectInstruction,
}: CreateThreadViewProps) {
  const [anchor, setAnchor] = useState(initialAnchor);
  const [stage, setStage] = useState<FlowStage>("input");
  const [isClosing, setIsClosing] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [inputValue, setInputValue] = useState("");

  const { stageComment, commitComment, cancelQueuedComment, toggleQueuedBody, updateQueuedBlocking } =
    useThreadsStore();

  async function commitCommentWithCallback(id: string, filePath?: string): Promise<unknown> {
    const result = await commitComment(id, filePath);
    if (result && ("status" in (result as object) || "doc_id" in (result as object))) {
      onThreadCreated(result as Thread);
    }
    return result;
  }

  const queued = useQueuedComment({
    stageComment,
    commitComment: commitCommentWithCallback,
    cancelQueuedComment,
    updateQueuedBlocking,
    toggleQueuedBody,
    docFilePath,
  });

  function closeWithAnimation() {
    setIsClosing(true);
    setTimeout(() => onClose(), 250);
  }

  const addMessage = (msg: ChatMsg) =>
    setMessages((prev) => [...prev, msg]);

  async function handleSend(concern: string) {
    if (!concern.trim()) return;
    addMessage({ role: "user", content: concern });
    setInputValue("");
    setStage("processing");

    let vet: Awaited<ReturnType<typeof vetComment>>;
    try {
      vet = await vetComment({
        concern,
        docContent,
        quotedText: anchor.quotedText,
        surroundingContext: docContent.slice(
          Math.max(0, anchor.from - 100),
          anchor.to + 100,
        ),
        relatedDocs: [],
        awsProfile,
        workspacePath,
        deflectInstruction,
        redirectInstruction,
      });
    } catch (e) {
      const msg = String(e);
      if (isAuthError(msg)) {
        onAuthError?.();
        return;
      }
      vet = { type: "proceed" };
    }

    if (vet.type === "deflect") {
      addMessage({ role: "ai", content: vet.answer });
      setStage("deflect");
      return;
    }

    let finalAnchor = anchor;
    if (vet.type === "redirect") {
      const redirected = {
        from: vet.newFrom,
        to: vet.newTo,
        quotedText: vet.newQuotedText,
      };
      setAnchor(redirected);
      finalAnchor = redirected;
      addMessage({
        role: "ai",
        content: `Got it. I've moved your comment to a more relevant passage. [Go back]`,
      });
    }

    const suggested = await suggestCommentText({
      concern,
      quotedText: finalAnchor.quotedText,
      surroundingContext: docContent.slice(
        Math.max(0, finalAnchor.from - 100),
        finalAnchor.to + 100,
      ),
      docContent,
      awsProfile,
    });

    await startQueued(concern, finalAnchor, suggested);
  }

  async function handleNoFileAnyway() {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg) return;
    setStage("processing");
    const originalText = lastUserMsg.content;
    const suggested = await suggestCommentText({
      concern: originalText,
      quotedText: anchor.quotedText,
      surroundingContext: docContent.slice(
        Math.max(0, anchor.from - 100),
        anchor.to + 100,
      ),
      docContent,
      awsProfile,
    });
    await startQueued(originalText, anchor, suggested);
  }

  async function startQueued(bodyOriginalText: string, currentAnchor: CommentTriggerAnchor, preEnhancedText?: string) {
    const id = crypto.randomUUID();
    const now = new Date();
    const expires = new Date(now.getTime() + COUNTDOWN_SECONDS * 1000);

    setStage("queued");

    // Ensure doc_id exists in frontmatter before queuing
    let docId: string | null = null;
    if (docFilePath) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        docId = await invoke<string>("ensure_doc_id_for_file", {
          filePath: docFilePath,
        });
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

    // AI enhancement runs concurrently (non-blocking) — skip if pre-enhanced text was provided
    if (!preEnhancedText && aiEnhancementEnabled) {
      enhanceCommentBody({
        body: bodyOriginalText,
        quotedText: currentAnchor.quotedText,
        docContent,
        awsProfile,
        timeoutMs: aiEnhancementTimeoutMs,
      }).then((enhanced) => {
        if (enhanced) {
          useThreadsStore.getState().updateQueuedBody(id, enhanced);
        }
      });
    }
  }

  return (
    <div className={`flex flex-col h-full transition-opacity duration-250 ${isClosing ? "opacity-0" : "opacity-100"}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-(--color-border-subtle)">
        <MessageSquarePlus size={14} className="text-(--color-text-secondary)" />
        <span className="text-[length:var(--font-size-ui-sm)] font-medium flex-1">
          New comment
        </span>
        <button
          onClick={onClose}
          className="text-(--color-text-tertiary) hover:text-(--color-text-secondary)"
        >
          <X size={14} />
        </button>
      </div>

      {/* Quoted text block */}
      <div className="mx-3 mt-3 p-2 rounded-(--radius-base) border-2 border-(--color-border-subtle) bg-(--color-bg-subtle) text-[length:var(--font-size-ui-sm)] italic text-(--color-text-secondary)">
        "{anchor.quotedText}"
      </div>

      {/* Message stream */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-[length:var(--font-size-ui-sm)] px-3 py-2 rounded-(--radius-base) max-w-[85%] ${
              msg.role === "user"
                ? "ml-auto bg-(--color-accent) text-(--color-text-on-accent)"
                : "bg-(--color-bg-subtle) text-(--color-text-primary)"
            }`}
          >
            {msg.content}
          </div>
        ))}

        {stage === "processing" && (
          <div className="bg-(--color-bg-subtle) rounded-(--radius-base) px-3 py-2 text-(--color-text-tertiary) text-[length:var(--font-size-ui-sm)]">
            ✨ Checking document…
          </div>
        )}

        {/* Queued card */}
        {stage === "queued" && (
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
          />
        )}
      </div>

      {/* Deflect virtual card */}
      {stage === "deflect" && (
        <div className="mx-3 mb-2 border border-(--color-border-subtle) rounded-(--radius-base) p-3 text-[length:var(--font-size-ui-sm)]">
          <div className="text-(--color-text-secondary) mb-2">
            ✨ Does that answer your concern?
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNoFileAnyway}
              className="text-[length:var(--font-size-ui-xs)] px-2 py-1 border border-(--color-border-subtle) rounded-(--radius-sm) text-(--color-text-secondary) hover:text-(--color-text-primary)"
            >
              No, file anyway
            </button>
            <button
              onClick={closeWithAnimation}
              className="text-[length:var(--font-size-ui-xs)] px-2 py-1 bg-(--color-accent) text-(--color-text-on-accent) rounded-(--radius-sm)"
            >
              Yes, thanks
            </button>
          </div>
        </div>
      )}

      {/* Input area */}
      {(stage === "input" || stage === "deflect") && (
        <div className="border-t border-(--color-border-subtle) p-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(inputValue);
              }
            }}
            placeholder="What's your question or concern?"
            className="w-full resize-none bg-transparent text-[length:var(--font-size-ui-sm)] outline-none"
            rows={2}
          />
          <div className="flex justify-end mt-1">
            <button
              onClick={() => handleSend(inputValue)}
              disabled={!inputValue.trim()}
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
