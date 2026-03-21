import { useState, useRef, useEffect } from "react";
import { useAiChatStore } from "@/stores/aiChat";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInputCard } from "@/components/ChatInputCard";
import { MessageSquare, Clock, Plus } from "lucide-react";

interface ChatViewProps {
  onShowHistory: () => void;
  onNewSession: () => void;
}

export function ChatView({ onShowHistory, onNewSession }: ChatViewProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const {
    currentSession,
    messages,
    isStreaming,
    streamingContent,
    error,
    sendMessage,
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
      className="w-96 flex flex-col h-full border-l border-(--color-border-default) bg-(--color-bg-base)"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-(--color-border-default) flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-(--color-text-tertiary)" />
          <span className="text-[length:var(--font-size-ui-md)] font-medium text-(--color-text-primary)">
            {currentSession?.name || "AI assistant"}
          </span>
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
        <div className="p-3 border-t border-(--color-border-default)">
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
