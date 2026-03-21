import { ArrowLeft, Plus, Pin, PinOff, Ellipsis, Loader2, Sparkles } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { type Session, type SessionScope } from "@/lib/session";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as ContextMenu from "@radix-ui/react-context-menu";

interface SessionHistoryViewProps {
  sessions: Session[];
  currentSessionId: string | null;
  currentScope: SessionScope;
  onResume: (id: string) => void;
  onNewSession: () => void;
  onBack: () => void;
  onPin: (id: string, pinned: boolean) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onSuggestName: (id: string) => Promise<string>;
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dateStart.getTime() === todayStart.getTime()) {
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const period = hours >= 12 ? "pm" : "am";
    const displayHours = hours % 12 || 12;
    return `Today, ${displayHours}:${minutes}${period}`;
  }
  if (dateStart.getTime() === yesterdayStart.getTime()) {
    return "Yesterday";
  }
  return date.toLocaleDateString();
}

function matchesScope(session: Session, scope: SessionScope): boolean {
  if (session.scope.type !== scope.type) return false;
  if (scope.type === "document" && session.scope.type === "document") {
    return session.scope.path === scope.path;
  }
  return true;
}

export function SessionHistoryView({
  sessions,
  currentSessionId,
  currentScope,
  onResume,
  onNewSession,
  onBack,
  onPin,
  onRename,
  onDelete,
  onSuggestName,
}: SessionHistoryViewProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isSuggestingId, setIsSuggestingId] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const originalRenameValueRef = useRef("");
  const renameCommittedRef = useRef(false);
  const skipNextBlurRef = useRef(false);
  const prevIsSuggestingIdRef = useRef<string | null>(null);

  // Focus the input when rename mode is entered.
  // requestAnimationFrame defers until after Radix's setTimeout(0) focus
  // restoration, so focus sticks. It also doesn't run inside React's act(),
  // so tests are unaffected.
  useEffect(() => {
    if (renamingId !== null) {
      const raf = requestAnimationFrame(() => {
        renameInputRef.current?.focus();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [renamingId]);

  // Focus the input after AI suggestion completes (input was disabled during loading)
  useEffect(() => {
    if (prevIsSuggestingIdRef.current !== null && isSuggestingId === null && renamingId !== null) {
      renameInputRef.current?.focus();
    }
    prevIsSuggestingIdRef.current = isSuggestingId;
  }, [isSuggestingId, renamingId]);

  const filtered = sessions
    .filter((s) => matchesScope(s, currentScope))
    .sort((a, b) => (b.last_active_at > a.last_active_at ? 1 : -1));

  return (
    <div className="w-96 flex flex-col h-full border-l border-(--color-border-subtle) bg-(--color-bg-base)">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-(--height-titlebar) border-b border-(--color-border-subtle) flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            aria-label="Back"
            className="size-7 flex items-center justify-center hover:bg-(--color-bg-hover) rounded-(--radius-base)"
          >
            <ArrowLeft className="w-4 h-4 text-(--color-text-tertiary)" />
          </button>
          <span className="text-[length:var(--font-size-ui-md)] font-medium text-(--color-text-primary)">
            Conversation history
          </span>
        </div>
        <button
          onClick={onNewSession}
          aria-label="New conversation"
          className="size-7 flex items-center justify-center hover:bg-(--color-bg-hover) rounded-(--radius-base)"
        >
          <Plus className="w-4 h-4 text-(--color-text-tertiary)" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
            <p className="text-[length:var(--font-size-ui-base)] text-(--color-text-tertiary)">
              No conversations yet
            </p>
            <button
              onClick={onNewSession}
              className="px-3 py-1.5 text-[length:var(--font-size-ui-base)] text-(--color-accent) border border-(--color-border-subtle) rounded-(--radius-base) hover:bg-(--color-bg-hover) transition-colors duration-(--duration-fast)"
            >
              Start a conversation
            </button>
          </div>
        ) : (
          <ul>
            {filtered.map((session) => {
              const isCurrent = session.id === currentSessionId;
              return (
                <ContextMenu.Root key={session.id}>
                  <ContextMenu.Trigger asChild>
                    <li
                      data-testid={`session-row-${session.id}`}
                      data-current={isCurrent ? "true" : undefined}
                      className="group flex items-stretch border-b border-(--color-border-subtle)"
                    >
                      {deletingId === session.id ? (
                        // Inline delete confirmation — avoids Portal/overflow/DismissableLayer conflicts
                        <div
                          className="flex-1 flex items-center gap-2 px-3 py-2 bg-(--color-bg-hover)"
                          onClick={e => e.stopPropagation()}
                          onKeyDown={e => { if (e.key === "Escape") setDeletingId(null); }}
                        >
                          <span className="text-[length:var(--font-size-ui-xs)] text-(--color-text-secondary) flex-1 min-w-0">
                            {currentSessionId === session.id
                              ? "This is your active conversation. Deleting it will start a new one."
                              : "Delete this conversation?"}
                          </span>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="px-1.5 py-0.5 text-[length:var(--font-size-ui-xs)] text-(--color-text-secondary) hover:bg-(--color-bg-subtle) rounded-(--radius-sm) flex-shrink-0"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => { onDelete(session.id); setDeletingId(null); }}
                            className="px-1.5 py-0.5 text-[length:var(--font-size-ui-xs)] text-(--color-state-danger) hover:bg-(--color-bg-subtle) rounded-(--radius-sm) flex-shrink-0"
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* Accent left border */}
                          <div style={{ width: 3, flexShrink: 0, backgroundColor: isCurrent ? "var(--color-accent)" : "transparent" }} />

                          {/* Pin icon */}
                          <button
                            data-testid={`pin-btn-${session.id}`}
                            onClick={(e) => { e.stopPropagation(); onPin(session.id, !session.pinned); }}
                            aria-label={session.pinned ? "Unpin session" : "Pin session"}
                            className={`flex items-center justify-center w-6 flex-shrink-0 self-stretch transition-opacity duration-(--duration-fast) ${session.pinned ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                          >
                            {session.pinned
                              ? <PinOff className="w-3 h-3 text-(--color-accent)" />
                              : <Pin className="w-3 h-3 text-(--color-text-tertiary)" />
                            }
                          </button>

                          {/* Row content */}
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => onResume(session.id)}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onResume(session.id); } }}
                            className="flex-1 px-2 py-3 min-w-0"
                          >
                            {renamingId === session.id ? (
                              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                <input
                                  autoFocus
                                  ref={renameInputRef}
                                  className="flex-1 min-w-0 text-[length:var(--font-size-ui-base)] bg-(--color-bg-subtle) border border-(--color-border-subtle) rounded-(--radius-sm) px-1.5 py-0.5 text-(--color-text-primary) outline-none focus:border-(--color-accent)"
                                  value={renameValue}
                                  onChange={e => setRenameValue(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === "Enter") {
                                      renameCommittedRef.current = true;
                                      if (renameValue !== originalRenameValueRef.current) {
                                        onRename(session.id, renameValue);
                                      }
                                      setRenamingId(null);
                                    } else if (e.key === "Escape") {
                                      renameCommittedRef.current = true;
                                      setRenamingId(null);
                                    }
                                  }}
                                  onBlur={() => {
                                    if (skipNextBlurRef.current) {
                                      skipNextBlurRef.current = false;
                                      // Radix stole focus — suppressed; useEffect will re-focus
                                      return;
                                    }
                                    if (renameCommittedRef.current) {
                                      renameCommittedRef.current = false;
                                      return;
                                    }
                                    // Natural blur (clicked outside) → discard
                                    setRenamingId(null);
                                  }}
                                />
                                <button
                                  data-testid={`suggest-btn-${session.id}`}
                                  disabled={session.messages_compacted.length === 0 || isSuggestingId === session.id}
                                  onMouseDown={() => { skipNextBlurRef.current = true; }}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    skipNextBlurRef.current = true; // also set in onClick for test environments where mouseDown doesn't fire
                                    setIsSuggestingId(session.id);
                                    try {
                                      const suggested = await Promise.race([
                                        onSuggestName(session.id),
                                        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timed out")), 5000)),
                                      ]);
                                      setRenameValue(suggested);
                                    } catch {
                                      // Timed out or errored — leave the field as-is
                                    } finally {
                                      setIsSuggestingId(null);
                                    }
                                  }}
                                  className="flex items-center justify-center w-6 h-6 flex-shrink-0 rounded-(--radius-sm) hover:bg-(--color-bg-hover) disabled:opacity-40 disabled:cursor-not-allowed"
                                  aria-label="Suggest name with AI"
                                >
                                  {isSuggestingId === session.id
                                    ? <Loader2 className="w-3 h-3 animate-spin text-(--color-text-tertiary)" />
                                    : <Sparkles className="w-3 h-3 text-(--color-text-tertiary)" />
                                  }
                                </button>
                              </div>
                            ) : (
                              <p className="text-[length:var(--font-size-ui-base)] font-medium text-(--color-text-primary) truncate">
                                {session.name || "Untitled"}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[length:var(--font-size-ui-xs)] px-1.5 py-0.5 rounded-(--radius-sm) bg-(--color-bg-subtle) text-(--color-text-secondary)">
                                {session.last_mode}
                              </span>
                              <span className="text-[length:var(--font-size-ui-xs)] text-(--color-text-quaternary)">
                                {formatRelativeTime(session.last_active_at)}
                              </span>
                            </div>
                          </div>

                          {/* Ellipsis — DropdownMenu trigger */}
                          <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                              <button
                                data-testid={`ellipsis-btn-${session.id}`}
                                onClick={(e) => e.stopPropagation()}
                                aria-label="Session options"
                                className="flex items-center justify-center w-7 flex-shrink-0 self-stretch opacity-0 group-hover:opacity-100 transition-opacity duration-(--duration-fast)"
                              >
                                <Ellipsis className="w-4 h-4 text-(--color-text-tertiary)" />
                              </button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Portal>
                              <DropdownMenu.Content
                                className="min-w-36 bg-(--color-bg-elevated) border border-(--color-border-subtle) rounded-(--radius-base) shadow-(--shadow-md) p-1 z-50"
                                align="end"
                              >
                                <DropdownMenu.Item
                                  className="px-3 py-1.5 text-[length:var(--font-size-ui-base)] text-(--color-text-primary) cursor-pointer hover:bg-(--color-bg-hover) outline-none rounded-(--radius-sm)"
                                  onSelect={() => onPin(session.id, !session.pinned)}
                                >
                                  {session.pinned ? "Unpin" : "Pin"}
                                </DropdownMenu.Item>
                                <DropdownMenu.Item
                                  className="px-3 py-1.5 text-[length:var(--font-size-ui-base)] text-(--color-text-primary) cursor-pointer hover:bg-(--color-bg-hover) outline-none rounded-(--radius-sm)"
                                  onSelect={() => { skipNextBlurRef.current = true; originalRenameValueRef.current = session.name; setRenamingId(session.id); setRenameValue(session.name); }}
                                >
                                  Rename
                                </DropdownMenu.Item>
                                <DropdownMenu.Item
                                  className="px-3 py-1.5 text-[length:var(--font-size-ui-base)] text-(--color-state-danger) cursor-pointer hover:bg-(--color-bg-hover) outline-none rounded-(--radius-sm)"
                                  onSelect={() => setDeletingId(session.id)}
                                >
                                  Delete
                                </DropdownMenu.Item>
                              </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                          </DropdownMenu.Root>
                      </>
                      )}
                    </li>
                  </ContextMenu.Trigger>
                  <ContextMenu.Portal>
                    <ContextMenu.Content
                      className="min-w-36 bg-(--color-bg-elevated) border border-(--color-border-subtle) rounded-(--radius-base) shadow-(--shadow-md) p-1 z-50"
                    >
                      <ContextMenu.Item
                        className="px-3 py-1.5 text-[length:var(--font-size-ui-base)] text-(--color-text-primary) cursor-pointer hover:bg-(--color-bg-hover) outline-none rounded-(--radius-sm)"
                        onSelect={() => onPin(session.id, !session.pinned)}
                      >
                        {session.pinned ? "Unpin" : "Pin"}
                      </ContextMenu.Item>
                      <ContextMenu.Item
                        className="px-3 py-1.5 text-[length:var(--font-size-ui-base)] text-(--color-text-primary) cursor-pointer hover:bg-(--color-bg-hover) outline-none rounded-(--radius-sm)"
                        onSelect={() => { skipNextBlurRef.current = true; originalRenameValueRef.current = session.name; setRenamingId(session.id); setRenameValue(session.name); }}
                      >
                        Rename
                      </ContextMenu.Item>
                      <ContextMenu.Item
                        className="px-3 py-1.5 text-[length:var(--font-size-ui-base)] text-(--color-state-danger) cursor-pointer hover:bg-(--color-bg-hover) outline-none rounded-(--radius-sm)"
                        onSelect={() => setDeletingId(session.id)}
                      >
                        Delete
                      </ContextMenu.Item>
                    </ContextMenu.Content>
                  </ContextMenu.Portal>
                </ContextMenu.Root>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
