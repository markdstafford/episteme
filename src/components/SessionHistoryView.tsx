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
    <div className="w-96 flex flex-col h-full border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            aria-label="Back"
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </button>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Conversation history
          </span>
        </div>
        <button
          onClick={onNewSession}
          aria-label="New conversation"
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
        >
          <Plus className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">No conversations yet</p>
            <button
              onClick={onNewSession}
              className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
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
                  className="flex items-stretch cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800"
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
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {session.name || "Untitled"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                        {session.last_mode}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
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
