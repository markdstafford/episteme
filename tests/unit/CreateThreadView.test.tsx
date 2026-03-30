import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreateThreadView } from "@/components/CreateThreadView";
import type { Thread } from "@/types/comments";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue("doc-uuid-123"),
}));

vi.mock("@/lib/commentAi", () => ({
  vetComment: vi.fn().mockResolvedValue({ type: "proceed" }),
  suggestCommentText: vi.fn().mockResolvedValue("Suggested text"),
  enhanceCommentBody: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/stores/threads", () => ({
  useThreadsStore: vi.fn(() => ({
    stageComment: vi.fn().mockResolvedValue(undefined),
    commitComment: vi.fn().mockResolvedValue({ type: "thread", id: "t1", doc_id: "d1", quoted_text: "hello", anchor_from: 0, anchor_to: 5, anchor_stale: false, status: "open", blocking: false, pinned: false, created_at: "2026-01-01", comments: [], events: [] } as Thread),
    cancelQueuedComment: vi.fn().mockResolvedValue(undefined),
    updateQueuedBody: vi.fn().mockResolvedValue(undefined),
    toggleQueuedBody: vi.fn().mockResolvedValue(undefined),
  })),
}));

import { vetComment, suggestCommentText } from "@/lib/commentAi";
const mockVet = vi.mocked(vetComment);
const mockSuggest = vi.mocked(suggestCommentText);

const defaultProps = {
  anchor: { from: 0, to: 5, quotedText: "hello" },
  onClose: vi.fn(),
  onThreadCreated: vi.fn(),
  awsProfile: "default",
  workspacePath: "/ws",
  docContent: "hello world",
};

describe("CreateThreadView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVet.mockResolvedValue({ type: "proceed" });
    mockSuggest.mockResolvedValue("Suggested text");
  });

  it("renders header with correct title", () => {
    render(<CreateThreadView {...defaultProps} />);
    expect(screen.getByText("New comment")).toBeInTheDocument();
  });

  it("displays quoted text", () => {
    render(<CreateThreadView {...defaultProps} />);
    expect(screen.getByText('"hello"')).toBeInTheDocument();
  });

  it("shows correct input placeholder", () => {
    render(<CreateThreadView {...defaultProps} />);
    expect(
      screen.getByPlaceholderText("What's your question or concern?"),
    ).toBeInTheDocument();
  });

  it("renders without crashing and has close functionality", () => {
    const onClose = vi.fn();
    render(<CreateThreadView {...defaultProps} onClose={onClose} />);
    // Verify close button exists (X icon in header)
    expect(screen.getByText("New comment")).toBeInTheDocument();
    // The input is shown by default
    expect(
      screen.getByPlaceholderText("What's your question or concern?"),
    ).toBeInTheDocument();
  });

  it("deflect: shows No file anyway button when AI deflects", async () => {
    mockVet.mockResolvedValueOnce({
      type: "deflect",
      answer: "It is covered in section 2.",
    });
    render(<CreateThreadView {...defaultProps} />);
    const textarea = screen.getByPlaceholderText("What's your question or concern?");
    fireEvent.change(textarea, { target: { value: "what does X mean?" } });
    fireEvent.keyDown(textarea, { key: "Enter" });
    await waitFor(() =>
      screen.getByText("It is covered in section 2."),
    );
    expect(screen.getByText("No, file anyway")).toBeInTheDocument();
  });

  it("proceed: shows queued card after AI proceeds", async () => {
    render(<CreateThreadView {...defaultProps} />);
    const textarea = screen.getByPlaceholderText("What's your question or concern?");
    fireEvent.change(textarea, { target: { value: "question" } });
    fireEvent.keyDown(textarea, { key: "Enter" });
    await waitFor(() => screen.getByText("Suggested text"));
  });

  it("blocking toggle appears after queuing", async () => {
    render(<CreateThreadView {...defaultProps} />);
    const textarea = screen.getByPlaceholderText("What's your question or concern?");
    fireEvent.change(textarea, { target: { value: "question" } });
    fireEvent.keyDown(textarea, { key: "Enter" });
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

    render(<CreateThreadView {...defaultProps} onAuthError={vi.fn()} />);
    const input = screen.getByPlaceholderText("What's your question or concern?");
    fireEvent.change(input, { target: { value: "needs more detail here" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(stageComment).toHaveBeenCalled());
    const call = stageComment.mock.calls[0][0];
    expect(call.body_original).toBe("needs more detail here");
    expect(call.body_enhanced).toBe("AI polished version");
  });

  it("stores user's original text as body_original after 'No, file anyway'", async () => {
    // Mock vet to return deflect
    mockVet.mockResolvedValue({ type: "deflect", answer: "The doc already says X." });
    mockSuggest.mockResolvedValue("AI polished version");

    // Capture stageComment calls
    const { useThreadsStore } = await import("@/stores/threads");
    const stageComment = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useThreadsStore).mockReturnValue({
      stageComment,
      commitComment: vi.fn().mockResolvedValue({} as any),
      cancelQueuedComment: vi.fn(),
      updateQueuedBody: vi.fn(),
      toggleQueuedBody: vi.fn(),
    } as any);

    render(<CreateThreadView {...defaultProps} onAuthError={vi.fn()} />);

    // Type concern and send
    const input = screen.getByPlaceholderText("What's your question or concern?");
    fireEvent.change(input, { target: { value: "reduce the time commitment" } });
    fireEvent.keyDown(input, { key: "Enter" });

    // Wait for deflect card
    await waitFor(() => expect(screen.getByText("No, file anyway")).toBeInTheDocument());

    // Click "No, file anyway"
    fireEvent.click(screen.getByText("No, file anyway"));

    // Wait for stageComment
    await waitFor(() => expect(stageComment).toHaveBeenCalled());

    const call = stageComment.mock.calls[0][0];
    expect(call.body_original).toBe("reduce the time commitment");
    expect(call.body_enhanced).toBe("AI polished version");
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

    // Start fake timers before rendering so the 30s countdown setInterval is fake-controlled
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<CreateThreadView {...defaultProps} onAuthError={vi.fn()} />);
    const input = screen.getByPlaceholderText("What's your question or concern?");
    fireEvent.change(input, { target: { value: "my concern" } });
    fireEvent.keyDown(input, { key: "Enter" });

    // Wait for the queued card to appear (AI processing done, countdown started)
    await waitFor(() => screen.getByText("AI polished version"));

    // Advance past the 30-second countdown to trigger commit
    await act(async () => { vi.advanceTimersByTime(31000); });
    vi.useRealTimers();

    await waitFor(() =>
      expect(screen.getByText(/failed to send/i)).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
