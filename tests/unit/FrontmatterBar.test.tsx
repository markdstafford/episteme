import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FrontmatterBar } from "@/components/FrontmatterBar";

describe("FrontmatterBar", () => {
  it("renders frontmatter fields", () => {
    render(
      <FrontmatterBar
        frontmatter={{ title: "My Doc", status: "draft", author: "Alice" }}
      />
    );
    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText("My Doc")).toBeInTheDocument();
    expect(screen.getByText("status")).toBeInTheDocument();
    expect(screen.getByText("draft")).toBeInTheDocument();
    expect(screen.getByText("author")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("hides internal fields like id", () => {
    render(
      <FrontmatterBar
        frontmatter={{ id: "abc-123", title: "Visible" }}
      />
    );
    expect(screen.queryByText("id")).not.toBeInTheDocument();
    expect(screen.queryByText("abc-123")).not.toBeInTheDocument();
    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText("Visible")).toBeInTheDocument();
  });

  it("returns null when no entries remain after filtering", () => {
    const { container } = render(
      <FrontmatterBar frontmatter={{ id: "abc-123" }} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("formats array values as comma-separated", () => {
    render(
      <FrontmatterBar frontmatter={{ tags: ["react", "typescript"] }} />
    );
    expect(screen.getByText("react, typescript")).toBeInTheDocument();
  });

  it("prioritizes display fields in order", () => {
    render(
      <FrontmatterBar
        frontmatter={{ author: "Bob", title: "First", status: "active" }}
      />
    );
    const labels = screen.getAllByText(/title|status|author/);
    expect(labels[0].textContent).toBe("title");
    expect(labels[1].textContent).toBe("status");
    expect(labels[2].textContent).toBe("author");
  });

  it("container uses design system token styles", () => {
    const { container } = render(
      <FrontmatterBar frontmatter={{ title: "Doc" }} />
    );
    const bar = container.firstChild as HTMLElement;
    expect(bar.style.backgroundColor).toBe("var(--color-bg-subtle)");
    expect(bar.style.borderBottom).toBe("1px solid var(--color-border-subtle)");
    expect(bar.style.paddingBlock).toBe("var(--space-3)");
    expect(bar.style.paddingInline).toBe("var(--padding-content)");
    expect(bar.style.gap).toBe("var(--space-6)");
    expect(bar.classList.contains("overflow-hidden")).toBe(true);
  });

  it("shows non-display fields after display fields", () => {
    render(
      <FrontmatterBar
        frontmatter={{ custom_field: "value", title: "First" }}
      />
    );
    const allLabels = screen
      .getAllByText(/title|custom_field/)
      .map((el) => el.textContent);
    expect(allLabels.indexOf("title")).toBeLessThan(
      allLabels.indexOf("custom_field")
    );
  });

  it("key spans use design system typography", () => {
    render(<FrontmatterBar frontmatter={{ title: "Doc" }} />);
    const keySpan = screen.getByText("title");
    expect(keySpan.style.fontSize).toBe("var(--font-size-ui-sm)");
    expect(keySpan.style.fontWeight).toBe("500");
    expect(keySpan.style.textTransform).toBe("uppercase");
    expect(keySpan.style.letterSpacing).toBe("0.06em");
    expect(keySpan.style.color).toBe("var(--color-text-tertiary)");
  });

  it("value spans use design system typography with truncation", () => {
    render(<FrontmatterBar frontmatter={{ title: "Doc" }} />);
    const valueSpan = screen.getByText("Doc");
    expect(valueSpan.style.fontSize).toBe("var(--font-size-ui-base)");
    expect(valueSpan.style.color).toBe("var(--color-text-secondary)");
    expect(valueSpan.style.maxWidth).toBe("200px");
    expect(valueSpan.style.overflow).toBe("hidden");
    expect(valueSpan.style.textOverflow).toBe("ellipsis");
    expect(valueSpan.style.whiteSpace).toBe("nowrap");
    expect(valueSpan.style.display).toBe("block");
  });
});
