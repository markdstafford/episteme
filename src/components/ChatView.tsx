import { useState, useRef, useEffect } from "react";
import * as Popover from "@radix-ui/react-popover";
import { useAiChatStore } from "@/stores/aiChat";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInputCard } from "@/components/ChatInputCard";
import { MessageSquare, Clock, Plus, Pencil, Sparkles, Loader2 } from "lucide-react";

interface ChatViewProps {
  onShowHistory: () => void;
  onNewSession: () => void;
}

export function ChatView({ onShowHistory, onNewSession }: ChatViewProps) {
  const [input, setInput] = useState("");
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [isSuggesting, setIsSuggesting] = useState(false);
  const skipNextBlurRef = useRef(false);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const {
    currentSession,
    messages,
    isStreaming,
    streamingContent,
    error,
    sendMessage,
    renameSession,
    suggestSessionName,
  } = useAiChatStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
    setInput("");
  };

  const renderBody = () => {
    // Empty state: no messages and not streaming
    if (messages.length === 0 && !isStreaming) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <p className="text-[length:var(--font-size-ui-base)] text-(--color-text-tertiary)">
            Ask me about this document or your repository
          </p>
          <div className="flex flex-col gap-2 w-full">
            {[
              "Summarize this document",
              "What documents relate to this one?",
              "What context do I need to understand this?",
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="w-full px-3 py-2 text-[length:var(--font-size-ui-base)] text-left text-(--color-text-secondary) bg-(--color-bg-subtle) hover:bg-(--color-bg-hover) rounded-(--radius-base) transition-colors duration-(--duration-fast)"
              >
                {prompt}
              </button>
            ))}
          </div>
          {error && (
            <p className="text-[length:var(--font-size-ui-base)] text-(--color-state-danger) mt-2">
              {error}
            </p>
          )}
        </div>
      );
    }

    // Has messages (and possibly streaming)
    return (
      <>
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}
        {isStreaming && streamingContent && (
          <ChatMessage
            message={{ role: "assistant", content: streamingContent }}
          />
        )}
        {isStreaming && !streamingContent && (
          <div className="flex justify-start mb-3">
            <span className="inline-block w-2 h-2 bg-(--color-text-tertiary) rounded-full animate-pulse" />
          </div>
        )}
        {error && (
          <p className="text-[length:var(--font-size-ui-base)] text-(--color-state-danger) mt-2">
            {error}
          </p>
        )}
        <div ref={messagesEndRef} />
      </>
    );
  };

  return (
    <div
      ref={panelRef}
      className="w-96 flex flex-col h-full border-l border-(--color-border-subtle) bg-(--color-bg-base)"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-(--height-titlebar) border-b border-(--color-border-subtle) flex-shrink-0">
        <div className="group flex items-center gap-1 min-w-0">
          <MessageSquare className="w-4 h-4 text-(--color-text-tertiary) flex-shrink-0" />
          <span className="text-[length:var(--font-size-ui-md)] font-medium text-(--color-text-primary) truncate">
            {currentSession?.name || "AI assistant"}
          </span>
          <Popover.Root
            open={isRenameOpen}
            onOpenChange={(open) => {
              if (open) setRenameValue(currentSession?.name ?? "");
              setIsRenameOpen(open);
            }}
          >
            <Popover.Trigger asChild>
              <button
                aria-label="Rename session"
                className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-5 h-5 flex-shrink-0 rounded-(--radius-sm) hover:bg-(--color-bg-hover) transition-opacity duration-(--duration-fast)"
              >
                <Pencil className="w-3 h-3 text-(--color-text-tertiary)" />
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                className="bg-(--color-bg-elevated) border border-(--color-border-subtle) rounded-(--radius-base) shadow-(--shadow-md) p-2 z-50 flex items-center gap-1"
                side="bottom"
                align="start"
                onKeyDown={(e) => {
                  if (e.key === "Escape") setIsRenameOpen(false);
                }}
              >
                <input
                  autoFocus
                  ref={renameInputRef}
                  aria-label="Session name"
                  disabled={isSuggesting}
                  className="flex-1 min-w-0 text-[length:var(--font-size-ui-base)] bg-(--color-bg-subtle) border border-(--color-border-subtle) rounded-(--radius-sm) px-2 py-1 text-(--color-text-primary) outline-none focus:border-(--color-accent)"
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && currentSession) {
                      await renameSession(currentSession.id, renameValue);
                      setIsRenameOpen(false);
                    } else if (e.key === "Escape") {
                      setIsRenameOpen(false);
                    }
                  }}
                  onBlur={async () => {
                    if (skipNextBlurRef.current) {
                      skipNextBlurRef.current = false;
                      return;
                    }
                    if (currentSession && isRenameOpen) {
                      await renameSession(currentSession.id, renameValue);
                    }
                    setIsRenameOpen(false);
                  }}
                />
                <button
                  data-testid="header-suggest-btn"
                  disabled={!currentSession || currentSession.messages_compacted.length === 0 || isSuggesting}
                  onMouseDown={() => { skipNextBlurRef.current = true; }}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!currentSession) return;
                    setIsSuggesting(true);
                    try {
                      const suggested = await suggestSessionName(currentSession.id);
                      setRenameValue(suggested);
                      renameInputRef.current?.focus();
                    } finally {
                      setIsSuggesting(false);
                    }
                  }}
                  className="flex items-center justify-center w-6 h-6 flex-shrink-0 rounded-(--radius-sm) hover:bg-(--color-bg-hover) disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Suggest name with AI"
                >
                  {isSuggesting
                    ? <Loader2 className="w-3 h-3 animate-spin text-(--color-text-tertiary)" />
                    : <Sparkles className="w-3 h-3 text-(--color-text-tertiary)" />
                  }
                </button>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onShowHistory}
            className="size-7 flex items-center justify-center hover:bg-(--color-bg-hover) rounded-(--radius-base)"
            title="Session history"
            aria-label="Session history"
          >
            <Clock className="w-4 h-4 text-(--color-text-tertiary)" />
          </button>
          <button
            onClick={onNewSession}
            className="size-7 flex items-center justify-center hover:bg-(--color-bg-hover) rounded-(--radius-base)"
            title="New conversation"
            aria-label="New conversation"
          >
            <Plus className="w-4 h-4 text-(--color-text-tertiary)" />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Messages pane */}
        <div className="flex-1 overflow-y-auto p-4">{renderBody()}</div>

        {/* Input — always rendered in ChatView; disabled via isStreaming when session not yet ready */}
        <div className="p-1.5">
          <ChatInputCard
            value={input}
            onChange={setInput}
            onSend={handleSend}
            isStreaming={isStreaming || !currentSession}
            panelRef={panelRef}
          />
        </div>
      </div>
    </div>
  );
}
