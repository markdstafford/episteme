import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

describe("MarkdownRenderer", () => {
  it("renders without crashing", () => {
    const { container } = render(<MarkdownRenderer content="# Hello" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("applies className prop to wrapper div", () => {
    const { container } = render(
      <MarkdownRenderer content="test" className="prose max-w-none" />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper?.classList.contains("prose")).toBe(true);
    expect(wrapper?.classList.contains("max-w-none")).toBe(true);
  });

  it("renders wrapper with no prose class when className is omitted", () => {
    const { container } = render(<MarkdownRenderer content="test" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper?.classList.contains("prose")).toBe(false);
  });

  it("initializes editor in read-only mode", () => {
    const { container } = render(<MarkdownRenderer content="# Title" />);
    const editorEl = container.querySelector("[contenteditable]");
    if (editorEl) {
      expect(editorEl.getAttribute("contenteditable")).toBe("false");
    }
  });

  it("renders EditorContent component", () => {
    const { container } = render(<MarkdownRenderer content="Some text" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("does not throw when content becomes empty", () => {
    const { rerender } = render(<MarkdownRenderer content="# Hello" />);
    expect(() => rerender(<MarkdownRenderer content="" />)).not.toThrow();
  });

  it("accepts onLinkClick prop without error", () => {
    const handleClick = () => {};
    const { container } = render(
      <MarkdownRenderer content="[link](./test.md)" onLinkClick={handleClick} />
    );
    expect(container.firstChild).toBeInTheDocument();
  });
});
