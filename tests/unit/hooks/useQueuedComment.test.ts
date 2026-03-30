import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useQueuedComment, COUNTDOWN_SECONDS } from "@/hooks/useQueuedComment";

const makeDeps = (overrides: Record<string, unknown> = {}) => ({
  stageComment: vi.fn().mockResolvedValue(undefined),
  commitComment: vi.fn().mockResolvedValue({}),
  cancelQueuedComment: vi.fn().mockResolvedValue(undefined),
  updateQueuedBlocking: vi.fn().mockResolvedValue(undefined),
  toggleQueuedBody: vi.fn().mockResolvedValue(undefined),
  docFilePath: "/ws/doc.md",
  ...overrides,
});

describe("useQueuedComment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exports COUNTDOWN_SECONDS = 30", () => {
    expect(COUNTDOWN_SECONDS).toBe(30);
  });

  it("initializes with empty state", () => {
    const { result } = renderHook(() => useQueuedComment(makeDeps()));
    expect(result.current.queuedId).toBeNull();
    expect(result.current.bodyOriginal).toBe("");
    expect(result.current.bodyEnhanced).toBeNull();
    expect(result.current.countdown).toBe(COUNTDOWN_SECONDS);
    expect(result.current.commitError).toBeNull();
  });

  it("startQueued sets all queued state", async () => {
    const { result } = renderHook(() => useQueuedComment(makeDeps()));
    await act(async () => {
      result.current.startQueued({ id: "q1", bodyOriginal: "my text", bodyEnhanced: "enhanced" });
    });
    expect(result.current.queuedId).toBe("q1");
    expect(result.current.bodyOriginal).toBe("my text");
    expect(result.current.bodyEnhanced).toBe("enhanced");
    expect(result.current.countdown).toBe(COUNTDOWN_SECONDS);
  });

  it("displayBody shows enhanced when useEnhanced is true and bodyEnhanced is set", async () => {
    const { result } = renderHook(() => useQueuedComment(makeDeps()));
    await act(async () => {
      result.current.startQueued({ id: "q1", bodyOriginal: "raw", bodyEnhanced: "enhanced" });
    });
    expect(result.current.displayBody).toBe("enhanced");
  });

  it("displayBody shows bodyOriginal when bodyEnhanced is null", async () => {
    const { result } = renderHook(() => useQueuedComment(makeDeps()));
    await act(async () => {
      result.current.startQueued({ id: "q1", bodyOriginal: "raw", bodyEnhanced: null });
    });
    expect(result.current.displayBody).toBe("raw");
  });

  it("cancel calls cancelQueuedComment and clears state", async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useQueuedComment(deps));
    await act(async () => {
      result.current.startQueued({ id: "q1", bodyOriginal: "text", bodyEnhanced: null });
    });
    await act(async () => { await result.current.cancel(); });
    expect(deps.cancelQueuedComment).toHaveBeenCalledWith("q1");
    expect(result.current.queuedId).toBeNull();
  });

  it("reset clears UI state without canceling the queued comment", async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useQueuedComment(deps));
    await act(async () => {
      result.current.startQueued({ id: "q1", bodyOriginal: "text", bodyEnhanced: null });
    });
    act(() => { result.current.reset(); });
    expect(result.current.queuedId).toBeNull();
    expect(deps.cancelQueuedComment).not.toHaveBeenCalled();
  });

  it("commits when countdown reaches zero", async () => {
    vi.useFakeTimers();
    const deps = makeDeps();
    const { result } = renderHook(() => useQueuedComment(deps));
    await act(async () => {
      result.current.startQueued({ id: "q1", bodyOriginal: "text", bodyEnhanced: null });
    });
    await act(async () => { vi.advanceTimersByTime(31000); });
    expect(deps.commitComment).toHaveBeenCalledWith("q1", "/ws/doc.md");
    vi.useRealTimers();
  });

  it("sets commitError when commit fails", async () => {
    vi.useFakeTimers();
    const deps = makeDeps({
      commitComment: vi.fn().mockRejectedValue(new Error("fail")),
    });
    const { result } = renderHook(() => useQueuedComment(deps));
    await act(async () => {
      result.current.startQueued({ id: "q1", bodyOriginal: "text", bodyEnhanced: null });
    });
    await act(async () => { vi.advanceTimersByTime(31000); });
    expect(result.current.commitError).not.toBeNull();
    vi.useRealTimers();
  });

  it("retryCommit calls commitComment after a failure", async () => {
    vi.useFakeTimers();
    const commitComment = vi.fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce({});
    const deps = makeDeps({ commitComment });
    const { result } = renderHook(() => useQueuedComment(deps));
    await act(async () => {
      result.current.startQueued({ id: "q1", bodyOriginal: "text", bodyEnhanced: null });
    });
    await act(async () => { vi.advanceTimersByTime(31000); });
    // First commit failed
    expect(result.current.commitError).not.toBeNull();
    // Retry
    await act(async () => { result.current.retryCommit(); });
    await act(async () => { vi.advanceTimersByTime(10); });
    expect(commitComment).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("cancel prevents a pending retryCommit from firing", async () => {
    vi.useFakeTimers();
    const commitComment = vi.fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce({});
    const cancelQueuedComment = vi.fn().mockResolvedValue(undefined);
    const deps = makeDeps({ commitComment, cancelQueuedComment });
    const { result } = renderHook(() => useQueuedComment(deps));
    await act(async () => {
      result.current.startQueued({ id: "q1", bodyOriginal: "text", bodyEnhanced: null });
    });
    await act(async () => { vi.advanceTimersByTime(31000); });
    // Trigger retry
    act(() => { result.current.retryCommit(); });
    // Cancel before retry fires
    await act(async () => { await result.current.cancel(); });
    await act(async () => { vi.advanceTimersByTime(100); });
    // commitComment called only once (first attempt), not for the retry
    expect(commitComment).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("commit fires after unmount (C4 fix)", async () => {
    vi.useFakeTimers();
    const deps = makeDeps();
    const { result, unmount } = renderHook(() => useQueuedComment(deps));
    await act(async () => {
      result.current.startQueued({ id: "q1", bodyOriginal: "text", bodyEnhanced: null });
    });
    unmount();
    await act(async () => { vi.advanceTimersByTime(31000); });
    // Commit should still have been called even after unmount
    expect(deps.commitComment).toHaveBeenCalledWith("q1", "/ws/doc.md");
    vi.useRealTimers();
  });

  it("commit fires after reset (C1 fix — thread switch)", async () => {
    vi.useFakeTimers();
    const deps = makeDeps();
    const { result } = renderHook(() => useQueuedComment(deps));
    await act(async () => {
      result.current.startQueued({ id: "q1", bodyOriginal: "text", bodyEnhanced: null });
    });
    // Simulate thread switch
    act(() => { result.current.reset(); });
    expect(result.current.queuedId).toBeNull();
    // Commit timer still running — commit should still fire
    await act(async () => { vi.advanceTimersByTime(31000); });
    expect(deps.commitComment).toHaveBeenCalledWith("q1", "/ws/doc.md");
    vi.useRealTimers();
  });

  it("background commit fires after a new startQueued (P1 fix)", async () => {
    vi.useFakeTimers();
    const commitComment = vi.fn().mockResolvedValue({});
    const cancelQueuedComment = vi.fn().mockResolvedValue(undefined);
    const deps = makeDeps({ commitComment, cancelQueuedComment });
    const { result } = renderHook(() => useQueuedComment(deps));

    // Start first queued comment
    await act(async () => {
      result.current.startQueued({ id: "q1", bodyOriginal: "first", bodyEnhanced: null });
    });

    // Simulate thread switch — reset clears UI but preserves commit
    act(() => { result.current.reset(); });

    // Start second queued comment BEFORE first commits
    await act(async () => {
      result.current.startQueued({ id: "q2", bodyOriginal: "second", bodyEnhanced: null });
    });

    // Advance time past 30 seconds
    await act(async () => { vi.advanceTimersByTime(35000); });

    // BOTH comments should have been committed
    expect(commitComment).toHaveBeenCalledWith("q1", "/ws/doc.md");
    expect(commitComment).toHaveBeenCalledWith("q2", "/ws/doc.md");
    vi.useRealTimers();
  });
});
