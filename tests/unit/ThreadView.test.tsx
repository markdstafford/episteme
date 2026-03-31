import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ThreadView } from "@/components/ThreadView";
import type { Thread } from "@/types/comments";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@/stores/threads", () => ({
  useThreadsStore: vi.fn(() => ({
    resolveThread: vi.fn(),
    reopenThread: vi.fn(),
    toggleBlocking: vi.fn(),
    stageComment: vi.fn().mockResolvedValue(undefined),
    commitComment: vi.fn().mockResolvedValue({}),
    cancelQueuedComment: vi.fn().mockResolvedValue(undefined),
    updateQueuedBlocking: vi.fn().mockResolvedValue(undefined),
    updateQueuedBody: vi.fn().mockResolvedValue(undefined),
    toggleQueuedBody: vi.fn().mockResolvedValue(undefined),
  })),
}));
vi.mock("@/lib/commentAi", () => ({
  enhanceCommentBody: vi.fn().mockResolvedValue(null),
  vetComment: vi.fn().mockResolvedValue({ type: "proceed" }),
  suggestCommentText: vi.fn().mockResolvedValue("Suggested text"),
  isAuthError: vi.fn().mockReturnValue(false),
}));
vi.mock("@/lib/commentAiFix", () => ({ suggestFix: vi.fn() }));
vi.mock("@radix-ui/react-popover", async () => {
  const { createContext, useContext } = await import("react");
  const OpenCtx = createContext(true);
  return {
    Root: ({ children, open = true }: { children: React.ReactNode; open?: boolean }) => (
      <OpenCtx.Provider value={open}>{children}</OpenCtx.Provider>
    ),
    Trigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>,
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Content: ({ children }: { children: React.ReactNode }) => {
      const open = useContext(OpenCtx);
      return open ? <div>{children}</div> : null;
    },
  };
});

import { vetComment, suggestCommentText } from "@/lib/commentAi";
const mockVet = vi.mocked(vetComment);
const mockSuggest = vi.mocked(suggestCommentText);

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
  mode: "reply" as const,
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

  it("status row has mt-0.5 class (tight gap below pinned quote)", () => {
    const { container } = render(<ThreadView {...defaultProps} />);
    const statusRow = container.querySelector("[data-testid='status-row']");
    expect(statusRow?.className).toContain("mt-0.5");
  });

  it("at most one card visible", () => {
    render(<ThreadView {...defaultProps} />);
    // Only suggest card for this state
    expect(screen.queryByText("Mark as resolved")).toBeNull();
    expect(screen.queryByText("Re-open")).toBeNull();
  });

  it("history events are not visible before hovering the status row", () => {
    render(<ThreadView {...defaultProps} />);
    expect(screen.queryByText(/→ open/)).toBeNull();
  });

  it("history events appear when the status row is hovered", () => {
    render(<ThreadView {...defaultProps} />);
    const statusRow = screen.getByTestId("status-row");
    fireEvent.mouseEnter(statusRow);
    expect(screen.getByText(/→ open/)).toBeInTheDocument();
  });

  it("history events appear when the status row is clicked", () => {
    render(<ThreadView {...defaultProps} />);
    const statusRow = screen.getByTestId("status-row");
    fireEvent.click(statusRow);
    expect(screen.getByText(/→ open/)).toBeInTheDocument();
  });

  it("history events disappear when mouse leaves the status row", () => {
    vi.useFakeTimers();
    render(<ThreadView {...defaultProps} />);
    const statusRow = screen.getByTestId("status-row");
    fireEvent.mouseEnter(statusRow);
    fireEvent.mouseLeave(statusRow);
    act(() => { vi.advanceTimersByTime(100); });
    expect(screen.queryByText(/→ open/)).toBeNull();
    vi.useRealTimers();
  });

  it("shows a queued card after a reply is sent", async () => {
    render(<ThreadView {...defaultProps} />);
    const textarea = screen.getByPlaceholderText("Reply…");
    fireEvent.change(textarea, { target: { value: "my reply" } });
    fireEvent.click(screen.getByRole("button", { name: "↑" }));
    await waitFor(() =>
      expect(screen.getByTestId("queued-reply-card")).toBeInTheDocument()
    );
    expect(screen.getByText("my reply")).toBeInTheDocument();
  });

  it("removes queued card and calls cancelQueuedComment when cancel is clicked", async () => {
    const { useThreadsStore } = await import("@/stores/threads");
    const cancelQueuedComment = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useThreadsStore).mockReturnValue({
      resolveThread: vi.fn(),
      reopenThread: vi.fn(),
      toggleBlocking: vi.fn(),
      stageComment: vi.fn().mockResolvedValue(undefined),
      commitComment: vi.fn().mockResolvedValue({}),
      cancelQueuedComment,
      updateQueuedBlocking: vi.fn().mockResolvedValue(undefined),
      updateQueuedBody: vi.fn().mockResolvedValue(undefined),
      toggleQueuedBody: vi.fn().mockResolvedValue(undefined),
    } as any);

    render(<ThreadView {...defaultProps} />);
    const textarea = screen.getByPlaceholderText("Reply…");
    fireEvent.change(textarea, { target: { value: "my reply" } });
    fireEvent.click(screen.getByRole("button", { name: "↑" }));
    await waitFor(() =>
      expect(screen.getByTestId("queued-reply-card")).toBeInTheDocument()
    );
    // Click the countdown pill button (first button inside the queued card)
    const card = screen.getByTestId("queued-reply-card");
    const cancelBtn = card.querySelector("button");
    fireEvent.click(cancelBtn!);
    await waitFor(() =>
      expect(screen.queryByTestId("queued-reply-card")).not.toBeInTheDocument()
    );
    expect(cancelQueuedComment).toHaveBeenCalled();
  });

  it("clears the queued card when the thread prop changes", async () => {
    const { rerender } = render(<ThreadView {...defaultProps} />);
    const textarea = screen.getByPlaceholderText("Reply…");
    fireEvent.change(textarea, { target: { value: "my reply" } });
    fireEvent.click(screen.getByRole("button", { name: "↑" }));
    await waitFor(() =>
      expect(screen.getByTestId("queued-reply-card")).toBeInTheDocument()
    );
    // Swap to a different thread
    const otherThread = { ...defaultProps.thread, id: "t2" };
    rerender(<ThreadView {...defaultProps} thread={otherThread} />);
    expect(screen.queryByTestId("queued-reply-card")).not.toBeInTheDocument();
  });

  it("shows retry option when reply commit fails", async () => {
    const { useThreadsStore } = await import("@/stores/threads");
    const commitComment = vi.fn().mockRejectedValue(new Error("network error"));
    vi.mocked(useThreadsStore).mockReturnValue({
      resolveThread: vi.fn(), reopenThread: vi.fn(), toggleBlocking: vi.fn(),
      stageComment: vi.fn().mockResolvedValue(undefined),
      commitComment,
      cancelQueuedComment: vi.fn().mockResolvedValue(undefined),
      updateQueuedBlocking: vi.fn().mockResolvedValue(undefined),
      toggleQueuedBody: vi.fn().mockResolvedValue(undefined),
    } as any);

    // Start fake timers before rendering so the 30s commit setTimeout is fake-controlled
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<ThreadView {...{ ...defaultProps, aiEnhancementEnabled: false }} />);
    const textarea = screen.getByPlaceholderText("Reply…");
    fireEvent.change(textarea, { target: { value: "my reply" } });
    fireEvent.click(screen.getByRole("button", { name: "↑" }));
    await waitFor(() => screen.getByTestId("queued-reply-card"));

    // Advance past the 30-second commit timeout
    await act(async () => { vi.advanceTimersByTime(31000); });
    vi.useRealTimers();

    await waitFor(() =>
      expect(screen.getByText(/failed to send/i)).toBeInTheDocument()
    );
  });

  it("disables the reply input and send button while a reply is queued", async () => {
    render(<ThreadView {...defaultProps} />);
    const textarea = screen.getByPlaceholderText("Reply…");
    fireEvent.change(textarea, { target: { value: "my reply" } });
    fireEvent.click(screen.getByRole("button", { name: "↑" }));
    await waitFor(() =>
      expect(screen.getByTestId("queued-reply-card")).toBeInTheDocument()
    );
    expect(textarea).toBeDisabled();
    expect(screen.getByRole("button", { name: "↑" })).toBeDisabled();
  });

  it("renders with explicit mode='reply'", () => {
    render(<ThreadView {...defaultProps} />);
    expect(screen.getAllByText(/"the retry queue"/)[0]).toBeInTheDocument();
  });
});

describe("mode='new'", () => {
  const newProps = {
    mode: "new" as const,
    anchor: { from: 0, to: 9, quotedText: "test text" },
    onClose: vi.fn(),
    onThreadCreated: vi.fn(),
    awsProfile: "default",
    workspacePath: "/ws",
    docContent: "test text and more",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockVet.mockResolvedValue({ type: "proceed" });
    mockSuggest.mockResolvedValue("Suggested text");
  });

  it("renders 'New comment' header", () => {
    render(<ThreadView {...newProps} />);
    expect(screen.getByText("New comment")).toBeInTheDocument();
  });

  it("shows quoted text block", () => {
    render(<ThreadView {...newProps} />);
    expect(screen.getByText(/"test text"/)).toBeInTheDocument();
  });

  it("shows concern input in input stage", () => {
    render(<ThreadView {...newProps} />);
    expect(screen.getByPlaceholderText("What's your question or concern?")).toBeInTheDocument();
  });

  it("shows deflect answer when AI deflects", async () => {
    mockVet.mockResolvedValue({ type: "deflect", answer: "The doc covers this." });
    mockSuggest.mockResolvedValue("AI polished");

    render(<ThreadView {...newProps} />);
    const input = screen.getByPlaceholderText("What's your question or concern?");
    fireEvent.change(input, { target: { value: "my concern" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => screen.getByText("The doc covers this."));
    expect(screen.getByText("No, file anyway")).toBeInTheDocument();
  });

  it("shows queued card after proceed", async () => {
    mockVet.mockResolvedValue({ type: "proceed" });
    mockSuggest.mockResolvedValue("AI polished version");

    render(<ThreadView {...newProps} />);
    const input = screen.getByPlaceholderText("What's your question or concern?");
    fireEvent.change(input, { target: { value: "my concern" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => screen.getByText("AI polished version"));
  });

  it("blocking toggle appears after queuing", async () => {
    render(<ThreadView {...newProps} />);
    const input = screen.getByPlaceholderText("What's your question or concern?");
    fireEvent.change(input, { target: { value: "question" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => screen.getByText("Mark as blocking"));
  });

  it("stores user's original text as body_original in the normal proceed flow", async () => {
    mockVet.mockResolvedValue({ type: "proceed" });
    mockSuggest.mockResolvedValue("AI polished version");

    const { useThreadsStore } = await import("@/stores/threads");
    const stageComment = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useThreadsStore).mockReturnValue({
      stageComment,
      commitComment: vi.fn().mockResolvedValue({} as any),
      cancelQueuedComment: vi.fn(),
      updateQueuedBody: vi.fn(),
      toggleQueuedBody: vi.fn(),
    } as any);

    render(<ThreadView {...newProps} onAuthError={vi.fn()} />);
    const input = screen.getByPlaceholderText("What's your question or concern?");
    fireEvent.change(input, { target: { value: "needs more detail here" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(stageComment).toHaveBeenCalled());
    const call = stageComment.mock.calls[0][0];
    expect(call.body_original).toBe("needs more detail here");
    expect(call.body_enhanced).toBe("AI polished version");
  });

  it("stores user's original text as body_original after 'No, file anyway'", async () => {
    mockVet.mockResolvedValue({ type: "deflect", answer: "The doc already says X." });
    mockSuggest.mockResolvedValue("AI polished version");

    const { useThreadsStore } = await import("@/stores/threads");
    const stageComment = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useThreadsStore).mockReturnValue({
      stageComment,
      commitComment: vi.fn().mockResolvedValue({} as any),
      cancelQueuedComment: vi.fn(),
      updateQueuedBody: vi.fn(),
      toggleQueuedBody: vi.fn(),
    } as any);

    render(<ThreadView {...newProps} onAuthError={vi.fn()} />);
    const input = screen.getByPlaceholderText("What's your question or concern?");
    fireEvent.change(input, { target: { value: "reduce the time commitment" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(screen.getByText("No, file anyway")).toBeInTheDocument());
    fireEvent.click(screen.getByText("No, file anyway"));

    await waitFor(() => expect(stageComment).toHaveBeenCalled());
    const call = stageComment.mock.calls[0][0];
    expect(call.body_original).toBe("reduce the time commitment");
    expect(call.body_enhanced).toBe("AI polished version");
  });

  it("queued card is not inside the middle spacer area", async () => {
    mockVet.mockResolvedValue({ type: "proceed" });
    mockSuggest.mockResolvedValue("AI polished version");

    render(<ThreadView {...newProps} onAuthError={vi.fn()} />);
    const input = screen.getByPlaceholderText("What's your question or concern?");
    fireEvent.change(input, { target: { value: "my concern" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => screen.getByText("AI polished version"));

    const card = document.querySelector("[data-testid='queued-card']");
    expect(card).not.toBeNull();
    const middleScrollable = card!.previousElementSibling;
    expect(middleScrollable).not.toBeNull();
    expect(middleScrollable!.contains(card)).toBe(false);
  });

  it("shows retry option when commit fails", async () => {
    mockVet.mockResolvedValue({ type: "proceed" });
    mockSuggest.mockResolvedValue("AI polished version");

    const { useThreadsStore } = await import("@/stores/threads");
    vi.mocked(useThreadsStore).mockReturnValue({
      stageComment: vi.fn().mockResolvedValue(undefined),
      commitComment: vi.fn().mockRejectedValue(new Error("network error")),
      cancelQueuedComment: vi.fn(),
      updateQueuedBody: vi.fn(),
      toggleQueuedBody: vi.fn(),
      updateQueuedBlocking: vi.fn(),
    } as any);

    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<ThreadView {...newProps} onAuthError={vi.fn()} />);
    const input = screen.getByPlaceholderText("What's your question or concern?");
    fireEvent.change(input, { target: { value: "my concern" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => screen.getByText("AI polished version"));

    await act(async () => { vi.advanceTimersByTime(31000); });
    vi.useRealTimers();

    await waitFor(() =>
      expect(screen.getByText(/failed to send/i)).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
