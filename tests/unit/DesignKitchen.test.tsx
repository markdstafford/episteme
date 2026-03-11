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

  it("renders typography token samples", () => {
    render(<DesignKitchen onClose={vi.fn()} />);
    expect(screen.getByText("--font-size-ui-xs")).toBeInTheDocument();
    expect(screen.getByText("--font-size-doc-base")).toBeInTheDocument();
    expect(screen.getByText("--font-ui")).toBeInTheDocument();
    expect(screen.getByText("--font-mono")).toBeInTheDocument();
  });

  it("renders spacing tokens", () => {
    render(<DesignKitchen onClose={vi.fn()} />);
    expect(screen.getByText("--space-1")).toBeInTheDocument();
    expect(screen.getByText("--space-32")).toBeInTheDocument();
  });

  it("renders radius tokens", () => {
    render(<DesignKitchen onClose={vi.fn()} />);
    expect(screen.getByText("--radius-base")).toBeInTheDocument();
    expect(screen.getByText("--radius-full")).toBeInTheDocument();
  });

  it("renders shadow tokens", () => {
    render(<DesignKitchen onClose={vi.fn()} />);
    expect(screen.getByText("--shadow-sm")).toBeInTheDocument();
    expect(screen.getByText("--shadow-lg")).toBeInTheDocument();
  });

  it("renders motion tokens", () => {
    render(<DesignKitchen onClose={vi.fn()} />);
    expect(screen.getByText("--duration-instant")).toBeInTheDocument();
    expect(screen.getByText("--duration-slow")).toBeInTheDocument();
  });

  it("renders all button variants", () => {
    render(<DesignKitchen onClose={vi.fn()} />);
    expect(screen.getAllByText("Primary").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Secondary").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ghost").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Destructive").length).toBeGreaterThan(0);
  });

  it("renders input states", () => {
    render(<DesignKitchen onClose={vi.fn()} />);
    expect(screen.getByPlaceholderText("Default input")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Error input")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Disabled input")).toBeInTheDocument();
  });

  it("renders all badge variants", () => {
    render(<DesignKitchen onClose={vi.fn()} />);
    expect(screen.getByText("Neutral")).toBeInTheDocument();
    // "Accent" also appears as a color group label, so assert at least one match
    expect(screen.getAllByText("Accent").length).toBeGreaterThan(0);
    expect(screen.getByText("Danger")).toBeInTheDocument();
    expect(screen.getByText("Warning")).toBeInTheDocument();
    expect(screen.getByText("Success")).toBeInTheDocument();
  });

  it("renders sample sidebar panel", () => {
    render(<DesignKitchen onClose={vi.fn()} />);
    expect(screen.getByText("Documents")).toBeInTheDocument();
    expect(screen.getByText("Getting Started")).toBeInTheDocument();
  });

  it("renders sample dialog trigger button", () => {
    render(<DesignKitchen onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: /open sample dialog/i })).toBeInTheDocument();
  });

  it("opens sample dialog when trigger is clicked", async () => {
    render(<DesignKitchen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /open sample dialog/i }));
    // findAllByText because "Sample Dialog" also appears as a section label
    const matches = await screen.findAllByText("Sample Dialog");
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it("renders context menu trigger button", () => {
    render(<DesignKitchen onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: /open sample context menu/i })).toBeInTheDocument();
  });
});
