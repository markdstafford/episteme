import { ChatMessage as ChatMessageType } from "@/stores/aiChat";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[85%] px-4 py-2 rounded-[--radius-md] ${
          isUser
            ? "bg-[--color-accent] text-[--color-text-on-accent]"
            : "bg-[--color-bg-subtle] text-[--color-text-primary]"
        }`}
      >
        {isUser ? (
          <p className="text-[--font-size-ui-base] whitespace-pre-wrap">
            {message.content}
          </p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <MarkdownRenderer content={message.content} />
          </div>
        )}
      </div>
    </div>
  );
}
