import { useState, useRef, useEffect } from "react";
import { useAiChatStore } from "@/stores/aiChat";
import { ChatMessage } from "@/components/ChatMessage";
import { MessageSquare, RotateCcw, X, Send, Loader2 } from "lucide-react";

interface AiChatPanelProps {
  onClose: () => void;
}

export function AiChatPanel({ onClose }: AiChatPanelProps) {
  const [input, setInput] = useState("");
  const [profileInput, setProfileInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isStreaming,
    streamingContent,
    isAuthenticated,
    authChecked,
    awsProfile,
    error,
    checkAuth,
    login,
    sendMessage,
    setAwsProfile,
    clearConversation,
  } = useAiChatStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleConnect = async () => {
    if (!profileInput.trim()) return;
    await setAwsProfile(profileInput.trim());
    await login();
  };

  const handleSuggestedPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  const renderBody = () => {
    // State 1: Auth not checked yet
    if (!authChecked) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      );
    }

    // State 2: Not authenticated, no profile
    if (!isAuthenticated && !awsProfile) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Connect to AWS Bedrock
          </p>
          <input
            type="text"
            value={profileInput}
            onChange={(e) => setProfileInput(e.target.value)}
            placeholder="e.g., ai-prod-llm"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConnect();
            }}
          />
          <button
            onClick={handleConnect}
            disabled={!profileInput.trim()}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Connect
          </button>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
      );
    }

    // State 3: Not authenticated, has profile
    if (!isAuthenticated && awsProfile) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Session expired
          </p>
          <button
            onClick={login}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Re-authenticate
          </button>
          <button
            onClick={() => {
              useAiChatStore.setState({ awsProfile: null, authChecked: true });
            }}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Change profile
          </button>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
      );
    }

    // State 4: Authenticated, no messages
    if (isAuthenticated && messages.length === 0 && !isStreaming) {
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

    // State 5 & 6: Authenticated, has messages (and possibly streaming)
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
    <div className="w-96 flex flex-col h-full border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            AI Assistant
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearConversation}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            title="New conversation"
          >
            <RotateCcw className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            title="Close"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">{renderBody()}</div>

      {/* Input area - only show when authenticated */}
      {isAuthenticated && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-3">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question..."
              rows={1}
              disabled={isStreaming}
              className="flex-1 resize-none px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
