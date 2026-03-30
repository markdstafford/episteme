import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { QueuedCommentCard } from "@/components/QueuedCommentCard";

const baseProps = {
  displayBody: "my comment",
  bodyEnhanced: null,
  useEnhanced: true,
  blocking: false,
  countdown: 25,
  countdownSeconds: 30,
  onToggleBody: vi.fn(),
  onCancel: vi.fn(),
  onSetBlocking: vi.fn(),
};

describe("QueuedCommentCard", () => {
  it("renders the display body", () => {
    render(<QueuedCommentCard {...baseProps} />);
    expect(screen.getByText("my comment")).toBeInTheDocument();
  });

  it("shows countdown in seconds", () => {
    render(<QueuedCommentCard {...baseProps} />);
    expect(screen.getByText("25s")).toBeInTheDocument();
  });

  it("does not show AI/raw toggle when bodyEnhanced is null", () => {
    render(<QueuedCommentCard {...baseProps} />);
    expect(screen.queryByText("✨")).toBeNull();
  });

  it("shows AI/raw toggle when bodyEnhanced is available", () => {
    render(<QueuedCommentCard {...baseProps} bodyEnhanced="enhanced text" />);
    expect(screen.getByText("✨")).toBeInTheDocument();
    expect(screen.getByText("👤")).toBeInTheDocument();
  });

  it("calls onCancel when countdown pill is clicked", () => {
    const onCancel = vi.fn();
    render(<QueuedCommentCard {...baseProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByText("25s").closest("button")!);
    expect(onCancel).toHaveBeenCalled();
  });

  it("shows blocking toggle and calls onSetBlocking with toggled value", () => {
    const onSetBlocking = vi.fn();
    render(<QueuedCommentCard {...baseProps} onSetBlocking={onSetBlocking} />);
    fireEvent.click(screen.getByText("Mark as blocking"));
    expect(onSetBlocking).toHaveBeenCalledWith(true);
  });

  it("shows processing indicator when processing is true", () => {
    render(<QueuedCommentCard {...baseProps} processing />);
    expect(screen.getByText(/enhancing/i)).toBeInTheDocument();
  });

  it("shows error message when error is set", () => {
    render(<QueuedCommentCard {...baseProps} error="Failed to send — click Retry" />);
    expect(screen.getByText(/failed to send/i)).toBeInTheDocument();
  });

  it("calls onRetry when Retry is clicked", () => {
    const onRetry = vi.fn();
    render(<QueuedCommentCard {...baseProps} error="Failed to send" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("does not show card content when processing", () => {
    render(<QueuedCommentCard {...baseProps} processing />);
    expect(screen.queryByText("my comment")).toBeNull();
  });

  it("does not show blocking toggle when processing", () => {
    render(<QueuedCommentCard {...baseProps} processing />);
    expect(screen.queryByText("Mark as blocking")).toBeNull();
  });
});
