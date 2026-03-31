import { useState } from "react";
import { MessagesSquare, X, Pin, PinOff, OctagonX } from "lucide-react";
import { useThreadsStore } from "@/stores/threads";
import type { Thread } from "@/types/comments";
import { relativeTime } from "@/lib/relativeTime";

function threadBorderClass(thread: Thread): string {
  if (thread.status === "resolved")
    return "border-l-[3px] border-(--color-state-success)";
  if (thread.blocking)
    return "border-l-[3px] border-(--color-state-danger)";
  return "border-l-[3px] border-(--color-state-warning)";
}

function sortThreads(threads: Thread[]): Thread[] {
  const pinned = threads
    .filter((t) => t.pinned)
    .sort((a, b) => a.anchor_from - b.anchor_from);
  const unpinned = threads
    .filter((t) => !t.pinned)
    .sort((a, b) => a.anchor_from - b.anchor_from);
  return [...pinned, ...unpinned];
}

export interface ThreadsViewProps {
  onClose: () => void;
  onThreadClick: (threadId: string) => void;
  activeThreadId?: string;
  /** When provided, only show these thread IDs (filtered mode for overlapping clicks) */
  filterThreadIds?: string[];
}

export function ThreadsView({
  onClose,
  onThreadClick,
  activeThreadId,
  filterThreadIds,
}: ThreadsViewProps) {
  const { threads, togglePinned } = useThreadsStore();
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const displayThreads = filterThreadIds
    ? threads.filter((t) => filterThreadIds.includes(t.id))
    : threads;

  const sorted = sortThreads(displayThreads);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-(--color-border-subtle)">
        <MessagesSquare size={14} className="text-(--color-text-secondary)" />
        <span className="flex-1 text-[length:var(--font-size-ui-sm)] font-medium">
          {filterThreadIds
            ? `Showing ${sorted.length} thread${sorted.length !== 1 ? "s" : ""} at this location`
            : "Threads"}
        </span>
        <button
          onClick={onClose}
          className="text-(--color-text-tertiary) hover:text-(--color-text-secondary)"
        >
          <X size={14} />
        </button>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="px-3 py-4 text-[length:var(--font-size-ui-sm)] text-(--color-text-tertiary)">
            No threads yet.
          </div>
        ) : (
          sorted.map((thread) => {
            const lastCommentTime = thread.comments.length > 0
              ? thread.comments[thread.comments.length - 1].created_at
              : null;
            const lastEventTime = thread.events.length > 0
              ? thread.events[thread.events.length - 1].changed_at
              : null;
            const lastActivity = [lastCommentTime, lastEventTime, thread.created_at]
              .filter((t): t is string => t !== null)
              .sort()
              .at(-1)!;
            const participants = Array.from(
              new Set(thread.comments.map((c) => c.author)),
            );
            const isActive = thread.id === activeThreadId;

            return (
              <div
                key={thread.id}
                onClick={() => onThreadClick(thread.id)}
                onMouseEnter={() => setHoveredRow(thread.id)}
                onMouseLeave={() => setHoveredRow(null)}
                className={`pl-3 pr-3 py-2 border-b border-(--color-border-subtle) cursor-pointer ${threadBorderClass(thread)} ${isActive ? "bg-(--color-bg-subtle)" : "hover:bg-(--color-bg-hover)"}`}
              >
                <div className="flex items-start gap-1">
                  {/* Pin icon */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePinned(thread.id);
                    }}
                    className={`mt-0.5 text-(--color-text-tertiary) flex-shrink-0 ${
                      thread.pinned || hoveredRow === thread.id
                        ? "visible"
                        : "invisible"
                    }`}
                  >
                    {thread.pinned ? <PinOff size={10} /> : <Pin size={10} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    {/* First line: blocking indicator + snippet */}
                    <div className="flex items-center gap-1 text-[length:var(--font-size-ui-sm)]">
                      {thread.blocking && thread.status === "open" && (
                        <OctagonX
                          size={10}
                          className="text-(--color-state-danger) flex-shrink-0"
                        />
                      )}
                      <span
                        className={`truncate ${thread.status === "resolved" ? "text-(--color-text-tertiary)" : ""}`}
                      >
                        "
                        {thread.quoted_text.slice(0, 50)}
                        {thread.quoted_text.length > 50 ? "…" : ""}
                        "
                      </span>
                      {thread.anchor_stale && (
                        <span className="ml-1 text-[length:var(--font-size-ui-xs)] text-(--color-text-tertiary) italic flex-shrink-0">
                          (anchor lost)
                        </span>
                      )}
                    </div>
                    {/* Second line: participants + time + resolved */}
                    <div className="flex items-center gap-1 text-[length:var(--font-size-ui-xs)] text-(--color-text-tertiary) mt-0.5">
                      <div className="flex -space-x-1">
                        {participants.slice(0, 3).map((p) => (
                          <div
                            key={p}
                            className="w-4 h-4 rounded-full bg-(--color-accent) flex items-center justify-center text-[8px] text-(--color-text-on-accent) border border-(--color-bg-base)"
                          >
                            {p[0]?.toUpperCase()}
                          </div>
                        ))}
                        {participants.length > 3 && (
                          <div className="w-4 h-4 rounded-full bg-(--color-bg-subtle) flex items-center justify-center text-[8px] border border-(--color-bg-base)">
                            +{participants.length - 3}
                          </div>
                        )}
                      </div>
                      <span>·</span>
                      <span>{relativeTime(lastActivity)}</span>
                      {thread.status === "resolved" && (
                        <>
                          <span>·</span>
                          <span>resolved</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
