# Footer File Info Popover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a document is open, clicking the "X min read" label in the footer opens a popover showing the file path and frontmatter fields.

**Architecture:** Frontmatter is plumbed from `DocumentViewer` up through `App` state and down to `FooterBar`. FooterBar wraps the reading-time label in a Radix UI `Popover` trigger; the popover body is a new `FileInfoPopoverContent` component. No new stores required — all state flows via props.

**Tech Stack:** React 18, TypeScript, Radix UI (`@radix-ui/react-popover` via the existing `src/components/ui/Popover.tsx` wrapper), Vitest + React Testing Library

**Spec file to check off:** `context-human/specs/enhancement-footer-file-info-popover.md`

---

## File map

| Action | File | What changes |
|--------|------|--------------|
| Modify | `src/components/DocumentViewer.tsx` | Add `onFrontmatterChange` prop; call it alongside `onReadingTimeChange` |
| Modify | `src/App.tsx` | Add `frontmatter` state; wire `onFrontmatterChange`; reset on file change; pass `filePath` + `frontmatter` to FooterBar |
| Create | `src/components/FileInfoPopoverContent.tsx` | New component: renders path + frontmatter sections |
| Modify | `src/components/FooterBar.tsx` | Add `filePath`/`frontmatter` props; wrap reading-time span in Popover trigger |
| Create | `tests/unit/components/FileInfoPopoverContent.test.tsx` | Unit tests for the new component |
| Modify | `tests/unit/components/FooterBar.test.tsx` | New test cases for popover trigger behaviour |

---

## Task 1: Add `onFrontmatterChange` callback to `DocumentViewer`

**Files:**
- Modify: `src/components/DocumentViewer.tsx`

### Steps

- [ ] **Step 1: Add the prop to the interface and destructure it**

In `src/components/DocumentViewer.tsx`, add the optional prop to `DocumentViewerProps` and destructure it:

```tsx
interface DocumentViewerProps {
  onReadingTimeChange?: (minutes: number | null) => void;
  onFrontmatterChange?: (frontmatter: Record<string, unknown> | null) => void;
  onCommentTrigger?: (anchor: CommentTriggerAnchor) => void;
  onThreadClick?: (threadId: string) => void;
  onThreadsFilterClick?: (threadIds: string[]) => void;
  showResolvedDecorations?: boolean;
  scrollToThread?: { threadId: string; seq: number } | null;
}

export function DocumentViewer({
  onReadingTimeChange,
  onFrontmatterChange,
  onCommentTrigger,
  onThreadClick,
  onThreadsFilterClick,
  showResolvedDecorations = true,
  scrollToThread,
}: DocumentViewerProps = {}) {
```

- [ ] **Step 2: Call `onFrontmatterChange` in the main load effect**

The main load effect (`useEffect` starting at line 39) already calls `onReadingTimeChange` in three places. Mirror each call with `onFrontmatterChange`:

```tsx
  useEffect(() => {
    if (!selectedFilePath) {
      setContent(null);
      setFrontmatter(null);
      setDocId(null);
      onReadingTimeChange?.(null);
      onFrontmatterChange?.(null);
      return;
    }

    let cancelled = false;

    async function loadFile() {
      setIsLoading(true);
      setError(null);
      try {
        const [raw, id] = await Promise.all([
          invoke<string>("read_file", { filePath: selectedFilePath, workspacePath }),
          invoke<string>("ensure_doc_id_for_file", { filePath: selectedFilePath }),
        ]);
        if (cancelled) return;
        const parsed = parseDocument(raw);
        setContent(parsed.content);
        setFrontmatter(parsed.frontmatter);
        setDocId(id);
        onReadingTimeChange?.(computeReadingTime(parsed.content));
        onFrontmatterChange?.(parsed.frontmatter);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setContent(null);
        setFrontmatter(null);
        setDocId(null);
        onReadingTimeChange?.(null);
        onFrontmatterChange?.(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadFile();
    return () => {
      cancelled = true;
    };
  }, [selectedFilePath, onReadingTimeChange, onFrontmatterChange]);
```

- [ ] **Step 3: Call `onFrontmatterChange` in the hot-reload effect**

The hot-reload effect (second `useEffect`) also calls `onReadingTimeChange`. Mirror it:

```tsx
  useEffect(() => {
    if (!selectedFilePath || !workspacePath) return;

    let cancelled = false;
    const unlistenPromise = listen<string[]>("workspace-files-changed", (event) => {
      if (!cancelled && event.payload.includes(selectedFilePath)) {
        invoke<string>("read_file", { filePath: selectedFilePath, workspacePath })
          .then((raw) => {
            if (cancelled) return;
            const parsed = parseDocument(raw);
            setContent(parsed.content);
            setFrontmatter(parsed.frontmatter);
            onReadingTimeChange?.(computeReadingTime(parsed.content));
            onFrontmatterChange?.(parsed.frontmatter);
          })
          .catch(() => {});
      }
    });

    return () => {
      cancelled = true;
      unlistenPromise.then((fn) => fn());
    };
  }, [selectedFilePath, workspacePath, onReadingTimeChange, onFrontmatterChange]);
```

- [ ] **Step 4: Mark spec task complete**

In `context-human/specs/enhancement-footer-file-info-popover.md`, check off:
- `- [x] Prop is optional; existing \`DocumentViewer\` call sites without it compile without error`
- `- [x] Callback fires with the frontmatter object when a document with frontmatter is opened`
- `- [x] Callback fires with \`null\` when no document is open`
- `- [x] Callback does not fire on every render — only when the frontmatter value changes`
- `- [x] **Task: Add \`onFrontmatterChange\` callback to \`DocumentViewer\`**`

- [ ] **Step 5: Commit**

```bash
git add src/components/DocumentViewer.tsx
git commit -m "feat: add onFrontmatterChange callback to DocumentViewer"
```

---

## Task 2: Wire `frontmatter` and `filePath` through `App`

**Files:**
- Modify: `src/App.tsx`

### Steps

- [ ] **Step 1: Add `frontmatter` state**

After line 29 (`const [readingTime, setReadingTime] = useState<number | null>(null);`), add:

```tsx
  const [frontmatter, setFrontmatter] = useState<Record<string, unknown> | null>(null);
```

- [ ] **Step 2: Reset `frontmatter` when selected file changes**

After the existing effects, add a reset effect. This ensures stale frontmatter is cleared before the next document's frontmatter arrives:

```tsx
  // Reset frontmatter when the selected file changes so stale data
  // doesn't display while the new document is loading.
  useEffect(() => {
    setFrontmatter(null);
  }, [selectedFilePath]);
```

- [ ] **Step 3: Pass `onFrontmatterChange` to `DocumentViewer`**

The `DocumentViewer` is rendered in the main layout branch (around line 267). Add the new prop alongside `onReadingTimeChange`:

```tsx
              <DocumentViewer
                onReadingTimeChange={setReadingTime}
                onFrontmatterChange={setFrontmatter}
                onCommentTrigger={(anchor) => {
                  setAiPanelOpen(true);
                  setCommentTrigger({ type: "create-thread", anchor });
                }}
                onThreadClick={(threadId) => {
                  setAiPanelOpen(true);
                  setCommentTrigger({ type: "thread", threadId });
                  setScrollTo((prev) => ({ threadId, seq: (prev?.seq ?? 0) + 1 }));
                }}
                onThreadsFilterClick={(filterIds) => {
                  setAiPanelOpen(true);
                  setCommentTrigger({ type: "threads-filtered", filterIds });
                }}
                scrollToThread={scrollTo}
              />
```

- [ ] **Step 4: Pass `filePath` and `frontmatter` to all three `FooterBar` instances**

There are three `FooterBar` renders in `App.tsx` (loading state, no-folder state, main layout). All three must receive the new props. `FooterBar` will ignore them when `readingTime` is null, so there's no visual change for the loading/welcome screens.

**Loading state FooterBar** (around line 216):
```tsx
        <FooterBar
          sidebarVisible={sidebarVisible}
          onToggleSidebar={() => setSidebarVisible((v) => !v)}
          aiPanelOpen={aiPanelOpen}
          onToggleAiPanel={() => setAiPanelOpen((v) => !v)}
          readingTime={null}
          filePath={null}
          frontmatter={null}
        />
```

**No-folder FooterBar** (around line 237):
```tsx
        <FooterBar
          sidebarVisible={sidebarVisible}
          onToggleSidebar={() => setSidebarVisible((v) => !v)}
          aiPanelOpen={aiPanelOpen}
          onToggleAiPanel={() => setAiPanelOpen((v) => !v)}
          readingTime={null}
          filePath={null}
          frontmatter={null}
        />
```

**Main layout FooterBar** (around line 300):
```tsx
      <FooterBar
        sidebarVisible={sidebarVisible}
        onToggleSidebar={() => setSidebarVisible((v) => !v)}
        aiPanelOpen={aiPanelOpen}
        onToggleAiPanel={() => setAiPanelOpen((v) => !v)}
        readingTime={readingTime}
        documentOpen={!!selectedFilePath}
        threadsViewActive={threadsViewActive}
        filePath={selectedFilePath}
        frontmatter={frontmatter}
        onToggleThreadsView={() => {
          if (threadsViewActive) {
            setCommentTrigger({ type: "close" });
          } else {
            setAiPanelOpen(true);
            setCommentTrigger({ type: "threads" });
          }
        }}
      />
```

Note: `FooterBar` props `filePath` and `frontmatter` are not yet defined — TypeScript will error until Task 4. That's expected at this stage; the full build will pass after Task 4.

- [ ] **Step 5: Mark spec task complete**

In `context-human/specs/enhancement-footer-file-info-popover.md`, check off:
- `- [x] \`frontmatter\` state initializes to \`null\``
- `- [x] \`frontmatter\` updates when a document with frontmatter is opened`
- `- [x] \`frontmatter\` resets to \`null\` when the selected file changes, before the new document loads`
- `- [x] \`filePath\` passed to \`FooterBar\` matches the currently selected file path`
- `- [x] No TypeScript errors at \`FooterBar\` and \`DocumentViewer\` call sites`
- `- [x] **Task: Wire \`frontmatter\` and \`filePath\` through \`App\`**`
- `- [x] **Story: Data plumbing**`

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire frontmatter state and filePath through App"
```

---

## Task 3: Build `FileInfoPopoverContent` component

**Files:**
- Create: `src/components/FileInfoPopoverContent.tsx`

### Steps

- [ ] **Step 1: Create the file with Path section only**

Create `src/components/FileInfoPopoverContent.tsx`:

```tsx
interface FileInfoPopoverContentProps {
  filePath: string;
  frontmatter: Record<string, unknown> | null;
}

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: "var(--font-size-ui-xs)",
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--color-text-tertiary)",
  marginBottom: "var(--space-1)",
};

const valueStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "var(--font-size-ui-xs)",
  color: "var(--color-text-secondary)",
  userSelect: "text",
  wordBreak: "break-all",
};

export function FileInfoPopoverContent({ filePath, frontmatter }: FileInfoPopoverContentProps) {
  const frontmatterEntries = frontmatter
    ? Object.entries(frontmatter).filter(([key]) => key !== "doc_id")
    : [];

  const hasFrontmatter = frontmatterEntries.length > 0;

  function renderValue(value: unknown): string {
    if (Array.isArray(value)) return value.join(", ");
    return String(value ?? "");
  }

  return (
    <div style={{ padding: "var(--space-3)" }}>
      {/* Path section */}
      <div>
        <div style={labelStyle}>Path</div>
        <div style={valueStyle}>{filePath}</div>
      </div>

      {/* Frontmatter section */}
      {hasFrontmatter && (
        <>
          <div
            style={{
              borderTop: "1px solid var(--color-border-subtle)",
              margin: "var(--space-3) 0",
            }}
          />
          <div>
            <div style={labelStyle}>Frontmatter</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {frontmatterEntries.map(([key, value]) => (
                <div key={key}>
                  <div
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: "var(--font-size-ui-xs)",
                      fontWeight: 500,
                      color: "var(--color-text-tertiary)",
                    }}
                  >
                    {key}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: "var(--font-size-ui-xs)",
                      color: "var(--color-text-secondary)",
                      userSelect: "text",
                    }}
                  >
                    {renderValue(value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

Note: the `import React` is not needed in this project (JSX transform handles it), but you must add `import React` only if TypeScript complains about `React.CSSProperties`. In that case add:

```tsx
import type React from "react";
```

at the top of the file.

- [ ] **Step 2: Mark spec task complete**

In `context-human/specs/enhancement-footer-file-info-popover.md`, check off:
- `- [x] Renders Path section with "Path" label and full path value in monospace`
- `- [x] File path text is selectable (\`user-select: text\`)`
- `- [x] Frontmatter section is absent when \`frontmatter\` is \`null\``
- `- [x] Frontmatter section is absent when frontmatter contains only \`doc_id\``
- `- [x] Frontmatter section renders all fields (except \`doc_id\`) when present`
- `- [x] Array field values render as comma-separated strings`
- `- [x] Divider appears between Path and Frontmatter sections when both are present`
- `- [x] Component does not crash when \`frontmatter\` is \`null\` or \`{}\``
- `- [x] **Task: Build \`FileInfoPopoverContent\` component**`
- `- [x] **Story: FileInfoPopoverContent component**`

- [ ] **Step 3: Commit**

```bash
git add src/components/FileInfoPopoverContent.tsx
git commit -m "feat: add FileInfoPopoverContent component"
```

---

## Task 4: Add Popover trigger to reading time in `FooterBar`

**Files:**
- Modify: `src/components/FooterBar.tsx`

### Steps

- [ ] **Step 1: Add imports and new props**

Add imports at the top of `src/components/FooterBar.tsx`:

```tsx
import { PanelLeft, Sparkles, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/Popover";
import { FileInfoPopoverContent } from "@/components/FileInfoPopoverContent";
```

Update `FooterBarProps`:

```tsx
interface FooterBarProps {
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
  aiPanelOpen: boolean;
  onToggleAiPanel: () => void;
  readingTime: number | null;
  filePath: string | null;
  frontmatter: Record<string, unknown> | null;
  documentOpen?: boolean;
  threadsViewActive?: boolean;
  onToggleThreadsView?: () => void;
}
```

Destructure the new props:

```tsx
export function FooterBar({
  sidebarVisible,
  onToggleSidebar,
  aiPanelOpen,
  onToggleAiPanel,
  readingTime,
  filePath,
  frontmatter,
  documentOpen,
  threadsViewActive,
  onToggleThreadsView,
}: FooterBarProps) {
```

- [ ] **Step 2: Replace the reading-time `<span>` with a Popover trigger**

The current center zone (lines 63-83) renders a `<span>` when `readingTime` is non-null. Replace it:

```tsx
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
          <Popover>
            <PopoverTrigger asChild>
              <button
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--font-size-ui-xs)",
                  color: "var(--color-text-tertiary)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "var(--color-text-secondary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "var(--color-text-tertiary)";
                }}
              >
                {readingTime} min read
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              sideOffset={24}
              style={{ padding: 0, width: 280 }}
            >
              <FileInfoPopoverContent
                filePath={filePath ?? ""}
                frontmatter={frontmatter}
              />
            </PopoverContent>
          </Popover>
        )}
      </div>
```

Note: `padding: 0` overrides the default `--space-2` padding from `PopoverContent` because `FileInfoPopoverContent` applies its own `--space-3` padding internally.

- [ ] **Step 3: Mark spec task complete**

In `context-human/specs/enhancement-footer-file-info-popover.md`, check off:
- `- [x] "X min read" renders as a button trigger when \`readingTime\` is non-null`
- `- [x] Clicking the trigger opens the popover above the footer`
- `- [x] Popover closes on Escape and click-outside`
- `- [x] \`filePath\` and \`frontmatter\` are correctly forwarded to \`FileInfoPopoverContent\``
- `- [x] Hover state changes text color to \`--color-text-secondary\``
- `- [x] When \`readingTime\` is null, center zone is empty — no trigger rendered`
- `- [x] No TypeScript errors`
- `- [x] **Task: Add Popover trigger to reading time in \`FooterBar\`**`
- `- [x] **Story: FooterBar popover integration**`

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. If you see errors about `filePath`/`frontmatter` props on `FooterBar` call sites, verify Task 2 Step 4 was applied correctly.

- [ ] **Step 5: Commit**

```bash
git add src/components/FooterBar.tsx
git commit -m "feat: wrap reading-time label in file info popover trigger"
```

---

## Task 5: Unit tests for `FileInfoPopoverContent`

**Files:**
- Create: `tests/unit/components/FileInfoPopoverContent.test.tsx`

### Steps

- [ ] **Step 1: Create the test file**

Create `tests/unit/components/FileInfoPopoverContent.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FileInfoPopoverContent } from "@/components/FileInfoPopoverContent";

describe("FileInfoPopoverContent", () => {
  it("renders the Path section label", () => {
    render(
      <FileInfoPopoverContent
        filePath="/workspace/docs/api-spec.md"
        frontmatter={null}
      />
    );
    expect(screen.getByText("Path")).toBeInTheDocument();
  });

  it("renders the full file path", () => {
    render(
      <FileInfoPopoverContent
        filePath="/workspace/docs/api-spec.md"
        frontmatter={null}
      />
    );
    expect(screen.getByText("/workspace/docs/api-spec.md")).toBeInTheDocument();
  });

  it("file path element has user-select: text", () => {
    const { container } = render(
      <FileInfoPopoverContent
        filePath="/workspace/docs/api-spec.md"
        frontmatter={null}
      />
    );
    const pathEl = screen.getByText("/workspace/docs/api-spec.md");
    expect(pathEl.style.userSelect).toBe("text");
  });

  it("does not render Frontmatter section when frontmatter is null", () => {
    render(
      <FileInfoPopoverContent
        filePath="/workspace/docs/api-spec.md"
        frontmatter={null}
      />
    );
    expect(screen.queryByText("Frontmatter")).not.toBeInTheDocument();
  });

  it("does not render Frontmatter section when frontmatter contains only doc_id", () => {
    render(
      <FileInfoPopoverContent
        filePath="/workspace/docs/api-spec.md"
        frontmatter={{ doc_id: "abc-123" }}
      />
    );
    expect(screen.queryByText("Frontmatter")).not.toBeInTheDocument();
  });

  it("renders Frontmatter section label when non-doc_id fields are present", () => {
    render(
      <FileInfoPopoverContent
        filePath="/workspace/docs/api-spec.md"
        frontmatter={{ status: "draft", author: "alice" }}
      />
    );
    expect(screen.getByText("Frontmatter")).toBeInTheDocument();
  });

  it("renders all non-doc_id fields", () => {
    render(
      <FileInfoPopoverContent
        filePath="/workspace/docs/api-spec.md"
        frontmatter={{ status: "draft", author: "alice", doc_id: "xyz" }}
      />
    );
    expect(screen.getByText("status")).toBeInTheDocument();
    expect(screen.getByText("draft")).toBeInTheDocument();
    expect(screen.getByText("author")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.queryByText("doc_id")).not.toBeInTheDocument();
  });

  it("renders array field values as comma-separated strings", () => {
    render(
      <FileInfoPopoverContent
        filePath="/workspace/docs/api-spec.md"
        frontmatter={{ tags: ["design", "api", "v2"] }}
      />
    );
    expect(screen.getByText("design, api, v2")).toBeInTheDocument();
  });

  it("renders a divider when both Path and Frontmatter sections are present", () => {
    const { container } = render(
      <FileInfoPopoverContent
        filePath="/workspace/docs/api-spec.md"
        frontmatter={{ status: "draft" }}
      />
    );
    // The divider is a div with a borderTop style
    const dividers = Array.from(container.querySelectorAll("div")).filter(
      (el) => el.style.borderTop !== ""
    );
    expect(dividers.length).toBeGreaterThan(0);
  });

  it("does not crash when frontmatter is an empty object", () => {
    expect(() =>
      render(
        <FileInfoPopoverContent
          filePath="/workspace/docs/api-spec.md"
          frontmatter={{}}
        />
      )
    ).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
npx vitest run tests/unit/components/FileInfoPopoverContent.test.tsx
```

Expected: all tests pass. If any fail, fix the component before proceeding.

- [ ] **Step 3: Mark spec task complete**

In `context-human/specs/enhancement-footer-file-info-popover.md`, check off:
- `- [x] All cases described above are covered`
- `- [x] Tests pass`
- `- [x] **Task: Unit tests for \`FileInfoPopoverContent\`**`

- [ ] **Step 4: Commit**

```bash
git add tests/unit/components/FileInfoPopoverContent.test.tsx
git commit -m "test: add unit tests for FileInfoPopoverContent"
```

---

## Task 6: Update `FooterBar` tests

**Files:**
- Modify: `tests/unit/components/FooterBar.test.tsx`

### Steps

- [ ] **Step 1: Update `defaultProps` to include the new required props**

The two new required props (`filePath` and `frontmatter`) must be present in `defaultProps` so existing tests don't break:

```tsx
const defaultProps = {
  sidebarVisible: true,
  onToggleSidebar: vi.fn(),
  aiPanelOpen: false,
  onToggleAiPanel: vi.fn(),
  readingTime: null,
  filePath: null,
  frontmatter: null,
};
```

- [ ] **Step 2: Update the "renders reading time" test to check for a button trigger**

The existing test `"renders reading time when provided"` currently checks `screen.getByText("5 min read")`. That still works since the button contains that text. Add a new test that verifies it's a button:

```tsx
  it("renders reading time as a button trigger when readingTime is non-null", () => {
    render(<FooterBar {...defaultProps} readingTime={5} filePath="/docs/test.md" frontmatter={null} />);
    const trigger = screen.getByRole("button", { name: /5 min read/i });
    expect(trigger).toBeInTheDocument();
  });
```

- [ ] **Step 3: Add test — center zone is empty when readingTime is null**

The existing test `"does not render reading time when readingTime is null"` covers this. Verify it still passes after the `defaultProps` update. Add a reinforcing test:

```tsx
  it("does not render a trigger button when readingTime is null", () => {
    render(<FooterBar {...defaultProps} readingTime={null} />);
    // No button with "min read" text should exist
    expect(screen.queryByRole("button", { name: /min read/i })).not.toBeInTheDocument();
  });
```

- [ ] **Step 4: Add test — popover opens on trigger click**

```tsx
  it("opens popover when reading time trigger is clicked", async () => {
    render(
      <FooterBar
        {...defaultProps}
        readingTime={3}
        filePath="/workspace/docs/api-spec.md"
        frontmatter={{ status: "draft" }}
      />
    );
    const trigger = screen.getByRole("button", { name: /3 min read/i });
    await userEvent.click(trigger);
    // FileInfoPopoverContent renders a "Path" label
    expect(screen.getByText("Path")).toBeInTheDocument();
  });
```

- [ ] **Step 5: Add test — filePath forwarded to popover content**

```tsx
  it("forwards filePath into the popover content", async () => {
    render(
      <FooterBar
        {...defaultProps}
        readingTime={3}
        filePath="/workspace/docs/api-spec.md"
        frontmatter={null}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /3 min read/i }));
    expect(screen.getByText("/workspace/docs/api-spec.md")).toBeInTheDocument();
  });
```

- [ ] **Step 6: Add test — frontmatter forwarded to popover content**

```tsx
  it("forwards frontmatter into the popover content", async () => {
    render(
      <FooterBar
        {...defaultProps}
        readingTime={3}
        filePath="/workspace/docs/notes.md"
        frontmatter={{ status: "published", author: "alice" }}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /3 min read/i }));
    expect(screen.getByText("Frontmatter")).toBeInTheDocument();
    expect(screen.getByText("status")).toBeInTheDocument();
    expect(screen.getByText("published")).toBeInTheDocument();
  });
```

- [ ] **Step 7: Run the full FooterBar test suite**

```bash
npx vitest run tests/unit/components/FooterBar.test.tsx
```

Expected: all tests pass (existing + new). If any existing test fails, the likely cause is the `defaultProps` change — verify Step 1 was applied correctly.

- [ ] **Step 8: Mark spec task complete**

In `context-human/specs/enhancement-footer-file-info-popover.md`, check off:
- `- [x] New test cases added as described`
- `- [x] All existing \`FooterBar\` tests continue to pass`
- `- [x] Tests pass`
- `- [x] **Task: Update \`FooterBar\` tests**`
- `- [x] **Story: Tests**`

- [ ] **Step 9: Commit**

```bash
git add tests/unit/components/FooterBar.test.tsx
git commit -m "test: update FooterBar tests for popover trigger"
```

---

## Task 7: Run full test suite

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass. If any tests outside the ones we touched fail, investigate before proceeding — do not ignore failures.

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.
