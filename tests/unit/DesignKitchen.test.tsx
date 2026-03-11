import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DesignKitchen } from "@/components/DesignKitchen";

describe("DesignKitchen", () => {
  it("renders all seven section headings", () => {
    render(<DesignKitchen onClose={vi.fn()} />);
    expect(screen.getByText("Colors")).toBeInTheDocument();
    expect(screen.getByText("Typography")).toBeInTheDocument();
    expect(screen.getByText("Spacing")).toBeInTheDocument();
    expect(screen.getByText("Border Radius")).toBeInTheDocument();
    expect(screen.getByText("Shadows")).toBeInTheDocument();
    expect(screen.getByText("Motion")).toBeInTheDocument();
    expect(screen.getByText("Components")).toBeInTheDocument();
  });

  it("renders a close button that calls onClose", () => {
    const onClose = vi.fn();
    render(<DesignKitchen onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders Design Kitchen header", () => {
    render(<DesignKitchen onClose={vi.fn()} />);
    expect(screen.getByText("Design Kitchen")).toBeInTheDocument();
  });

  it("renders color token groups", () => {
    render(<DesignKitchen onClose={vi.fn()} />);
    expect(screen.getByText("--color-bg-app")).toBeInTheDocument();
    expect(screen.getByText("--color-text-primary")).toBeInTheDocument();
    expect(screen.getByText("--color-border-subtle")).toBeInTheDocument();
    expect(screen.getByText("--color-accent")).toBeInTheDocument();
    expect(screen.getByText("--color-state-danger")).toBeInTheDocument();
  });
});
