import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

Object.defineProperty(window, 'PointerEvent', { value: MouseEvent });
window.HTMLElement.prototype.hasPointerCapture = vi.fn() as unknown as typeof HTMLElement.prototype.hasPointerCapture;
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
window.HTMLElement.prototype.setPointerCapture = vi.fn();
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
  onPin: vi.fn() as (id: string, pinned: boolean) => void,
  onRename: vi.fn() as (id: string) => void,
  onDelete: vi.fn() as (id: string) => void,
  onSuggestName: vi.fn().mockResolvedValue("name") as (id: string) => Promise<string>,
};

beforeEach(() => {
  defaultProps.onResume = vi.fn();
  defaultProps.onNewSession = vi.fn();
  defaultProps.onBack = vi.fn();
  defaultProps.onPin = vi.fn();
  defaultProps.onRename = vi.fn();
  defaultProps.onDelete = vi.fn();
  defaultProps.onSuggestName = vi.fn().mockResolvedValue("name");
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

  it("calls onResume when Enter is pressed on a session row", () => {
    const onResume = vi.fn();
    const sessions = [makeSession({ id: "abc", name: "My chat", scope: workspaceScope })];
    render(
      <SessionHistoryView
        {...defaultProps}
        sessions={sessions}
        onResume={onResume}
        onPin={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
        onSuggestName={vi.fn().mockResolvedValue("name")}
      />
    );
    const row = screen.getByTestId("session-row-abc");
    const contentDiv = row.querySelector('[role="button"]') as HTMLElement;
    fireEvent.keyDown(contentDiv, { key: "Enter" });
    expect(onResume).toHaveBeenCalledWith("abc");
  });
});

describe("Pin icon hover behavior", () => {
  it("renders pin button for each session row", () => {
    const sessions = [makeSession({ id: "s1", name: "Chat", scope: workspaceScope, pinned: false })];
    render(
      <SessionHistoryView
        {...defaultProps}
        sessions={sessions}
        onPin={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
        onSuggestName={vi.fn().mockResolvedValue("name")}
      />
    );
    expect(screen.getByTestId("pin-btn-s1")).toBeInTheDocument();
  });

  it("calls onPin with toggled value when pin button clicked", () => {
    const onPin = vi.fn();
    const sessions = [makeSession({ id: "s1", name: "Chat", scope: workspaceScope, pinned: false })];
    render(
      <SessionHistoryView
        {...defaultProps}
        sessions={sessions}
        onPin={onPin}
        onRename={vi.fn()}
        onDelete={vi.fn()}
        onSuggestName={vi.fn().mockResolvedValue("name")}
      />
    );
    fireEvent.click(screen.getByTestId("pin-btn-s1"));
    expect(onPin).toHaveBeenCalledWith("s1", true);
  });

  it("calls onPin with false when pinned session pin button clicked", () => {
    const onPin = vi.fn();
    const sessions = [makeSession({ id: "s1", name: "Chat", scope: workspaceScope, pinned: true })];
    render(
      <SessionHistoryView
        {...defaultProps}
        sessions={sessions}
        onPin={onPin}
        onRename={vi.fn()}
        onDelete={vi.fn()}
        onSuggestName={vi.fn().mockResolvedValue("name")}
      />
    );
    fireEvent.click(screen.getByTestId("pin-btn-s1"));
    expect(onPin).toHaveBeenCalledWith("s1", false);
  });

  it("renders ellipsis button for each session row", () => {
    const sessions = [makeSession({ id: "s1", name: "Chat", scope: workspaceScope })];
    render(
      <SessionHistoryView
        {...defaultProps}
        sessions={sessions}
        onPin={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
        onSuggestName={vi.fn().mockResolvedValue("name")}
      />
    );
    expect(screen.getByTestId("ellipsis-btn-s1")).toBeInTheDocument();
  });
});

describe("Context menu", () => {
  const renderWithSession = (sessionOverrides?: Partial<Session>) => {
    const session = makeSession({ id: "s1", name: "Chat", scope: workspaceScope, ...sessionOverrides });
    const onPin = vi.fn();
    const onRename = vi.fn();
    const onDelete = vi.fn();
    render(
      <SessionHistoryView
        {...defaultProps}
        sessions={[session]}
        onPin={onPin}
        onRename={onRename}
        onDelete={onDelete}
        onSuggestName={vi.fn().mockResolvedValue("name")}
      />
    );
    return { onPin, onRename, onDelete };
  };

  const openDropdown = (testId: string) => {
    const btn = screen.getByTestId(testId);
    fireEvent.pointerDown(btn, { button: 0, ctrlKey: false });
    fireEvent.click(btn);
  };

  it("opens dropdown menu when ellipsis button is clicked", async () => {
    renderWithSession();
    openDropdown("ellipsis-btn-s1");
    expect(screen.getByRole("menuitem", { name: /pin/i })).toBeInTheDocument();
  });

  it("shows Unpin when session is pinned", async () => {
    renderWithSession({ pinned: true });
    openDropdown("ellipsis-btn-s1");
    expect(screen.getByRole("menuitem", { name: /unpin/i })).toBeInTheDocument();
  });

  it("clicking Pin menu item calls onPin", async () => {
    const { onPin } = renderWithSession({ pinned: false });
    openDropdown("ellipsis-btn-s1");
    fireEvent.click(screen.getByRole("menuitem", { name: /^pin$/i }));
    expect(onPin).toHaveBeenCalledWith("s1", true);
  });

  it("clicking Rename menu item calls onRename", async () => {
    const { onRename } = renderWithSession();
    openDropdown("ellipsis-btn-s1");
    fireEvent.click(screen.getByRole("menuitem", { name: /rename/i }));
    expect(onRename).toHaveBeenCalledWith("s1");
  });

  it("clicking Delete menu item calls onDelete", async () => {
    const { onDelete } = renderWithSession();
    openDropdown("ellipsis-btn-s1");
    fireEvent.click(screen.getByRole("menuitem", { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith("s1");
  });
});
