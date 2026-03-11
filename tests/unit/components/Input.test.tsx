import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { Input } from "@/components/ui/Input";

describe("Input", () => {
  describe("defaults", () => {
    it("renders an input element", () => {
      render(<Input />);
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("applies base dimensions", () => {
      render(<Input />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveStyle({
        height: "var(--height-control-base)",
        padding: "0 10px",
        borderRadius: "var(--radius-base)",
        color: "var(--color-text-primary)",
        backgroundColor: "var(--color-bg-subtle)",
      });
    });

    it("applies a 1px solid default border", () => {
      render(<Input />);
      const input = screen.getByRole("textbox");
      // jsdom cannot resolve CSS custom properties through getComputedStyle for
      // border shorthand; assert on the raw inline style value instead.
      expect(input.style.border).toBe("1px solid var(--color-border-default)");
    });

    it("uses --font-size-ui-base", () => {
      render(<Input />);
      expect(screen.getByRole("textbox")).toHaveStyle({
        fontSize: "var(--font-size-ui-base)",
      });
    });

    it("suppresses browser default outline", () => {
      render(<Input />);
      expect(screen.getByRole("textbox")).toHaveStyle({ outline: "none" });
    });
  });

  describe("transitions", () => {
    it("includes border-color and box-shadow transitions with --duration-fast", () => {
      render(<Input />);
      const style = screen.getByRole("textbox").style.transition;
      expect(style).toContain("border-color");
      expect(style).toContain("box-shadow");
      expect(style).toContain("var(--duration-fast)");
    });
  });

  describe("placeholder attribute", () => {
    it("has data-ui-input attribute for CSS placeholder targeting", () => {
      render(<Input placeholder="Search…" />);
      const input = screen.getByPlaceholderText("Search…");
      expect(input).toHaveAttribute("data-ui-input");
    });
  });

  describe("hover state", () => {
    it("applies strong border on mouse enter", () => {
      render(<Input />);
      const input = screen.getByRole("textbox");
      fireEvent.mouseEnter(input);
      // Use direct style property — jsdom's getComputedStyle does not resolve
      // CSS custom properties for borderColor.
      expect(input.style.borderColor).toBe("var(--color-border-strong)");
    });

    it("restores default border on mouse leave", () => {
      render(<Input />);
      const input = screen.getByRole("textbox");
      fireEvent.mouseEnter(input);
      fireEvent.mouseLeave(input);
      expect(input.style.borderColor).toBe("");
    });

    it("does not apply hover border when disabled", () => {
      render(<Input disabled />);
      const input = screen.getByRole("textbox");
      fireEvent.mouseEnter(input);
      expect(input.style.borderColor).toBe("var(--color-border-subtle)");
    });
  });

  describe("focus state", () => {
    it("applies accent border and shadow on focus", () => {
      render(<Input />);
      const input = screen.getByRole("textbox");
      fireEvent.focus(input);
      expect(input.style.borderColor).toBe("var(--color-accent)");
      expect(input.style.boxShadow).toBe("0 0 0 2px var(--color-accent-subtle)");
    });

    it("removes focus styles on blur", () => {
      render(<Input />);
      const input = screen.getByRole("textbox");
      fireEvent.focus(input);
      fireEvent.blur(input);
      expect(input.style.borderColor).toBe("");
      expect(input.style.boxShadow).toBe("");
    });
  });

  describe("error state", () => {
    it("applies danger border and shadow when error=true", () => {
      render(<Input error />);
      const input = screen.getByRole("textbox");
      expect(input.style.borderColor).toBe("var(--color-state-danger)");
      expect(input.style.boxShadow).toBe(
        "0 0 0 2px var(--color-state-danger-subtle)",
      );
    });

    it("error styles take precedence over focus styles", () => {
      render(<Input error />);
      const input = screen.getByRole("textbox");
      fireEvent.focus(input);
      expect(input.style.borderColor).toBe("var(--color-state-danger)");
      expect(input.style.boxShadow).toBe(
        "0 0 0 2px var(--color-state-danger-subtle)",
      );
    });

    it("no error styles when error is false or omitted", () => {
      render(<Input />);
      const input = screen.getByRole("textbox");
      expect(input.style.borderColor).toBe("");
      expect(input.style.boxShadow).toBe("");
    });
  });

  describe("disabled state", () => {
    it("has disabled attribute when disabled prop set", () => {
      render(<Input disabled />);
      expect(screen.getByRole("textbox")).toBeDisabled();
    });

    it("applies subtle border and 0.4 opacity when disabled", () => {
      render(<Input disabled />);
      const input = screen.getByRole("textbox");
      // borderColor: direct check due to jsdom CSS custom property limitation
      expect(input.style.borderColor).toBe("var(--color-border-subtle)");
      expect(input).toHaveStyle({ opacity: "0.4" });
    });
  });

  describe("ref forwarding", () => {
    it("forwards ref to the underlying input element", () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref} />);
      expect(ref.current).not.toBeNull();
      expect(ref.current?.tagName).toBe("INPUT");
    });

    it("ref.current is focusable", () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref} />);
      expect(() => ref.current?.focus()).not.toThrow();
    });
  });

  describe("HTML attribute passthrough", () => {
    it("forwards data attributes", () => {
      render(<Input data-testid="my-input" />);
      expect(screen.getByTestId("my-input")).toBeInTheDocument();
    });

    it("forwards type attribute", () => {
      // password inputs have no ARIA textbox role; query by test id instead
      render(<Input type="password" data-testid="pw-input" />);
      expect(screen.getByTestId("pw-input")).toHaveAttribute("type", "password");
    });

    it("merges external style prop", () => {
      render(<Input style={{ marginTop: "8px" }} />);
      expect(screen.getByRole("textbox")).toHaveStyle({ marginTop: "8px" });
    });

    it("calls onChange when value changes", () => {
      const onChange = vi.fn();
      render(<Input onChange={onChange} />);
      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "hello" },
      });
      expect(onChange).toHaveBeenCalledOnce();
    });

    it("calls onMouseEnter and onMouseLeave when provided", () => {
      const onMouseEnter = vi.fn();
      const onMouseLeave = vi.fn();
      render(<Input onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />);
      const input = screen.getByRole("textbox");
      fireEvent.mouseEnter(input);
      expect(onMouseEnter).toHaveBeenCalledOnce();
      fireEvent.mouseLeave(input);
      expect(onMouseLeave).toHaveBeenCalledOnce();
    });

    it("calls onFocus and onBlur when provided", () => {
      const onFocus = vi.fn();
      const onBlur = vi.fn();
      render(<Input onFocus={onFocus} onBlur={onBlur} />);
      const input = screen.getByRole("textbox");
      fireEvent.focus(input);
      expect(onFocus).toHaveBeenCalledOnce();
      fireEvent.blur(input);
      expect(onBlur).toHaveBeenCalledOnce();
    });
  });
});
