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

  const handleSuggestedPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  const renderBody = () => {
    // Empty state: no messages and not streaming
    if (messages.length === 0 && !isStreaming) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
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
                onClick={() => handleSuggestedPrompt(prompt)}
                className="w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
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
        {isStreaming && (
          <div className="flex justify-start mb-3">
            <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
          </div>
        )}
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        <div ref={messagesEndRef} />
      </>
    );
  };

  return (
    <div
      ref={panelRef}
      className="w-96 flex flex-col h-full border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {currentSession?.name || "AI assistant"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onShowHistory}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            title="Session history"
            aria-label="Session history"
          >
            <Clock className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={onNewSession}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            title="New conversation"
            aria-label="New conversation"
          >
            <Plus className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Messages pane */}
        <div className="flex-1 overflow-y-auto p-4">{renderBody()}</div>

        {/* Input — always rendered in ChatView (auth guard lives in AiChatPanel) */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
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
