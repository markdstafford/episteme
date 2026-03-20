import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { TitleBar } from "@/components/TitleBar";

describe("TitleBar", () => {
  it("renders back and forward navigation buttons", () => {
    render(<TitleBar folderPath={null} />);
    expect(screen.getByRole("button", { name: /navigate back/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /navigate forward/i })).toBeInTheDocument();
  });

  it("renders 'Episteme' title text", () => {
    render(<TitleBar folderPath={null} />);
    expect(screen.getByText("Episteme")).toBeInTheDocument();
  });

  it("renders New Document button as disabled when folderPath is null", () => {
    render(<TitleBar folderPath={null} />);
    const newDocBtn = screen.getByRole("button", { name: /new document/i });
    expect(newDocBtn).toBeDisabled();
  });

  it("renders New Document button as enabled when folderPath is a string", () => {
    render(<TitleBar folderPath="/some/path" />);
    const newDocBtn = screen.getByRole("button", { name: /new document/i });
    expect(newDocBtn).not.toBeDisabled();
  });
});

describe("AI panel toggle button", () => {
  it("renders with tertiary color when aiPanelOpen is false", () => {
    render(<TitleBar folderPath={null} aiPanelOpen={false} onToggleAiPanel={vi.fn()} />);
    const btn = screen.getByRole("button", { name: /toggle ai panel/i });
    expect(btn).toBeInTheDocument();
  });

  it("renders with accent color when aiPanelOpen is true", () => {
    render(<TitleBar folderPath={null} aiPanelOpen={true} onToggleAiPanel={vi.fn()} />);
    const btn = screen.getByRole("button", { name: /toggle ai panel/i });
    expect(btn.style.color).toBe("var(--color-accent)");
  });

  it("calls onToggleAiPanel when clicked", async () => {
    const onToggle = vi.fn();
    render(<TitleBar folderPath={null} aiPanelOpen={false} onToggleAiPanel={onToggle} />);
    await userEvent.click(screen.getByRole("button", { name: /toggle ai panel/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
