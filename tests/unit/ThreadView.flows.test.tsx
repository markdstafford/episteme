/**
 * End-to-end flow tests for ThreadView — covers the full comment creation and
 * reply flows with mocked AI calls. These tests catch regressions in deflection,
 * AI enrichment, queued card behaviour, and navigation.
 */
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { ThreadView, type ThreadViewProps } from "@/components/ThreadView";
import type { Thread } from "@/types/comments";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue("doc-uuid"),
}));

vi.mock("@/lib/commentAi", () => ({
  vetComment: vi.fn().mockResolvedValue({ type: "proceed" }),
  suggestCommentText: vi.fn().mockResolvedValue("AI polished concern"),
  enhanceCommentBody: vi.fn().mockResolvedValue("AI enhanced reply"),
  isAuthError: vi.fn().mockReturnValue(false),
}));

vi.mock("@/lib/commentAiFix", () => ({ suggestFix: vi.fn() }));

vi.mock("@/stores/threads", () => ({
  useThreadsStore: vi.fn(() => ({
    resolveThread: vi.fn(),
    reopenThread: vi.fn(),
    toggleBlocking: vi.fn(),
    stageComment: vi.fn().mockResolvedValue(undefined),
    commitComment: vi.fn().mockResolvedValue({ type: "thread", id: "new-t1", doc_id: "d1", quoted_text: "hello", anchor_from: 0, anchor_to: 5, anchor_stale: false, status: "open", blocking: false, pinned: false, created_at: "2026-01-01", comments: [], events: [] }),
    cancelQueuedComment: vi.fn().mockResolvedValue(undefined),
    updateQueuedBlocking: vi.fn().mockResolvedValue(undefined),
    toggleQueuedBody: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("@/stores/preferences", () => ({
  usePreferencesStore: vi.fn(() => ({
    aiEnhancementEnabled: true,
    aiEnhancementTimeoutMs: 30000,
  })),
}));

import { vetComment, suggestCommentText, enhanceCommentBody } from "@/lib/commentAi";
const mockVet = vi.mocked(vetComment);
const mockSuggest = vi.mocked(suggestCommentText);
const mockEnhance = vi.mocked(enhanceCommentBody);

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeThread(overrides: Partial<Thread> = {}): Thread {
  return {
    id: "t1", doc_id: "d1", quoted_text: "the retry queue",
    anchor_from: 0, anchor_to: 15, anchor_stale: false,
    status: "open", blocking: false, pinned: false,
    created_at: "2026-01-01T00:00:00Z",
    comments: [{ id: "c1", thread_id: "t1", body: "First comment", author: "alice", created_at: "2026-01-01T01:00:00Z" }],
    events: [{ id: "e1", thread_id: "t1", event: "open", changed_by: "alice", changed_at: "2026-01-01T01:00:00Z" }],
    ...overrides,
  };
}

const baseNewProps: ThreadViewProps = {
  mode: "new" as const,
  anchor: { from: 10, to: 20, quotedText: "hello world" },
  onClose: vi.fn(),
  onThreadCreated: vi.fn(),
  awsProfile: "default",
  workspacePath: "/ws",
  docContent: "This is the full document. hello world appears here. More text follows.",
};

const baseReplyProps: ThreadViewProps = {
  mode: "reply" as const,
  thread: makeThread(),
  currentUser: "eric",
  docAuthor: "eric",
  onBack: vi.fn(),
  onClose: vi.fn(),
  awsProfile: "default",
  docContent: "the retry queue is slow and has a high failure rate",
};

// ── New comment flow ──────────────────────────────────────────────────────────

describe("New comment flow (mode='new')", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVet.mockResolvedValue({ type: "proceed" });
    mockSuggest.mockResolvedValue("AI polished concern");
    mockEnhance.mockResolvedValue(null);
  });

  it("renders concern input on open", () => {
    render(<ThreadView {...baseNewProps} />);
    expect(screen.getByPlaceholderText("What's your question or concern?")).toBeInTheDocument();
    expect(screen.getByText("New comment")).toBeInTheDocument();
    expect(screen.getByText(/"hello world"/)).toBeInTheDocument();
  });

  it("shows processing indicator while AI runs", async () => {
    // Delay vetComment so we can see the processing state
    mockVet.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ type: "proceed" }), 200)));

    render(<ThreadView {...baseNewProps} />);
    const input = screen.getByPlaceholderText("What's your question or concern?");
    fireEvent.change(input, { target: { value: "my concern" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(screen.getByText("✨ Checking document…")).toBeInTheDocument());
  });

  it("shows queued card after AI proceeds — AI polished text as default", async () => {
    mockSuggest.mockResolvedValue("AI polished concern");

    render(<ThreadView {...baseNewProps} />);
    const input = screen.getByPlaceholderText("What's your question or concern?");
    fireEvent.change(input, { target: { value: "my concern" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(screen.getByText("AI polished concern")).toBeInTheDocument());
  });

  it("stages comment with body_original = user's text, body_enhanced = AI polished", async () => {
    const { useThreadsStore } = await import("@/stores/threads");
    const stageComment = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useThreadsStore).mockReturnValue({
      stageComment,
      commitComment: vi.fn().mockResolvedValue({}),
      cancelQueuedComment: vi.fn(),
      updateQueuedBlocking: vi.fn(),
      toggleQueuedBody: vi.fn(),
    } as any);

    render(<ThreadView {...baseNewProps} />);
    const input = screen.getByPlaceholderText("What's your question or concern?");
    fireEvent.change(input, { target: { value: "reduce the time commitment" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(stageComment).toHaveBeenCalled());
    const call = stageComment.mock.calls[0][0];
    expect(call.body_original).toBe("reduce the time commitment");
    expect(call.body_enhanced).toBe("AI polished concern");
  });

  it("shows concern input (disabled) while queued card is counting down", async () => {
    render(<ThreadView {...baseNewProps} />);
    const input = screen.getByPlaceholderText("What's your question or concern?");
    fireEvent.change(input, { target: { value: "my concern" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => screen.getByText("AI polished concern")); // queued card shown
    expect(screen.getByPlaceholderText("What's your question or concern?")).toBeDisabled();
  });

  it("calls suggestCommentText with full document content and quoted text", async () => {
    render(<ThreadView {...baseNewProps} />);
    const input = screen.getByPlaceholderText("What's your question or concern?");
    fireEvent.change(input, { target: { value: "my concern" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(mockSuggest).toHaveBeenCalled());
    const call = mockSuggest.mock.calls[0][0];
    expect(call.concern).toBe("my concern");
    expect(call.quotedText).toBe("hello world");
    expect(call.docContent).toBe(baseNewProps.docContent);
  });
});

// ── Deflection flow ───────────────────────────────────────────────────────────

describe("Deflection flow (mode='new')", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSuggest.mockResolvedValue("AI polished concern");
  });

  it("shows deflect answer card when AI deflects", async () => {
    mockVet.mockResolvedValue({ type: "deflect", answer: "The doc already covers this in section 2." });

    render(<ThreadView {...baseNewProps} />);
    const input = screen.getByPlaceholderText("What's your question or concern?");
    fireEvent.change(input, { target: { value: "reduce the time commitment" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => screen.getByText("The doc already covers this in section 2."));
    expect(screen.getByText("No, file anyway")).toBeInTheDocument();
    expect(screen.getByText("Yes, thanks")).toBeInTheDocument();
  });

  it("concern input still visible (enabled) during deflect so user can rephrase", async () => {
    mockVet.mockResolvedValue({ type: "deflect", answer: "Already answered." });

    render(<ThreadView {...baseNewProps} />);
    const input = screen.getByPlaceholderText("What's your question or concern?");
    fireEvent.change(input, { target: { value: "my concern" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => screen.getByText("Already answered."));
    expect(input).toBeInTheDocument();
    expect(input).not.toBeDisabled();
  });

  it("files anyway after deflection — uses original concern text as body_original", async () => {
    mockVet
      .mockResolvedValueOnce({ type: "deflect", answer: "Already answered." })
      .mockResolvedValue({ type: "proceed" });

    const { useThreadsStore } = await import("@/stores/threads");
    const stageComment = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useThreadsStore).mockReturnValue({
      stageComment, commitComment: vi.fn().mockResolvedValue({}),
      cancelQueuedComment: vi.fn(), updateQueuedBlocking: vi.fn(), toggleQueuedBody: vi.fn(),
    } as any);

    render(<ThreadView {...baseNewProps} />);
    const input = screen.getByPlaceholderText("What's your question or concern?");
    fireEvent.change(input, { target: { value: "reduce the time commitment" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => screen.getByText("No, file anyway"));
    fireEvent.click(screen.getByText("No, file anyway"));

    await waitFor(() => expect(stageComment).toHaveBeenCalled());
    const call = stageComment.mock.calls[0][0];
    expect(call.body_original).toBe("reduce the time commitment");
  });

  it("vetComment receives quotedText and docContent for accurate deflect decision", async () => {
    mockVet.mockResolvedValue({ type: "proceed" });

    render(<ThreadView {...baseNewProps} />);
    const input = screen.getByPlaceholderText("What's your question or concern?");
    fireEvent.change(input, { target: { value: "my concern" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(mockVet).toHaveBeenCalled());
    const call = mockVet.mock.calls[0][0];
    expect(call.quotedText).toBe("hello world");
    expect(call.docContent).toBe(baseNewProps.docContent);
    expect(call.concern).toBe("my concern");
  });
});

// ── Reply flow ────────────────────────────────────────────────────────────────

describe("Reply flow (mode='reply')", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnhance.mockResolvedValue("AI enhanced reply");
  });

  it("shows enhancing indicator while AI runs", async () => {
    mockEnhance.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve("enhanced"), 200)));

    render(<ThreadView {...baseReplyProps} />);
    const textarea = screen.getByPlaceholderText("Reply…");
    fireEvent.change(textarea, { target: { value: "my reply" } });
    fireEvent.click(screen.getByRole("button", { name: "↑" }));

    await waitFor(() => expect(screen.getByText(/enhancing/i)).toBeInTheDocument());
  });

  it("shows queued card with AI-enhanced text after sending", async () => {
    mockEnhance.mockResolvedValue("AI enhanced reply");

    render(<ThreadView {...baseReplyProps} />);
    const textarea = screen.getByPlaceholderText("Reply…");
    fireEvent.change(textarea, { target: { value: "my reply" } });
    fireEvent.click(screen.getByRole("button", { name: "↑" }));

    await waitFor(() => screen.getByTestId("queued-reply-card"));
    expect(screen.getByText("AI enhanced reply")).toBeInTheDocument();
  });

  it("stages reply with body_original = user's text, body_enhanced = AI text", async () => {
    const { useThreadsStore } = await import("@/stores/threads");
    const stageComment = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useThreadsStore).mockReturnValue({
      resolveThread: vi.fn(), reopenThread: vi.fn(), toggleBlocking: vi.fn(),
      stageComment, commitComment: vi.fn().mockResolvedValue({}),
      cancelQueuedComment: vi.fn(), updateQueuedBlocking: vi.fn(), toggleQueuedBody: vi.fn(),
    } as any);

    render(<ThreadView {...baseReplyProps} />);
    const textarea = screen.getByPlaceholderText("Reply…");
    fireEvent.change(textarea, { target: { value: "my reply text" } });
    fireEvent.click(screen.getByRole("button", { name: "↑" }));

    await waitFor(() => expect(stageComment).toHaveBeenCalled());
    const call = stageComment.mock.calls[0][0];
    expect(call.body_original).toBe("my reply text");
    expect(call.body_enhanced).toBe("AI enhanced reply");
  });

  it("enhanceCommentBody receives thread quoted_text and document content", async () => {
    render(<ThreadView {...baseReplyProps} />);
    const textarea = screen.getByPlaceholderText("Reply…");
    fireEvent.change(textarea, { target: { value: "my reply" } });
    fireEvent.click(screen.getByRole("button", { name: "↑" }));

    await waitFor(() => expect(mockEnhance).toHaveBeenCalled());
    const call = mockEnhance.mock.calls[0][0];
    expect(call.body).toBe("my reply");
    expect(call.quotedText).toBe("the retry queue");
    expect(call.docContent).toBe(baseReplyProps.docContent);
    expect(call.threadComments).toHaveLength(1);
  });

  it("reply input remains disabled while queued card is shown", async () => {
    render(<ThreadView {...baseReplyProps} />);
    const textarea = screen.getByPlaceholderText("Reply…");
    fireEvent.change(textarea, { target: { value: "my reply" } });
    fireEvent.click(screen.getByRole("button", { name: "↑" }));

    await waitFor(() => screen.getByTestId("queued-reply-card"));
    expect(textarea).toBeDisabled();
  });
});
