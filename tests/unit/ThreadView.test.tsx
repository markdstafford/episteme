import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ThreadView } from "@/components/ThreadView";
import type { Thread } from "@/types/comments";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@/stores/threads", () => ({
  useThreadsStore: vi.fn(() => ({
    resolveThread: vi.fn(),
    reopenThread: vi.fn(),
    toggleBlocking: vi.fn(),
    stageComment: vi.fn(),
    commitComment: vi.fn(),
  })),
}));
vi.mock("@/lib/commentAiFix", () => ({ suggestFix: vi.fn() }));
vi.mock("@radix-ui/react-popover", () => ({
  Root: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Trigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>,
  Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Content: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import React from "react";

function makeThread(overrides: Partial<Thread> = {}): Thread {
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
    created_at: "2026-01-01T00:00:00Z",
    comments: [
      {
        id: "c1",
        thread_id: "t1",
        body: "This looks wrong",
        author: "raquel",
        created_at: "2026-01-01T01:00:00Z",
      },
    ],
    events: [
      {
        id: "e1",
        thread_id: "t1",
        event: "open",
        changed_by: "raquel",
        changed_at: "2026-01-01T01:00:00Z",
      },
    ],
    ...overrides,
  };
}

const defaultProps = {
  thread: makeThread(),
  currentUser: "eric",
  docAuthor: "eric",
  onBack: vi.fn(),
  onClose: vi.fn(),
  onNavigatePrev: undefined,
  onNavigateNext: undefined,
  awsProfile: "default",
  docContent: "the retry queue is slow",
  docFilePath: "/ws/doc.md",
};

describe("ThreadView", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders quoted text in header", () => {
    render(<ThreadView {...defaultProps} />);
    // Quoted text appears in header and quoted block
    const elements = screen.getAllByText(/"the retry queue"/);
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders comment text", () => {
    render(<ThreadView {...defaultProps} />);
    expect(screen.getByText("This looks wrong")).toBeInTheDocument();
  });

  it("status row has no danger/success class for open non-blocking", () => {
    const { container } = render(<ThreadView {...defaultProps} />);
    const statusRow = container.querySelector("[data-testid='status-row']");
    expect(statusRow?.className).not.toContain("danger");
    expect(statusRow?.className).not.toContain("success");
  });

  it("status row has danger class for open blocking", () => {
    const { container } = render(
      <ThreadView {...{ ...defaultProps, thread: makeThread({ blocking: true }) }} />,
    );
    const statusRow = container.querySelector("[data-testid='status-row']");
    expect(statusRow?.className).toContain("danger");
  });

  it("status row has success class for resolved", () => {
    const { container } = render(
      <ThreadView
        {...{ ...defaultProps, thread: makeThread({ status: "resolved" }) }}
      />,
    );
    const statusRow = container.querySelector("[data-testid='status-row']");
    expect(statusRow?.className).toContain("success");
  });

  it("suggest card shown when doc editor and last comment from non-editor", () => {
    render(<ThreadView {...defaultProps} />);
    expect(screen.getByText("Suggest a fix")).toBeInTheDocument();
  });

  it("resolve card shown when doc editor and last comment from editor", () => {
    const t = makeThread({
      comments: [
        {
          id: "c1",
          thread_id: "t1",
          body: "Fixed it",
          author: "eric",
          created_at: "2026-01-01",
        },
      ],
    });
    render(<ThreadView {...{ ...defaultProps, thread: t }} />);
    expect(screen.getByText("Mark as resolved")).toBeInTheDocument();
  });

  it("reopen card shown when resolved", () => {
    render(
      <ThreadView
        {...{ ...defaultProps, thread: makeThread({ status: "resolved" }) }}
      />,
    );
    expect(screen.getByText("Re-open")).toBeInTheDocument();
  });

  it("no card shown for non-editor with open thread", () => {
    const { queryByText } = render(
      <ThreadView
        {...{ ...defaultProps, currentUser: "raquel", docAuthor: "eric" }}
      />,
    );
    expect(queryByText("Suggest a fix")).toBeNull();
    expect(queryByText("Mark as resolved")).toBeNull();
  });

  it("at most one card visible", () => {
    render(<ThreadView {...defaultProps} />);
    // Only suggest card for this state
    expect(screen.queryByText("Mark as resolved")).toBeNull();
    expect(screen.queryByText("Re-open")).toBeNull();
  });
});
