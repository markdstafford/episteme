import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ThreadsView } from "@/components/ThreadsView";
import type { Thread } from "@/types/comments";
import { useThreadsStore } from "@/stores/threads";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@/stores/threads", () => ({
  useThreadsStore: vi.fn(() => ({ togglePinned: vi.fn(), threads: [] })),
}));
const mockStore = vi.mocked(useThreadsStore);

function makeThread(overrides: Partial<Thread>): Thread {
  return {
    id: "t1",
    doc_id: "d1",
    quoted_text: "the retry queue",
    anchor_from: 0,
    anchor_to: 15,
    anchor_stale: false,
    status: "open",
    blocking: false,
    pinned: false,
    created_at: "2026-01-01",
    comments: [
      {
        id: "c1",
        thread_id: "t1",
        body: "Q",
        author: "alice",
        created_at: "2026-01-01",
      },
    ],
    events: [
      { id: "e1", thread_id: "t1", event: "open", changed_by: "alice", changed_at: "2026-01-01" },
    ],
    ...overrides,
  };
}

const defaultProps = { onClose: vi.fn(), onThreadClick: vi.fn() };

describe("ThreadsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders header with Threads label", () => {
    mockStore.mockReturnValue({ togglePinned: vi.fn(), threads: [] } as any);
    render(<ThreadsView {...defaultProps} />);
    expect(screen.getByText("Threads")).toBeInTheDocument();
  });

  it("shows empty state when no threads", () => {
    mockStore.mockReturnValue({ togglePinned: vi.fn(), threads: [] } as any);
    render(<ThreadsView {...defaultProps} />);
    expect(screen.getByText(/no threads/i)).toBeInTheDocument();
  });

  it("renders thread row with anchor snippet", () => {
    mockStore.mockReturnValue({
      togglePinned: vi.fn(),
      threads: [makeThread({})],
    } as any);
    render(<ThreadsView {...defaultProps} />);
    expect(screen.getByText(/"the retry queue"/)).toBeInTheDocument();
  });

  it("shows resolved label for resolved threads", () => {
    mockStore.mockReturnValue({
      togglePinned: vi.fn(),
      threads: [makeThread({ status: "resolved" })],
    } as any);
    render(<ThreadsView {...defaultProps} />);
    expect(screen.getByText("resolved")).toBeInTheDocument();
  });

  it("threads sorted by anchor_from ascending", () => {
    const threads = [
      makeThread({ id: "t2", anchor_from: 20, quoted_text: "second" }),
      makeThread({ id: "t1", anchor_from: 0, quoted_text: "first" }),
    ];
    mockStore.mockReturnValue({ togglePinned: vi.fn(), threads } as any);
    render(<ThreadsView {...defaultProps} />);
    const rows = screen.getAllByText(/"(first|second)"/);
    expect(rows[0].textContent).toContain("first");
    expect(rows[1].textContent).toContain("second");
  });

  it("pinned threads appear before unpinned", () => {
    const threads = [
      makeThread({ id: "t1", anchor_from: 0, quoted_text: "unpinned", pinned: false }),
      makeThread({ id: "t2", anchor_from: 50, quoted_text: "pinned", pinned: true }),
    ];
    mockStore.mockReturnValue({ togglePinned: vi.fn(), threads } as any);
    render(<ThreadsView {...defaultProps} />);
    const rows = screen.getAllByText(/"(pinned|unpinned)"/);
    expect(rows[0].textContent).toContain("pinned");
  });

  it("filtered mode shows only specified thread ids", () => {
    const threads = [
      makeThread({ id: "t1", quoted_text: "visible" }),
      makeThread({ id: "t2", quoted_text: "hidden" }),
    ];
    mockStore.mockReturnValue({ togglePinned: vi.fn(), threads } as any);
    render(<ThreadsView {...defaultProps} filterThreadIds={["t1"]} />);
    expect(screen.getByText(/"visible"/)).toBeInTheDocument();
    expect(screen.queryByText(/"hidden"/)).toBeNull();
  });
});
