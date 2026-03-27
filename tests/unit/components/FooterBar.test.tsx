import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FooterBar } from "@/components/FooterBar";

const defaultProps = {
  sidebarVisible: true,
  onToggleSidebar: vi.fn(),
  aiPanelOpen: false,
  onToggleAiPanel: vi.fn(),
  readingTime: null,
};

beforeEach(() => { vi.clearAllMocks(); });

describe("FooterBar", () => {
  it("renders sidebar toggle button", () => {
    render(<FooterBar {...defaultProps} />);
    expect(screen.getByRole("button", { name: /hide sidebar/i })).toBeInTheDocument();
  });

  it("renders AI panel toggle button", () => {
    render(<FooterBar {...defaultProps} />);
    expect(screen.getByRole("button", { name: /show ai panel/i })).toBeInTheDocument();
  });

  it("sidebar toggle aria-label says 'Hide sidebar' when sidebar is visible", () => {
    render(<FooterBar {...defaultProps} sidebarVisible={true} />);
    expect(screen.getByRole("button", { name: /hide sidebar/i })).toBeInTheDocument();
  });

  it("sidebar toggle aria-label says 'Show sidebar' when sidebar is hidden", () => {
    render(<FooterBar {...defaultProps} sidebarVisible={false} />);
    expect(screen.getByRole("button", { name: /show sidebar/i })).toBeInTheDocument();
  });

  it("sidebar toggle is accent-colored when sidebar is open", () => {
    render(<FooterBar {...defaultProps} sidebarVisible={true} />);
    const btn = screen.getByRole("button", { name: /hide sidebar/i });
    expect(btn.style.color).toBe("var(--color-accent)");
  });

  it("sidebar toggle is tertiary-colored when sidebar is hidden", () => {
    render(<FooterBar {...defaultProps} sidebarVisible={false} />);
    const btn = screen.getByRole("button", { name: /show sidebar/i });
    expect(btn.style.color).toBe("var(--color-text-tertiary)");
  });

  it("AI panel toggle is accent-colored when panel is open", () => {
    render(<FooterBar {...defaultProps} aiPanelOpen={true} />);
    const btn = screen.getByRole("button", { name: /hide ai panel/i });
    expect(btn.style.color).toBe("var(--color-accent)");
  });

  it("AI panel toggle is tertiary-colored when panel is closed", () => {
    render(<FooterBar {...defaultProps} aiPanelOpen={false} />);
    const btn = screen.getByRole("button", { name: /show ai panel/i });
    expect(btn.style.color).toBe("var(--color-text-tertiary)");
  });

  it("calls onToggleSidebar when sidebar button is clicked", async () => {
    const onToggle = vi.fn();
    render(<FooterBar {...defaultProps} onToggleSidebar={onToggle} />);
    await userEvent.click(screen.getByRole("button", { name: /hide sidebar/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("calls onToggleAiPanel when AI panel button is clicked", async () => {
    const onToggle = vi.fn();
    render(<FooterBar {...defaultProps} onToggleAiPanel={onToggle} />);
    await userEvent.click(screen.getByRole("button", { name: /show ai panel/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("does not render reading time when readingTime is null", () => {
    render(<FooterBar {...defaultProps} readingTime={null} />);
    expect(screen.queryByText(/min read/i)).not.toBeInTheDocument();
  });

  it("renders reading time when provided", () => {
    render(<FooterBar {...defaultProps} readingTime={5} />);
    expect(screen.getByText("5 min read")).toBeInTheDocument();
  });
});
