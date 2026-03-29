import { useState, useRef, useEffect } from "react";
import { MessageSquarePlus, X, OctagonX } from "lucide-react";
import { useThreadsStore } from "@/stores/threads";
import { vetComment, suggestCommentText, enhanceCommentBody } from "@/lib/commentAi";
import type { Thread } from "@/types/comments";

interface Anchor {
  from: number;
  to: number;
  quotedText: string;
}

interface ChatMsg {
  role: "user" | "ai";
  content: string;
}

type FlowStage = "input" | "processing" | "deflect" | "queued";

export interface CreateThreadViewProps {
  anchor: Anchor;
  onClose: () => void;
  onThreadCreated: (thread: Thread) => void;
  awsProfile: string;
  workspacePath: string;
  docContent: string;
  docFilePath?: string;
  aiEnhancementEnabled?: boolean;
  aiEnhancementTimeoutMs?: number;
}

const COUNTDOWN_SECONDS = 30;

export function CreateThreadView({
  anchor: initialAnchor,
  onClose,
  onThreadCreated,
  awsProfile,
  workspacePath,
  docContent,
  docFilePath,
  aiEnhancementEnabled = true,
  aiEnhancementTimeoutMs = 30000,
}: CreateThreadViewProps) {
  const [anchor, setAnchor] = useState(initialAnchor);
  const [stage, setStage] = useState<FlowStage>("input");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [blocking, setBlocking] = useState(false);
  const [queuedId, setQueuedId] = useState<string | null>(null);
  const [bodyOriginal, setBodyOriginal] = useState("");
  const [bodyEnhanced, setBodyEnhanced] = useState<string | null>(null);
  const [useEnhanced, setUseEnhanced] = useState(true);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { stageComment, commitComment, cancelQueuedComment, toggleQueuedBody } =
    useThreadsStore();

  const addMessage = (msg: ChatMsg) =>
    setMessages((prev) => [...prev, msg]);

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  async function handleSend(concern: string) {
    if (!concern.trim()) return;
    addMessage({ role: "user", content: concern });
    setInputValue("");
    setStage("processing");

    const vet = await vetComment({
      concern,
      docContent,
      relatedDocs: [],
      awsProfile,
      workspacePath,
    });

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
      awsProfile,
    });

    await startQueued(suggested, finalAnchor);
  }

  async function handleNoFileAnyway() {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg) return;
    setStage("processing");
    const suggested = await suggestCommentText({
      concern: lastUserMsg.content,
      quotedText: anchor.quotedText,
      surroundingContext: docContent.slice(
        Math.max(0, anchor.from - 100),
        anchor.to + 100,
      ),
      awsProfile,
    });
    await startQueued(suggested, anchor);
  }

  async function startQueued(suggestedText: string, currentAnchor: Anchor) {
    const id = crypto.randomUUID();
    const now = new Date();
    const expires = new Date(now.getTime() + COUNTDOWN_SECONDS * 1000);

    setQueuedId(id);
    setBodyOriginal(suggestedText);
    setBodyEnhanced(null);
    setUseEnhanced(true);
    setStage("queued");
    setCountdown(COUNTDOWN_SECONDS);

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
      body_original: suggestedText,
      body_enhanced: null,
      use_body_enhanced: true,
      blocking,
      created_at: now.toISOString(),
      expires_at: expires.toISOString(),
    });

    // Start countdown
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          handleCommit(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // AI enhancement runs concurrently (non-blocking)
    if (aiEnhancementEnabled) {
      enhanceCommentBody({
        body: suggestedText,
        awsProfile,
        timeoutMs: aiEnhancementTimeoutMs,
      }).then((enhanced) => {
        if (enhanced) {
          setBodyEnhanced(enhanced);
          useThreadsStore.getState().updateQueuedBody(id, enhanced);
        }
      });
    }
  }

  async function handleCommit(id: string) {
    try {
      const result = await commitComment(id, docFilePath);
      if ("status" in result || "doc_id" in result) {
        onThreadCreated(result as Thread);
      }
    } catch (e) {
      console.error("Failed to commit comment:", e);
    }
  }

  function handleCancelCountdown() {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (queuedId) cancelQueuedComment(queuedId);
    onClose();
  }

  function handleToggleBody() {
    if (!bodyEnhanced) return;
    setUseEnhanced((v) => !v);
    if (queuedId) toggleQueuedBody(queuedId);
  }

  const displayBody = useEnhanced && bodyEnhanced ? bodyEnhanced : bodyOriginal;

  return (
    <div className="flex flex-col h-full">
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
          <div className="border border-(--color-border-subtle) rounded-(--radius-base) p-3 space-y-2">
            <div className="text-[length:var(--font-size-ui-sm)]">
              {displayBody}
            </div>
            <div className="flex items-center justify-between">
              {/* AI/Raw toggle — only shown when body_enhanced is available */}
              {bodyEnhanced && (
                <div className="flex rounded-(--radius-sm) border border-(--color-border-subtle) overflow-hidden text-[length:var(--font-size-ui-xs)]">
                  <button
                    onClick={() => { if (useEnhanced) { return; } handleToggleBody(); }}
                    className={`px-2 py-1 ${useEnhanced ? "bg-(--color-accent) text-(--color-text-on-accent)" : ""}`}
                  >
                    ✨
                  </button>
                  <button
                    onClick={() => { if (!useEnhanced) { return; } handleToggleBody(); }}
                    className={`px-2 py-1 ${!useEnhanced ? "bg-(--color-accent) text-(--color-text-on-accent)" : ""}`}
                  >
                    👤
                  </button>
                </div>
              )}
              {/* Countdown pill */}
              <button
                onClick={handleCancelCountdown}
                className="flex items-center gap-1 px-2 py-1 rounded-(--radius-sm) border border-(--color-border-subtle) text-[length:var(--font-size-ui-xs)] text-(--color-text-tertiary)"
              >
                <X size={10} />
                <div className="w-16 h-1 bg-(--color-bg-subtle) rounded-full overflow-hidden">
                  <div
                    className="h-full bg-(--color-accent) transition-all duration-1000"
                    style={{
                      width: `${(countdown / COUNTDOWN_SECONDS) * 100}%`,
                    }}
                  />
                </div>
                <span>{countdown}s</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Blocking toggle (below queued card) */}
      {stage === "queued" && (
        <div className="px-3 py-1">
          <button
            onClick={() => setBlocking((b) => !b)}
            className={`flex items-center gap-1 text-[length:var(--font-size-ui-xs)] ${blocking ? "text-(--color-state-danger)" : "text-(--color-text-tertiary)"}`}
          >
            <OctagonX size={12} />
            <span>{blocking ? "Blocking" : "Mark as blocking"}</span>
          </button>
        </div>
      )}

      {/* Input area */}
      {(stage === "input" || stage === "deflect") && (
        <div className="border-t border-(--color-border-subtle) p-2">
          {stage === "deflect" && (
            <button
              onClick={handleNoFileAnyway}
              className="text-[length:var(--font-size-ui-xs)] text-(--color-text-tertiary) mb-1 hover:text-(--color-text-secondary)"
            >
              No, file anyway
            </button>
          )}
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
          <div className="flex justify-end">
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
