import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { KbdShortcut } from "@/components/ui/Kbd";

describe("KbdShortcut", () => {
  it("renders a single key chip with no separator", () => {
    render(<KbdShortcut keys={["1"]} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.queryByText("+")).not.toBeInTheDocument();
  });

  it("renders two key chips with no separator by default", () => {
    render(<KbdShortcut keys={["⌘", ","]} />);
    expect(screen.getByText("⌘")).toBeInTheDocument();
    expect(screen.getByText(",")).toBeInTheDocument();
    expect(screen.queryByText("+")).not.toBeInTheDocument();
  });

  it("renders three key chips with no separator by default", () => {
    render(<KbdShortcut keys={["⌘", "⇧", "K"]} />);
    expect(screen.getByText("⌘")).toBeInTheDocument();
    expect(screen.getByText("⇧")).toBeInTheDocument();
    expect(screen.getByText("K")).toBeInTheDocument();
    expect(screen.queryByText("+")).not.toBeInTheDocument();
  });

  it("uses a custom separator when provided", () => {
    render(<KbdShortcut keys={["⌘", ","]} separator="-" />);
    expect(screen.getByText("-")).toBeInTheDocument();
    expect(screen.queryByText("+")).not.toBeInTheDocument();
  });

  it("renders outer element as kbd", () => {
    const { container } = render(<KbdShortcut keys={["⌘", ","]} />);
    const outer = container.firstChild as HTMLElement;
    expect(outer.tagName).toBe("KBD");
  });

  it("renders each key chip as a kbd element", () => {
    const { container } = render(<KbdShortcut keys={["⌘", ","]} />);
    const kbdElements = container.querySelectorAll("kbd kbd");
    expect(kbdElements).toHaveLength(2);
  });

  it("applies correct visual styles to each key chip", () => {
    render(<KbdShortcut keys={["1"]} />);
    const chip = screen.getByText("1");
    expect(chip.style.background).toBe("var(--color-bg-hover)");
    expect(chip.style.border).toBe("1px solid var(--color-border-default)");
    expect(chip.style.borderRadius).toBe("var(--radius-sm)");
    expect(chip.style.fontSize).toBe("var(--font-size-ui-xs)");
    expect(chip.style.fontWeight).toBe("500"); // jsdom normalizes number to string
    expect(chip.style.padding).toBe("2px 5px");
    expect(chip.style.display).toBe("inline-flex");
  });
});
