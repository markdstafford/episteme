import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { FrontmatterBar, calculateVisibleCount } from "@/components/FrontmatterBar";

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

describe("calculateVisibleCount", () => {
  it("returns total count when all pairs fit", () => {
    // 80 + 24 + 100 + 24 + 90 = 318 <= 500
    expect(calculateVisibleCount(500, [80, 100, 90])).toBe(3);
  });

  it("returns 2 when third pair would overflow", () => {
    // 80 + 24 + 100 = 204 fits; + 24 + 90 = 318 > 300
    expect(calculateVisibleCount(300, [80, 100, 90])).toBe(2);
  });

  it("returns 0 when container is narrower than first pair", () => {
    expect(calculateVisibleCount(10, [80, 100])).toBe(0);
  });

  it("returns 1 when only first pair fits", () => {
    // 80 fits; 80 + 24 + 100 = 204 > 100
    expect(calculateVisibleCount(100, [80, 100])).toBe(1);
  });
});

describe("FrontmatterBar overflow badge", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      vi.fn().mockImplementation(function (this: any, cb: ResizeObserverCallback) {
        this.observe = vi.fn();
        this.disconnect = vi.fn();
        this._trigger = () => cb([], {} as ResizeObserver);
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows no badge when all pairs fit (initial render)", () => {
    render(
      <FrontmatterBar frontmatter={{ title: "Doc", status: "draft" }} />
    );
    expect(screen.queryByText(/\+\d+ more/)).not.toBeInTheDocument();
  });

  it("shows +N more badge when pairs overflow", async () => {
    const { container } = render(
      <FrontmatterBar
        frontmatter={{ title: "Doc", status: "draft", author: "Alice" }}
      />
    );

    const bar = container.firstChild as HTMLElement;
    Object.defineProperty(bar, "offsetWidth", { value: 50, configurable: true });
    // All 3 pairs are always in DOM now
    Array.from(bar.querySelectorAll("[data-pair]")).forEach((el) => {
      Object.defineProperty(el, "offsetWidth", { value: 80, configurable: true });
    });

    await act(async () => {
      (vi.mocked(ResizeObserver).mock.results[0].value as any)._trigger();
    });

    expect(screen.getByText("+3 more")).toBeInTheDocument();
  });

  it("badge disappears when container becomes wide enough", async () => {
    const { container } = render(
      <FrontmatterBar
        frontmatter={{ title: "Doc", status: "draft", author: "Alice" }}
      />
    );

    const bar = container.firstChild as HTMLElement;
    const pairEls = Array.from(bar.querySelectorAll("[data-pair]"));

    // First: trigger overflow (narrow)
    Object.defineProperty(bar, "offsetWidth", { value: 50, configurable: true });
    pairEls.forEach((el) => {
      Object.defineProperty(el, "offsetWidth", { value: 80, configurable: true });
    });
    await act(async () => {
      (vi.mocked(ResizeObserver).mock.results[0].value as any)._trigger();
    });
    expect(screen.getByText("+3 more")).toBeInTheDocument();

    // Then: widen container so all pairs fit
    Object.defineProperty(bar, "offsetWidth", { value: 500, configurable: true });
    await act(async () => {
      (vi.mocked(ResizeObserver).mock.results[0].value as any)._trigger();
    });
    expect(screen.queryByText(/\+\d+ more/)).not.toBeInTheDocument();
  });

  it("badge uses neutral badge token styles", async () => {
    const { container } = render(
      <FrontmatterBar
        frontmatter={{ title: "Doc", status: "draft", author: "Alice" }}
      />
    );

    const bar = container.firstChild as HTMLElement;
    Object.defineProperty(bar, "offsetWidth", { value: 50, configurable: true });
    Array.from(bar.querySelectorAll("[data-pair]")).forEach((el) => {
      Object.defineProperty(el, "offsetWidth", { value: 80, configurable: true });
    });

    await act(async () => {
      (vi.mocked(ResizeObserver).mock.results[0].value as any)._trigger();
    });

    // The badge text is in the inner <span>; outer <div> has data-badge and positioning
    const badgeText = screen.getByText("+3 more");
    expect(badgeText.style.backgroundColor).toBe("var(--color-bg-hover)");
    expect(badgeText.style.color).toBe("var(--color-text-secondary)");
    expect(badgeText.style.fontSize).toBe("var(--font-size-ui-xs)");
    expect(badgeText.style.borderRadius).toBe("var(--radius-sm)");
  });
});
