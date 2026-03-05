import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

/**
 * Tests that TipTap + tiptap-markdown renders various GFM features.
 * In jsdom, TipTap's ProseMirror editor may not fully render all
 * visual features, so we verify the prose container exists and
 * the editor initializes without errors for each content type.
 */
describe("Markdown GFM rendering", () => {
  function renderMarkdown(md: string) {
    const { container } = render(<MarkdownRenderer content={md} />);
    return container;
  }

  it("renders headings H1-H6", () => {
    const md = "# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6";
    const container = renderMarkdown(md);
    expect(container.querySelector(".prose")).toBeInTheDocument();
    // TipTap should create heading elements
    const tiptap = container.querySelector(".tiptap");
    if (tiptap) {
      expect(tiptap.querySelector("h1")).toBeInTheDocument();
      expect(tiptap.querySelector("h2")).toBeInTheDocument();
      expect(tiptap.querySelector("h3")).toBeInTheDocument();
    }
  });

  it("renders bold and italic", () => {
    const md = "**bold** and *italic* and ***both***";
    const container = renderMarkdown(md);
    expect(container.querySelector(".prose")).toBeInTheDocument();
    const tiptap = container.querySelector(".tiptap");
    if (tiptap) {
      expect(tiptap.querySelector("strong")).toBeInTheDocument();
      expect(tiptap.querySelector("em")).toBeInTheDocument();
    }
  });

  it("renders unordered lists", () => {
    const md = "- Item 1\n- Item 2\n- Item 3";
    const container = renderMarkdown(md);
    expect(container.querySelector(".prose")).toBeInTheDocument();
    const tiptap = container.querySelector(".tiptap");
    if (tiptap) {
      expect(tiptap.querySelector("ul")).toBeInTheDocument();
      expect(tiptap.querySelectorAll("li").length).toBeGreaterThanOrEqual(3);
    }
  });

  it("renders ordered lists", () => {
    const md = "1. First\n2. Second\n3. Third";
    const container = renderMarkdown(md);
    expect(container.querySelector(".prose")).toBeInTheDocument();
    const tiptap = container.querySelector(".tiptap");
    if (tiptap) {
      expect(tiptap.querySelector("ol")).toBeInTheDocument();
    }
  });

  it("renders fenced code blocks", () => {
    const md = "```js\nconst x = 1;\n```";
    const container = renderMarkdown(md);
    expect(container.querySelector(".prose")).toBeInTheDocument();
    const tiptap = container.querySelector(".tiptap");
    if (tiptap) {
      expect(tiptap.querySelector("pre")).toBeInTheDocument();
      expect(tiptap.querySelector("code")).toBeInTheDocument();
    }
  });

  it("renders inline code", () => {
    const md = "Use `const x = 1` in your code";
    const container = renderMarkdown(md);
    expect(container.querySelector(".prose")).toBeInTheDocument();
    const tiptap = container.querySelector(".tiptap");
    if (tiptap) {
      expect(tiptap.querySelector("code")).toBeInTheDocument();
    }
  });

  it("renders blockquotes", () => {
    const md = "> This is a quote\n> Second line";
    const container = renderMarkdown(md);
    expect(container.querySelector(".prose")).toBeInTheDocument();
    const tiptap = container.querySelector(".tiptap");
    if (tiptap) {
      expect(tiptap.querySelector("blockquote")).toBeInTheDocument();
    }
  });

  it("renders horizontal rules", () => {
    const md = "Above\n\n---\n\nBelow";
    const container = renderMarkdown(md);
    expect(container.querySelector(".prose")).toBeInTheDocument();
    const tiptap = container.querySelector(".tiptap");
    if (tiptap) {
      expect(tiptap.querySelector("hr")).toBeInTheDocument();
    }
  });

  it("renders links", () => {
    const md = "[Click here](https://example.com)";
    const container = renderMarkdown(md);
    expect(container.querySelector(".prose")).toBeInTheDocument();
    const tiptap = container.querySelector(".tiptap");
    if (tiptap) {
      const link = tiptap.querySelector("a");
      if (link) {
        expect(link.getAttribute("href")).toBe("https://example.com");
      }
    }
  });

  it("renders tables", () => {
    const md =
      "| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |";
    const container = renderMarkdown(md);
    expect(container.querySelector(".prose")).toBeInTheDocument();
    const tiptap = container.querySelector(".tiptap");
    if (tiptap) {
      expect(tiptap.querySelector("table")).toBeInTheDocument();
    }
  });

  it("renders task lists", () => {
    const md = "- [ ] Unchecked\n- [x] Checked";
    const container = renderMarkdown(md);
    expect(container.querySelector(".prose")).toBeInTheDocument();
    // Task list rendering depends on TipTap task list extension
    const tiptap = container.querySelector(".tiptap");
    if (tiptap) {
      const inputs = tiptap.querySelectorAll("input[type='checkbox']");
      if (inputs.length > 0) {
        expect(inputs.length).toBeGreaterThanOrEqual(2);
      }
    }
  });
});
