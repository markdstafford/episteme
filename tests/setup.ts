import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

// JSDOM does not implement ResizeObserver. Provide a no-op global stub so any
// component that uses it (e.g. FrontmatterBar) doesn't throw.  Individual
// tests that need to inspect or trigger the observer replace this with their
// own vi.stubGlobal / vi.unstubAllGlobals pair.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
);

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(vi.fn()),
}));

// Shiki and mermaid are async and do not initialise in jsdom. These global
// stubs allow any test that renders MarkdownRenderer (which includes the
// CodeBlock node view) to run without network/worker failures.
vi.mock("@/lib/shikiSingleton", () => ({
  getHighlighter: vi.fn().mockResolvedValue({
    codeToHtml: vi
      .fn()
      .mockReturnValue('<pre class="shiki"><code>highlighted</code></pre>'),
    getLoadedLanguages: vi.fn().mockReturnValue(['typescript']),
  }),
}));

vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi
      .fn()
      .mockResolvedValue({ svg: '<svg><text>diagram</text></svg>' }),
  },
}));
