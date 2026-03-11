import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Button } from "@/components/ui/Button";

describe("Button", () => {
  describe("defaults", () => {
    it("renders as a button element", () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("defaults to secondary variant and base size", () => {
      render(<Button>Click me</Button>);
      const btn = screen.getByRole("button");
      expect(btn).toHaveStyle({
        backgroundColor: "var(--color-bg-elevated)",
        color: "var(--color-text-primary)",
        height: "var(--height-control-base)",
      });
    });

    it("renders children", () => {
      render(<Button>Save</Button>);
      expect(screen.getByText("Save")).toBeInTheDocument();
    });
  });

  describe("variants", () => {
    // jsdom does not resolve CSS custom properties, so we assert on the raw
    // inline style string rather than computed values.

    it("primary: uses accent bg and white text with no border", () => {
      render(<Button variant="primary">Save</Button>);
      const btn = screen.getByRole("button");
      expect(btn.style.backgroundColor).toBe("var(--color-accent)");
      expect(btn.style.color).toBe("white");
      expect(btn.style.borderStyle).toBe("none");
    });

    it("secondary: uses elevated bg, primary text, and 1px border", () => {
      render(<Button variant="secondary">Cancel</Button>);
      const btn = screen.getByRole("button");
      expect(btn.style.backgroundColor).toBe("var(--color-bg-elevated)");
      expect(btn.style.color).toBe("var(--color-text-primary)");
      expect(btn.style.border).toBe("1px solid var(--color-border-default)");
    });

    it("ghost: uses transparent bg, secondary text, no border", () => {
      render(<Button variant="ghost">More</Button>);
      const btn = screen.getByRole("button");
      expect(btn.style.backgroundColor).toBe("transparent");
      expect(btn.style.color).toBe("var(--color-text-secondary)");
      expect(btn.style.borderStyle).toBe("none");
    });

    it("destructive: uses danger bg and white text with no border", () => {
      render(<Button variant="destructive">Delete</Button>);
      const btn = screen.getByRole("button");
      expect(btn.style.backgroundColor).toBe("var(--color-state-danger)");
      expect(btn.style.color).toBe("white");
      expect(btn.style.borderStyle).toBe("none");
    });
  });

  describe("sizes", () => {
    it("base size: height is --height-control-base", () => {
      render(<Button size="base">Click</Button>);
      expect(screen.getByRole("button")).toHaveStyle({
        height: "var(--height-control-base)",
      });
    });

    it("sm size: height is --height-control-sm", () => {
      render(<Button size="sm">Click</Button>);
      expect(screen.getByRole("button")).toHaveStyle({
        height: "var(--height-control-sm)",
      });
    });

    it("base size uses --padding-control", () => {
      render(<Button size="base">Click</Button>);
      expect(screen.getByRole("button")).toHaveStyle({
        padding: "var(--padding-control)",
      });
    });
  });

  describe("typography", () => {
    it("uses --font-size-ui-base and font-weight 400", () => {
      render(<Button>Text</Button>);
      expect(screen.getByRole("button")).toHaveStyle({
        fontSize: "var(--font-size-ui-base)",
        fontWeight: "400",
      });
    });
  });

  describe("border radius", () => {
    it("uses --radius-base", () => {
      render(<Button>Text</Button>);
      expect(screen.getByRole("button")).toHaveStyle({
        borderRadius: "var(--radius-base)",
      });
    });
  });

  describe("transitions", () => {
    it("includes background and color transitions with --duration-fast", () => {
      render(<Button>Text</Button>);
      const style = screen.getByRole("button").style.transition;
      expect(style).toContain("var(--duration-fast)");
    });
  });

  describe("disabled state", () => {
    it("has disabled attribute when disabled prop is set", () => {
      render(<Button disabled>Click</Button>);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("applies opacity 0.4 when disabled", () => {
      render(<Button disabled>Click</Button>);
      expect(screen.getByRole("button")).toHaveStyle({ opacity: "0.4" });
    });

    it("applies cursor not-allowed when disabled", () => {
      render(<Button disabled>Click</Button>);
      expect(screen.getByRole("button")).toHaveStyle({
        cursor: "not-allowed",
      });
    });

    it("does not call onClick when disabled", () => {
      const onClick = vi.fn();
      render(
        <Button disabled onClick={onClick}>
          Click
        </Button>,
      );
      fireEvent.click(screen.getByRole("button"));
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe("hover behaviour", () => {
    it("changes background on mouse enter and restores on mouse leave", () => {
      render(<Button variant="primary">Hover</Button>);
      const btn = screen.getByRole("button");
      fireEvent.mouseEnter(btn);
      expect(btn).toHaveStyle({
        backgroundColor: "var(--color-accent-hover)",
      });
      fireEvent.mouseLeave(btn);
      expect(btn).toHaveStyle({
        backgroundColor: "var(--color-accent)",
      });
    });

    it("does not change bg on mouse enter when disabled", () => {
      render(
        <Button variant="primary" disabled>
          Hover
        </Button>,
      );
      const btn = screen.getByRole("button");
      fireEvent.mouseEnter(btn);
      // Should still show original accent bg, not hover
      expect(btn).toHaveStyle({
        backgroundColor: "var(--color-accent)",
      });
    });
  });

  describe("icon-only mode", () => {
    it("is square (width == height) when aria-label provided with no children", () => {
      render(<Button aria-label="Close" />);
      const btn = screen.getByRole("button");
      expect(btn).toHaveStyle({
        width: "var(--height-control-base)",
        height: "var(--height-control-base)",
        padding: "0",
      });
    });

    it("is square at sm size when icon-only", () => {
      render(<Button aria-label="Close" size="sm" />);
      const btn = screen.getByRole("button");
      expect(btn).toHaveStyle({
        width: "var(--height-control-sm)",
        height: "var(--height-control-sm)",
      });
    });

    it("explicit iconOnly prop triggers icon-only mode even with children", () => {
      render(<Button iconOnly aria-label="Settings">icon</Button>);
      const btn = screen.getByRole("button");
      expect(btn).toHaveStyle({
        width: "var(--height-control-base)",
        padding: "0",
      });
    });

    it("does not enter icon-only mode when children are present without iconOnly prop", () => {
      render(<Button aria-label="Save document">Save</Button>);
      const btn = screen.getByRole("button");
      // Should have normal padding, not icon-only zero padding
      expect(btn).toHaveStyle({
        padding: "var(--padding-control)",
      });
    });
  });

  describe("HTML attributes passthrough", () => {
    it("forwards data attributes", () => {
      render(<Button data-testid="my-btn">Click</Button>);
      expect(screen.getByTestId("my-btn")).toBeInTheDocument();
    });

    it("forwards type attribute", () => {
      render(<Button type="submit">Submit</Button>);
      expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
    });

    it("calls onClick when clicked", () => {
      const onClick = vi.fn();
      render(<Button onClick={onClick}>Click</Button>);
      fireEvent.click(screen.getByRole("button"));
      expect(onClick).toHaveBeenCalledOnce();
    });

    it("merges external style prop", () => {
      render(<Button style={{ marginTop: "8px" }}>Click</Button>);
      expect(screen.getByRole("button")).toHaveStyle({ marginTop: "8px" });
    });
  });

  describe("focus ring", () => {
    it("applies focus ring outline on focus", () => {
      render(<Button>Focus me</Button>);
      const btn = screen.getByRole("button");
      fireEvent.focus(btn);
      expect(btn.style.outline).toBe("2px solid var(--color-accent)");
      expect(btn.style.outlineOffset).toBe("2px");
    });

    it("removes focus ring on blur", () => {
      render(<Button>Focus me</Button>);
      const btn = screen.getByRole("button");
      fireEvent.focus(btn);
      fireEvent.blur(btn);
      expect(btn.style.outline).toBe("none");
    });
  });
});
