import { ArrowLeft, Plus } from "lucide-react";
import { type Session, type SessionScope } from "@/lib/session";

interface SessionHistoryViewProps {
  sessions: Session[];
  currentSessionId: string | null;
  currentScope: SessionScope;
  onResume: (id: string) => void;
  onNewSession: () => void;
  onBack: () => void;
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
}: SessionHistoryViewProps) {
  const filtered = sessions
    .filter((s) => matchesScope(s, currentScope))
    .sort((a, b) => (b.last_active_at > a.last_active_at ? 1 : -1));

  return (
    <div className="w-96 flex flex-col h-full border-l border-(--color-border-subtle) bg-(--color-bg-base)">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-(--color-border-subtle) flex-shrink-0">
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
                <li
                  key={session.id}
                  data-testid={`session-row-${session.id}`}
                  data-current={isCurrent ? "true" : undefined}
                  role="button"
                  tabIndex={0}
                  onClick={() => onResume(session.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onResume(session.id);
                    }
                  }}
                  className="flex items-stretch cursor-pointer hover:bg-(--color-bg-hover) border-b border-(--color-border-subtle)"
                >
                  {/* Accent left border for current session */}
                  <div
                    style={{
                      width: 3,
                      flexShrink: 0,
                      backgroundColor: isCurrent ? "var(--color-accent)" : "transparent",
                    }}
                  />
                  <div className="flex-1 px-3 py-3 min-w-0">
                    <p className="text-[length:var(--font-size-ui-base)] font-medium text-(--color-text-primary) truncate">
                      {session.name || "Untitled"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[length:var(--font-size-ui-xs)] px-1.5 py-0.5 rounded-(--radius-sm) bg-(--color-bg-subtle) text-(--color-text-secondary)">
                        {session.last_mode}
                      </span>
                      <span className="text-[length:var(--font-size-ui-xs)] text-(--color-text-quaternary)">
                        {formatRelativeTime(session.last_active_at)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
