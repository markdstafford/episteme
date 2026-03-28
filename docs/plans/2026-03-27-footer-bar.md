# Footer Bar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a 24px footer bar to the bottom of the app window with sidebar and AI panel toggles, a centered reading time display, and remove the Share and AI panel toggle buttons from the title bar.

**Architecture:** New `FooterBar` component with three zones (left/center/right) whose widths mirror the sidebar and AI panel when visible. Reading time is computed in `DocumentViewer` via a new `computeReadingTime` utility and passed up to `App` via a callback prop. Layout visibility state stays local in `App` for now.

**Tech Stack:** React, TypeScript, Tailwind CSS (via CSS variables), Lucide icons, Vitest + Testing Library

---

### Task 1: Add CSS variables and extract AI panel width

**Files:**
- Modify: `src/app.css`
- Modify: `src/components/ChatView.tsx`

**Step 1: Add `--height-footer` and `--width-ai-panel` to `app.css`**

In `src/app.css`, find the block containing `--height-titlebar: 32px;` (around line 45) and add two new variables immediately after it:

```css
  --height-titlebar: 32px;
  --height-footer: 24px;
  --width-ai-panel: 384px;
```

**Step 2: Replace `w-96` in `ChatView.tsx` with the CSS variable**

In `src/components/ChatView.tsx`, find the outer container element (around line 135):

```tsx
      className="w-96 flex flex-col h-full border-l border-(--color-border-subtle) bg-(--color-bg-base)"
```

Replace with:

```tsx
      className="w-[var(--width-ai-panel)] flex flex-col h-full border-l border-(--color-border-subtle) bg-(--color-bg-base)"
```

**Step 3: Run tests to verify nothing broke**

```bash
npm test
```

Expected: all 569 tests pass. The AI panel visual width should be unchanged (384px = `w-96`).

**Step 4: Commit**

```bash
git add src/app.css src/components/ChatView.tsx
git commit -m "refactor: extract AI panel width and footer height to CSS variables"
```

---

### Task 2: Implement `computeReadingTime` utility

**Files:**
- Create: `src/lib/readingTime.ts`
- Create: `tests/unit/lib/readingTime.test.ts`

**Step 1: Write the failing tests first**

Create `tests/unit/lib/readingTime.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { computeReadingTime } from "@/lib/readingTime";

describe("computeReadingTime", () => {
  it("returns null for null input", () => {
    expect(computeReadingTime(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(computeReadingTime("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(computeReadingTime("   \n\n  ")).toBeNull();
  });

  it("counts words in plain text", () => {
    // 200 words = 1 min
    const text = Array(200).fill("word").join(" ");
    expect(computeReadingTime(text)).toBe(1);
  });

  it("rounds up to the nearest minute", () => {
    // 201 words = 2 min (ceil)
    const text = Array(201).fill("word").join(" ");
    expect(computeReadingTime(text)).toBe(2);
  });

  it("returns 1 for very short text", () => {
    expect(computeReadingTime("Hello world")).toBe(1);
  });

  it("strips markdown headings", () => {
    const text = "# Heading\n## Subheading\nword";
    // Should count "Heading", "Subheading", "word" = 3 words, rounds up to 1
    expect(computeReadingTime(text)).toBe(1);
  });

  it("strips markdown bold and italic syntax", () => {
    const text = "**bold** and _italic_ text";
    // Should count "bold", "and", "italic", "text" = 4 words
    expect(computeReadingTime(text)).toBe(1);
  });

  it("strips code fences", () => {
    const text = "```\nconst x = 1;\n```\nsome words here";
    // Code fence content excluded, "some words here" = 3 words
    expect(computeReadingTime(text)).toBe(1);
  });

  it("strips inline code", () => {
    const text = "Use `const x = 1` in your code";
    // "Use", "in", "your", "code" = 4 words (inline code stripped)
    expect(computeReadingTime(text)).toBe(1);
  });

  it("strips markdown links, keeping link text", () => {
    const text = "[click here](https://example.com) for info";
    // "click", "here", "for", "info" = 4 words
    expect(computeReadingTime(text)).toBe(1);
  });
});
```

**Step 2: Run tests to confirm they fail**

```bash
npm test tests/unit/lib/readingTime.test.ts
```

Expected: FAIL — "Cannot find module '@/lib/readingTime'"

**Step 3: Implement `computeReadingTime`**

Create `src/lib/readingTime.ts`:

```typescript
/**
 * Estimates reading time for a markdown string.
 * Strips markdown syntax before counting words.
 * Assumes 200 words per minute.
 * Returns null for null/empty input.
 */
export function computeReadingTime(markdown: string | null): number | null {
  if (!markdown || !markdown.trim()) return null;

  const stripped = markdown
    // Strip code fences (``` blocks)
    .replace(/```[\s\S]*?```/g, "")
    // Strip inline code
    .replace(/`[^`]*`/g, "")
    // Strip markdown links — keep link text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Strip headings markers
    .replace(/^#{1,6}\s+/gm, "")
    // Strip bold/italic markers
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    // Strip horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, "")
    // Strip blockquote markers
    .replace(/^>\s+/gm, "")
    // Strip image syntax
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "");

  const words = stripped.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  return Math.ceil(words.length / 200);
}
```

**Step 4: Run tests to confirm they pass**

```bash
npm test tests/unit/lib/readingTime.test.ts
```

Expected: all 11 tests pass.

**Step 5: Commit**

```bash
git add src/lib/readingTime.ts tests/unit/lib/readingTime.test.ts
git commit -m "feat: add computeReadingTime utility"
```

---

### Task 3: Build the `FooterBar` component

**Files:**
- Create: `src/components/FooterBar.tsx`
- Create: `tests/unit/components/FooterBar.test.tsx`

**Step 1: Write the failing tests first**

Create `tests/unit/components/FooterBar.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { FooterBar } from "@/components/FooterBar";

const defaultProps = {
  sidebarVisible: true,
  onToggleSidebar: vi.fn(),
  aiPanelOpen: false,
  onToggleAiPanel: vi.fn(),
  readingTime: null,
};

describe("FooterBar", () => {
  it("renders sidebar toggle button", () => {
    render(<FooterBar {...defaultProps} />);
    expect(screen.getByRole("button", { name: /hide sidebar/i })).toBeInTheDocument();
  });

  it("renders AI panel toggle button", () => {
    render(<FooterBar {...defaultProps} />);
    expect(screen.getByRole("button", { name: /show ai panel/i })).toBeInTheDocument();
  });

  it("sidebar toggle aria-label says 'Hide sidebar' when sidebar is visible", () => {
    render(<FooterBar {...defaultProps} sidebarVisible={true} />);
    expect(screen.getByRole("button", { name: /hide sidebar/i })).toBeInTheDocument();
  });

  it("sidebar toggle aria-label says 'Show sidebar' when sidebar is hidden", () => {
    render(<FooterBar {...defaultProps} sidebarVisible={false} />);
    expect(screen.getByRole("button", { name: /show sidebar/i })).toBeInTheDocument();
  });

  it("sidebar toggle is accent-colored when sidebar is open", () => {
    render(<FooterBar {...defaultProps} sidebarVisible={true} />);
    const btn = screen.getByRole("button", { name: /hide sidebar/i });
    expect(btn.style.color).toBe("var(--color-accent)");
  });

  it("sidebar toggle is tertiary-colored when sidebar is hidden", () => {
    render(<FooterBar {...defaultProps} sidebarVisible={false} />);
    const btn = screen.getByRole("button", { name: /show sidebar/i });
    expect(btn.style.color).toBe("var(--color-text-tertiary)");
  });

  it("AI panel toggle is accent-colored when panel is open", () => {
    render(<FooterBar {...defaultProps} aiPanelOpen={true} />);
    const btn = screen.getByRole("button", { name: /hide ai panel/i });
    expect(btn.style.color).toBe("var(--color-accent)");
  });

  it("AI panel toggle is tertiary-colored when panel is closed", () => {
    render(<FooterBar {...defaultProps} aiPanelOpen={false} />);
    const btn = screen.getByRole("button", { name: /show ai panel/i });
    expect(btn.style.color).toBe("var(--color-text-tertiary)");
  });

  it("calls onToggleSidebar when sidebar button is clicked", async () => {
    const onToggle = vi.fn();
    render(<FooterBar {...defaultProps} onToggleSidebar={onToggle} />);
    await userEvent.click(screen.getByRole("button", { name: /hide sidebar/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("calls onToggleAiPanel when AI panel button is clicked", async () => {
    const onToggle = vi.fn();
    render(<FooterBar {...defaultProps} onToggleAiPanel={onToggle} />);
    await userEvent.click(screen.getByRole("button", { name: /show ai panel/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("does not render reading time when readingTime is null", () => {
    render(<FooterBar {...defaultProps} readingTime={null} />);
    expect(screen.queryByText(/min read/i)).not.toBeInTheDocument();
  });

  it("renders reading time when provided", () => {
    render(<FooterBar {...defaultProps} readingTime={5} />);
    expect(screen.getByText("5 min read")).toBeInTheDocument();
  });
});
```

**Step 2: Run tests to confirm they fail**

```bash
npm test tests/unit/components/FooterBar.test.tsx
```

Expected: FAIL — "Cannot find module '@/components/FooterBar'"

**Step 3: Implement `FooterBar`**

Create `src/components/FooterBar.tsx`:

```tsx
import { PanelLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface FooterBarProps {
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
  aiPanelOpen: boolean;
  onToggleAiPanel: () => void;
  readingTime: number | null;
}

export function FooterBar({
  sidebarVisible,
  onToggleSidebar,
  aiPanelOpen,
  onToggleAiPanel,
  readingTime,
}: FooterBarProps) {
  return (
    <div
      style={{
        height: "var(--height-footer)",
        background: "var(--color-bg-app)",
        borderTop: "1px solid var(--color-border-subtle)",
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      {/* Left zone — matches sidebar width when visible */}
      <div
        style={{
          width: sidebarVisible ? "var(--width-sidebar)" : "auto",
          display: "flex",
          alignItems: "center",
          paddingLeft: "var(--space-1)",
          flexShrink: 0,
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label={sidebarVisible ? "Hide sidebar" : "Show sidebar"}
          onClick={onToggleSidebar}
          style={{
            color: sidebarVisible
              ? "var(--color-accent)"
              : "var(--color-text-tertiary)",
          }}
        >
          <PanelLeft size={14} />
        </Button>
      </div>

      {/* Center zone — flex-1, reading time centered */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {readingTime !== null && (
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "var(--font-size-ui-xs)",
              color: "var(--color-text-tertiary)",
            }}
          >
            {readingTime} min read
          </span>
        )}
      </div>

      {/* Right zone — matches AI panel width when open */}
      <div
        style={{
          width: aiPanelOpen ? "var(--width-ai-panel)" : "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingRight: "var(--space-1)",
          flexShrink: 0,
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label={aiPanelOpen ? "Hide AI panel" : "Show AI panel"}
          onClick={onToggleAiPanel}
          style={{
            color: aiPanelOpen
              ? "var(--color-accent)"
              : "var(--color-text-tertiary)",
          }}
        >
          <Sparkles size={14} />
        </Button>
      </div>
    </div>
  );
}
```

**Step 4: Run tests to confirm they pass**

```bash
npm test tests/unit/components/FooterBar.test.tsx
```

Expected: all 13 tests pass.

**Step 5: Commit**

```bash
git add src/components/FooterBar.tsx tests/unit/components/FooterBar.test.tsx
git commit -m "feat: add FooterBar component"
```

---

### Task 4: Wire FooterBar into App and add sidebar visibility state

**Files:**
- Modify: `src/App.tsx`
- Modify: `tests/unit/app.test.tsx`

**Step 1: Update `App.tsx`**

At the top of `App.tsx`, add the import:

```tsx
import { FooterBar } from "@/components/FooterBar";
```

In the `App` function, add two new state variables after the existing `aiPanelOpen` state:

```tsx
const [sidebarVisible, setSidebarVisible] = useState(true);
const [readingTime, setReadingTime] = useState<number | null>(null);
```

In the **loading layout branch** (the `if (isLoading && !folderPath)` return), add `<FooterBar>` just before `{shortcutsPanelOverlay}`:

```tsx
      <FooterBar
        sidebarVisible={sidebarVisible}
        onToggleSidebar={() => setSidebarVisible((v) => !v)}
        aiPanelOpen={aiPanelOpen}
        onToggleAiPanel={() => setAiPanelOpen((v) => !v)}
        readingTime={null}
      />
      {shortcutsPanelOverlay}
```

In the **no-folder layout branch** (the `if (!folderPath)` return), add `<FooterBar>` just before `{shortcutsPanelOverlay}`:

```tsx
      <FooterBar
        sidebarVisible={sidebarVisible}
        onToggleSidebar={() => setSidebarVisible((v) => !v)}
        aiPanelOpen={aiPanelOpen}
        onToggleAiPanel={() => setAiPanelOpen((v) => !v)}
        readingTime={null}
      />
      {shortcutsPanelOverlay}
```

In the **main layout branch** (the final return), wrap `<Sidebar>` with a conditional:

```tsx
        {sidebarVisible && (
          <Sidebar>
            <FileTree />
          </Sidebar>
        )}
```

Also in the main layout branch, add `onReadingTimeChange` to `<DocumentViewer>`:

```tsx
              <DocumentViewer onReadingTimeChange={setReadingTime} />
```

And add `<FooterBar>` just before `{shortcutsPanelOverlay}` in the main branch:

```tsx
      <FooterBar
        sidebarVisible={sidebarVisible}
        onToggleSidebar={() => setSidebarVisible((v) => !v)}
        aiPanelOpen={aiPanelOpen}
        onToggleAiPanel={() => setAiPanelOpen((v) => !v)}
        readingTime={readingTime}
      />
      {shortcutsPanelOverlay}
```

**Step 2: Run tests — expect some to fail**

```bash
npm test tests/unit/app.test.tsx
```

Expected: TypeScript error about `DocumentViewer` not accepting `onReadingTimeChange` prop (that's fine — we'll fix DocumentViewer in the next task). Also expect the existing `TitleBar` AI panel toggle tests in `app.test.tsx` to still pass for now since we haven't removed those from TitleBar yet.

**Step 3: Add App-level tests for new footer behavior**

In `tests/unit/app.test.tsx`, add a new describe block:

```tsx
describe("FooterBar in App", () => {
  it("renders FooterBar in the no-folder layout", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /hide sidebar/i })).toBeInTheDocument();
  });

  it("renders FooterBar in the loading layout", () => {
    useWorkspaceStore.setState({ isLoading: true, folderPath: null });
    render(<App />);
    expect(screen.getByRole("button", { name: /hide sidebar/i })).toBeInTheDocument();
  });

  it("renders FooterBar in the main layout", () => {
    useWorkspaceStore.setState({ folderPath: "/some/path" });
    render(<App />);
    expect(screen.getByRole("button", { name: /hide sidebar/i })).toBeInTheDocument();
  });

  it("hides sidebar when sidebar toggle is clicked", async () => {
    useWorkspaceStore.setState({ folderPath: "/some/path" });
    render(<App />);
    expect(document.querySelector("aside")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /hide sidebar/i }));
    expect(document.querySelector("aside")).not.toBeInTheDocument();
  });

  it("shows sidebar again when toggle is clicked a second time", async () => {
    useWorkspaceStore.setState({ folderPath: "/some/path" });
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: /hide sidebar/i }));
    await userEvent.click(screen.getByRole("button", { name: /show sidebar/i }));
    expect(document.querySelector("aside")).toBeInTheDocument();
  });
});
```

Note: you'll need to add `import userEvent from "@testing-library/user-event";` to the top of `app.test.tsx` if it's not already there.

**Step 4: Commit what compiles (skip until DocumentViewer is updated)**

We'll skip this commit and do it together with Task 5, since `DocumentViewer` needs `onReadingTimeChange` first.

---

### Task 5: Add reading time to DocumentViewer

**Files:**
- Modify: `src/components/DocumentViewer.tsx`
- Modify: `tests/unit/DocumentViewer.test.tsx`

**Step 1: Update `DocumentViewer.tsx`**

Add the import at the top:

```tsx
import { computeReadingTime } from "@/lib/readingTime";
```

Update the component signature to accept the new optional prop:

```tsx
interface DocumentViewerProps {
  onReadingTimeChange?: (minutes: number | null) => void;
}

export function DocumentViewer({ onReadingTimeChange }: DocumentViewerProps = {}) {
```

In the `useEffect` that loads files, after `setContent(parsed.content)`, add:

```tsx
        setContent(parsed.content);
        setFrontmatter(parsed.frontmatter);
        onReadingTimeChange?.(computeReadingTime(parsed.content));
```

In the early-return branch when `!selectedFilePath`, add a call to clear reading time:

```tsx
  useEffect(() => {
    if (!selectedFilePath) {
      setContent(null);
      setFrontmatter(null);
      onReadingTimeChange?.(null);
      return;
    }
```

Also handle errors — in the `catch` block, clear reading time:

```tsx
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setContent(null);
        setFrontmatter(null);
        onReadingTimeChange?.(null);
      }
```

**Step 2: Add tests for the new behavior**

In `tests/unit/components/DocumentViewer.test.tsx`, add:

```tsx
describe("DocumentViewer reading time", () => {
  it("calls onReadingTimeChange with null when no file selected", () => {
    const onReadingTimeChange = vi.fn();
    render(<DocumentViewer onReadingTimeChange={onReadingTimeChange} />);
    expect(onReadingTimeChange).toHaveBeenCalledWith(null);
  });

  it("calls onReadingTimeChange with computed value when file loads", async () => {
    const onReadingTimeChange = vi.fn();
    // 200 words = 1 min
    const content = Array(200).fill("word").join(" ");
    vi.mocked(invoke).mockResolvedValue(content);
    (useFileTreeStore as MockedFunction<typeof useFileTreeStore>).mockImplementation(
      (selector: any) => selector({ selectedFilePath: "/test/doc.md", selectFile: vi.fn() })
    );
    render(<DocumentViewer onReadingTimeChange={onReadingTimeChange} />);
    await waitFor(() => {
      expect(onReadingTimeChange).toHaveBeenCalledWith(1);
    });
  });
});
```

You'll need `waitFor` imported — check the top of the file; it should already be imported from `@testing-library/react`.

**Step 3: Run all tests**

```bash
npm test
```

Expected: all tests pass. This is the first time `App.tsx` + `DocumentViewer.tsx` compile together cleanly.

**Step 4: Commit**

```bash
git add src/components/DocumentViewer.tsx tests/unit/components/DocumentViewer.test.tsx src/App.tsx tests/unit/app.test.tsx
git commit -m "feat: wire FooterBar into App, add reading time to DocumentViewer"
```

---

### Task 6: Clean up TitleBar — remove Share and AI panel toggle

**Files:**
- Modify: `src/components/TitleBar.tsx`
- Modify: `tests/unit/TitleBar.test.tsx`

**Step 1: Update the tests first (they'll fail against current TitleBar)**

In `tests/unit/TitleBar.test.tsx`, delete the entire `"AI panel toggle button"` describe block (lines 31–50). Then add a test asserting those buttons are gone:

```tsx
describe("TitleBar removed controls", () => {
  it("does not render an AI panel toggle button", () => {
    render(<TitleBar folderPath={null} />);
    expect(screen.queryByRole("button", { name: /toggle ai panel/i })).not.toBeInTheDocument();
  });

  it("does not render a Share button", () => {
    render(<TitleBar folderPath={null} />);
    expect(screen.queryByRole("button", { name: /share/i })).not.toBeInTheDocument();
  });
});
```

**Step 2: Run the new tests to confirm they fail**

```bash
npm test tests/unit/TitleBar.test.tsx
```

Expected: FAIL — "AI panel toggle button" and "Share" buttons are still present.

**Step 3: Update `TitleBar.tsx`**

Remove the `aiPanelOpen` and `onToggleAiPanel` props from the `TitleBarProps` interface:

```tsx
interface TitleBarProps {
  folderPath: string | null;
  onStartAuthoring?: (skillName: string | null) => void;
}
```

Remove the `MessageSquare` import (no longer needed) and the `Share2` import.

In the JSX, remove the entire right-side section's Share button and AI panel toggle button. The right section should only contain the New Document button:

```tsx
        {/* Section 3: actions — right-aligned, no-drag */}
        <div
          className="titlebar-no-drag"
          style={{
            width: 112,
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingRight: "var(--space-2)",
            flexShrink: 0,
          }}
        >
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="New document"
            disabled={folderPath === null}
            onClick={() => setDialogOpen(true)}
            style={{ color: "var(--color-text-tertiary)" }}
          >
            <Plus size={16} />
          </Button>
        </div>
```

**Step 4: Remove `aiPanelOpen` and `onToggleAiPanel` from TitleBar call sites in `App.tsx`**

In `App.tsx`, update all three `<TitleBar>` usages to remove the `aiPanelOpen` and `onToggleAiPanel` props. Each should now look like:

```tsx
<TitleBar
  folderPath={null}
  onStartAuthoring={() => {}}
/>
```

(or `folderPath={folderPath}` for the main layout branch).

**Step 5: Run all tests**

```bash
npm test
```

Expected: all tests pass.

**Step 6: Commit**

```bash
git add src/components/TitleBar.tsx tests/unit/TitleBar.test.tsx src/App.tsx
git commit -m "feat: remove Share and AI panel toggle from TitleBar, moved to FooterBar"
```

---

### Task 7: Full test run and smoke check

**Step 1: Run the complete test suite**

```bash
npm test
```

Expected: all tests pass (should be 580+ given new tests added).

**Step 2: Start the dev server and verify visually**

```bash
npm run tauri dev
```

Check:
- Footer bar appears at the bottom of all three layout states (loading, no-folder, workspace)
- Sidebar toggle hides/shows the file tree; icon color flips correctly
- AI panel toggle opens/closes the chat panel; icon color flips correctly
- Reading time appears in center when a document is open, absent when nothing is selected
- Center zone stays visually centered under the document viewer as panels open/close
- TitleBar no longer shows Share or AI panel toggle buttons

**Step 3: Commit if any fixes were needed, then push**

```bash
git add -p
git commit -m "fix: <describe any visual fixes>"
```
