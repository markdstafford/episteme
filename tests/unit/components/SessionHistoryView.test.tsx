import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SessionHistoryView } from "@/components/SessionHistoryView";
import type { Session, SessionScope } from "@/lib/session";

function makeSession(overrides: Partial<Session> & { id: string; name: string }): Session {
  return {
    created_at: "2026-01-15T14:00:00Z",
    last_active_at: "2026-01-15T14:00:00Z",
    last_mode: "view",
    scope: { type: "workspace" },
    pinned: false,
    messages_all: [],
    messages_compacted: [],
    ...overrides,
  };
}

const workspaceScope: SessionScope = { type: "workspace" };
const docScope: SessionScope = { type: "document", path: "/workspace/doc.md" };

const defaultProps = {
  sessions: [] as Session[],
  currentSessionId: null as string | null,
  currentScope: workspaceScope,
  onResume: vi.fn(),
  onNewSession: vi.fn(),
  onBack: vi.fn(),
};

beforeEach(() => {
  defaultProps.onResume = vi.fn();
  defaultProps.onNewSession = vi.fn();
  defaultProps.onBack = vi.fn();
});

describe("SessionHistoryView", () => {
  it("renders sessions matching current scope", () => {
    const sessions = [
      makeSession({ id: "1", name: "First chat", scope: workspaceScope }),
      makeSession({ id: "2", name: "Doc chat", scope: docScope }),
    ];
    render(<SessionHistoryView {...defaultProps} sessions={sessions} currentScope={workspaceScope} />);
    expect(screen.getByText("First chat")).toBeInTheDocument();
    expect(screen.queryByText("Doc chat")).not.toBeInTheDocument();
  });

  it("excludes sessions outside the current scope", () => {
    const sessions = [
      makeSession({ id: "1", name: "Workspace chat", scope: workspaceScope }),
      makeSession({ id: "2", name: "Doc chat", scope: docScope }),
    ];
    render(<SessionHistoryView {...defaultProps} sessions={sessions} currentScope={docScope} />);
    expect(screen.getByText("Doc chat")).toBeInTheDocument();
    expect(screen.queryByText("Workspace chat")).not.toBeInTheDocument();
  });

  it("filters document sessions by exact path", () => {
    const otherDocScope: SessionScope = { type: "document", path: "/workspace/other.md" };
    const sessions = [
      makeSession({ id: "1", name: "This doc", scope: docScope }),
      makeSession({ id: "2", name: "Other doc", scope: otherDocScope }),
    ];
    render(<SessionHistoryView {...defaultProps} sessions={sessions} currentScope={docScope} />);
    expect(screen.getByText("This doc")).toBeInTheDocument();
    expect(screen.queryByText("Other doc")).not.toBeInTheDocument();
  });

  it("calls onResume with session id when a row is clicked", () => {
    const onResume = vi.fn();
    const sessions = [makeSession({ id: "abc", name: "My chat", scope: workspaceScope })];
    render(<SessionHistoryView {...defaultProps} sessions={sessions} onResume={onResume} />);
    fireEvent.click(screen.getByText("My chat"));
    expect(onResume).toHaveBeenCalledWith("abc");
  });

  it("calls onNewSession when + new button is clicked", () => {
    const onNewSession = vi.fn();
    render(<SessionHistoryView {...defaultProps} onNewSession={onNewSession} />);
    fireEvent.click(screen.getByRole("button", { name: /new/i }));
    expect(onNewSession).toHaveBeenCalledTimes(1);
  });

  it("calls onBack when back button is clicked", () => {
    const onBack = vi.fn();
    render(<SessionHistoryView {...defaultProps} onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("shows accent indicator on the current session row", () => {
    const sessions = [
      makeSession({ id: "current", name: "Active chat", scope: workspaceScope }),
      makeSession({ id: "other", name: "Other chat", scope: workspaceScope }),
    ];
    render(<SessionHistoryView {...defaultProps} sessions={sessions} currentSessionId="current" />);
    const activeRow = screen.getByTestId("session-row-current");
    expect(activeRow).toHaveAttribute("data-current", "true");
  });

  it("renders empty state when no sessions match scope", () => {
    const sessions = [makeSession({ id: "1", name: "Doc chat", scope: docScope })];
    render(<SessionHistoryView {...defaultProps} sessions={sessions} currentScope={workspaceScope} />);
    expect(screen.getByText(/no conversations yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start a conversation/i })).toBeInTheDocument();
  });

  it("calls onNewSession when empty state CTA is clicked", () => {
    const onNewSession = vi.fn();
    render(<SessionHistoryView {...defaultProps} sessions={[]} onNewSession={onNewSession} />);
    fireEvent.click(screen.getByRole("button", { name: /start a conversation/i }));
    expect(onNewSession).toHaveBeenCalledTimes(1);
  });
});
