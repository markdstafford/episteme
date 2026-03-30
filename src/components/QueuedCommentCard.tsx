import { X, OctagonX } from "lucide-react";

interface QueuedCommentCardProps {
  displayBody: string;
  bodyEnhanced: string | null;
  useEnhanced: boolean;
  blocking: boolean;
  countdown: number;
  countdownSeconds: number;
  processing?: boolean;
  error?: string | null;
  onToggleBody: () => void;
  onCancel: () => void;
  onSetBlocking: (v: boolean) => void;
  onRetry?: () => void;
  testId?: string;
  className?: string; // applied to the bordered card div
}

export function QueuedCommentCard({
  displayBody,
  bodyEnhanced,
  useEnhanced,
  blocking,
  countdown,
  countdownSeconds,
  processing,
  error,
  onToggleBody,
  onCancel,
  onSetBlocking,
  onRetry,
  testId,
  className,
}: QueuedCommentCardProps) {
  return (
    <>
      {processing ? (
        <div className="px-3 py-2 rounded-(--radius-base) bg-(--color-bg-subtle) text-(--color-text-tertiary) text-[length:var(--font-size-ui-sm)]">
          ✨ Enhancing…
        </div>
      ) : (
        <div
          data-testid={testId}
          className={`border border-(--color-border-subtle) rounded-(--radius-base) p-3 space-y-2${className ? ` ${className}` : ""}`}
        >
          <div className="text-[length:var(--font-size-ui-sm)]">
            {displayBody}
          </div>
          {error && (
            <div className="text-[length:var(--font-size-ui-xs)] text-(--color-state-danger) flex items-center justify-between gap-2">
              <span>{error}</span>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="underline shrink-0"
                >
                  Retry
                </button>
              )}
            </div>
          )}
          <div className="flex items-center justify-between">
            {/* AI/Raw toggle — only shown when bodyEnhanced is available */}
            {bodyEnhanced && (
              <div className="flex rounded-(--radius-sm) border border-(--color-border-subtle) overflow-hidden text-[length:var(--font-size-ui-xs)]">
                <button
                  onClick={() => { if (useEnhanced) { return; } onToggleBody(); }}
                  className={`px-2 py-1 ${useEnhanced ? "bg-(--color-accent) text-(--color-text-on-accent)" : ""}`}
                >
                  ✨
                </button>
                <button
                  onClick={() => { if (!useEnhanced) { return; } onToggleBody(); }}
                  className={`px-2 py-1 ${!useEnhanced ? "bg-(--color-accent) text-(--color-text-on-accent)" : ""}`}
                >
                  👤
                </button>
              </div>
            )}
            {/* Countdown pill */}
            <button
              onClick={onCancel}
              className="flex items-center gap-1 px-2 py-1 rounded-(--radius-sm) border border-(--color-border-subtle) text-[length:var(--font-size-ui-xs)] text-(--color-text-tertiary)"
            >
              <X size={10} />
              <div className="w-16 h-1 bg-(--color-bg-subtle) rounded-full overflow-hidden">
                <div
                  className="h-full bg-(--color-accent) transition-all duration-1000"
                  style={{ width: `${(countdown / countdownSeconds) * 100}%` }}
                />
              </div>
              <span>{countdown}s</span>
            </button>
          </div>
        </div>
      )}

      {/* Blocking toggle (below the bordered card) */}
      {!processing && (
        <div className="px-3 py-1">
          <button
            onClick={() => onSetBlocking(!blocking)}
            className={`flex items-center gap-1 text-[length:var(--font-size-ui-xs)] ${blocking ? "text-(--color-state-danger)" : "text-(--color-text-tertiary)"}`}
          >
            <OctagonX size={12} />
            <span>{blocking ? "Blocking" : "Mark as blocking"}</span>
          </button>
        </div>
      )}
    </>
  );
}
