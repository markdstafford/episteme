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
  filePath: null,
  frontmatter: null,
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

  it("renders reading time as a button trigger when readingTime is non-null", () => {
    render(<FooterBar {...defaultProps} readingTime={5} filePath="/docs/test.md" frontmatter={null} />);
    const trigger = screen.getByRole("button", { name: /5 min read/i });
    expect(trigger).toBeInTheDocument();
  });

  it("does not render a trigger button when readingTime is null", () => {
    render(<FooterBar {...defaultProps} readingTime={null} />);
    expect(screen.queryByRole("button", { name: /min read/i })).not.toBeInTheDocument();
  });

  it("opens popover when reading time trigger is clicked", async () => {
    render(
      <FooterBar
        {...defaultProps}
        readingTime={3}
        filePath="/workspace/docs/api-spec.md"
        frontmatter={{ status: "draft" }}
      />
    );
    const trigger = screen.getByRole("button", { name: /3 min read/i });
    await userEvent.click(trigger);
    expect(screen.getByText("Path")).toBeInTheDocument();
  });

  it("forwards filePath into the popover content", async () => {
    render(
      <FooterBar
        {...defaultProps}
        readingTime={3}
        filePath="/workspace/docs/api-spec.md"
        frontmatter={null}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /3 min read/i }));
    expect(screen.getByText("/workspace/docs/api-spec.md")).toBeInTheDocument();
  });

  it("forwards frontmatter into the popover content", async () => {
    render(
      <FooterBar
        {...defaultProps}
        readingTime={3}
        filePath="/workspace/docs/notes.md"
        frontmatter={{ status: "published", author: "alice" }}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /3 min read/i }));
    expect(screen.getByText("Frontmatter")).toBeInTheDocument();
    expect(screen.getByText("status")).toBeInTheDocument();
    expect(screen.getByText("published")).toBeInTheDocument();
  });
});
