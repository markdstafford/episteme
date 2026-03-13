import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Badge } from "@/components/ui/Badge";

describe("Badge", () => {
  it("renders children", () => {
    render(<Badge>Hello</Badge>);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("defaults to neutral variant", () => {
    render(<Badge>Hello</Badge>);
    const el = screen.getByText("Hello");
    expect(el.style.backgroundColor).toBe("var(--color-bg-hover)");
    expect(el.style.color).toBe("var(--color-text-secondary)");
  });

  it("renders neutral variant", () => {
    render(<Badge variant="neutral">N</Badge>);
    const el = screen.getByText("N");
    expect(el.style.backgroundColor).toBe("var(--color-bg-hover)");
    expect(el.style.color).toBe("var(--color-text-secondary)");
  });

  it("renders accent variant", () => {
    render(<Badge variant="accent">A</Badge>);
    const el = screen.getByText("A");
    expect(el.style.backgroundColor).toBe("var(--color-accent-subtle)");
    expect(el.style.color).toBe("var(--color-badge-accent-text)");
  });

  it("renders danger variant", () => {
    render(<Badge variant="danger">D</Badge>);
    const el = screen.getByText("D");
    expect(el.style.backgroundColor).toBe("var(--color-state-danger-subtle)");
    expect(el.style.color).toBe("var(--color-badge-danger-text)");
  });

  it("renders warning variant", () => {
    render(<Badge variant="warning">W</Badge>);
    const el = screen.getByText("W");
    expect(el.style.backgroundColor).toBe("var(--color-state-warning-subtle)");
    expect(el.style.color).toBe("var(--color-badge-warning-text)");
  });

  it("renders success variant", () => {
    render(<Badge variant="success">S</Badge>);
    const el = screen.getByText("S");
    expect(el.style.backgroundColor).toBe("var(--color-state-success-subtle)");
    expect(el.style.color).toBe("var(--color-badge-success-text)");
  });

  it("applies correct geometry styles", () => {
    render(<Badge>X</Badge>);
    const el = screen.getByText("X");
    expect(el.style.height).toBe("var(--height-control-sm)");
    expect(el.style.fontSize).toBe("var(--font-size-ui-xs)");
    expect(el.style.borderRadius).toBe("var(--radius-sm)");
    expect(el.style.fontWeight).toBe("500");
  });
});
