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
    const maxHeight = panel ? panel.offsetHeight * 0.5 : 9999;
    textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + "px";
  }, [value]);

  const canSend = value.trim().length > 0 && !isStreaming;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && canSend) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="rounded-[--radius-xl] border border-[--color-border-default] focus-within:border-[--color-accent] focus-within:shadow-[0_0_0_2px_color-mix(in_oklch,var(--color-accent)_25%,transparent)]">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask a question..."
        rows={1}
        disabled={isStreaming}
        data-ui-input
        className="w-full resize-none bg-transparent border-none outline-none px-3 pt-3 text-[--font-size-ui-base] text-[--color-text-primary] overflow-y-auto disabled:opacity-50"
      />
      <div className="flex items-center justify-between px-2 py-1.5 border-t border-[--color-border-default]">
        <div>{modeButton}</div>
        <button
          onClick={onSend}
          disabled={!canSend}
          aria-label="Send message"
          className="bg-[--color-accent] hover:bg-[--color-accent-hover] text-[--color-text-on-accent] rounded-[--radius-base] p-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
