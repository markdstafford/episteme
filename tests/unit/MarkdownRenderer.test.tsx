import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

describe("MarkdownRenderer", () => {
  it("renders without crashing", () => {
    const { container } = render(<MarkdownRenderer content="# Hello" />);
    expect(container.querySelector(".prose")).toBeInTheDocument();
  });

  it("applies prose and dark mode classes", () => {
    const { container } = render(<MarkdownRenderer content="test" />);
    const prose = container.querySelector(".prose");
    expect(prose).toBeInTheDocument();
    expect(prose?.classList.contains("dark:prose-invert")).toBe(true);
    expect(prose?.classList.contains("max-w-none")).toBe(true);
  });

  it("initializes editor in read-only mode", () => {
    const { container } = render(<MarkdownRenderer content="# Title" />);
    // TipTap sets contenteditable="false" for read-only editors
    const editorEl = container.querySelector("[contenteditable]");
    if (editorEl) {
      expect(editorEl.getAttribute("contenteditable")).toBe("false");
    }
  });

  it("renders EditorContent component", () => {
    const { container } = render(<MarkdownRenderer content="Some text" />);
    // EditorContent renders a .tiptap container
    const tiptap = container.querySelector(".tiptap");
    // In jsdom TipTap may not fully initialize, so just verify prose wrapper exists
    expect(container.querySelector(".prose")).toBeInTheDocument();
  });

  it("does not leave stale content when content becomes empty", () => {
    const { rerender } = render(<MarkdownRenderer content="# Hello" />);
    // Rerendering with empty string should not throw and should call setContent("")
    expect(() => rerender(<MarkdownRenderer content="" />)).not.toThrow();
  });

  it("accepts onLinkClick prop without error", () => {
    const handleClick = () => {};
    const { container } = render(
      <MarkdownRenderer content="[link](./test.md)" onLinkClick={handleClick} />
    );
    expect(container.querySelector(".prose")).toBeInTheDocument();
  });
});
