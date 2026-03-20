import { useRef, useEffect, ReactNode, RefObject } from "react";
import { ArrowUp } from "lucide-react";

interface ChatInputCardProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isStreaming: boolean;
  modeButton?: ReactNode;
  panelRef: RefObject<HTMLDivElement | null>;
}

export function ChatInputCard({
  value,
  onChange,
  onSend,
  isStreaming,
  modeButton,
  panelRef,
}: ChatInputCardProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    const panel = panelRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const maxHeight = panel ? panel.offsetHeight * 0.5 : Infinity;
    textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + "px";
  }, [value, panelRef]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const canSend = value.trim().length > 0 && !isStreaming;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-blue-500">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask a question..."
        rows={1}
        disabled={isStreaming}
        className="w-full resize-none bg-transparent border-none outline-none px-3 pt-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 overflow-y-auto disabled:opacity-50"
      />
      <div className="flex items-center justify-between px-2 py-1.5 border-t border-gray-200 dark:border-gray-700">
        <div>{modeButton}</div>
        <button
          onClick={onSend}
          disabled={!canSend}
          aria-label="Send message"
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
