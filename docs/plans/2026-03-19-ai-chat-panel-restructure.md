# AI Chat Panel Restructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the AI chat panel into a two-zone layout, extract `ChatInputCard`, and wire a panel toggle into the title bar.

**Architecture:** `AiChatPanel` gains a stable two-zone layout (persistent header + content area). When authenticated, the content area renders two panes: a scrollable messages pane and `ChatInputCard`. `App.tsx` owns `aiPanelOpen` state and renders the panel alongside `DocumentViewer`. `ChatInputCard` is a new standalone component with an auto-growing textarea and fixed toolbar.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vitest, @testing-library/react, @testing-library/user-event, Lucide icons

**Spec:** `.eng-docs/specs/enhancement-chat-box-expansion.md`

---

## Task 1: Write `ChatInputCard` tests (TDD)

**Files:**
- Create: `tests/unit/components/ChatInputCard.test.tsx`

**Step 1: Create the test file**

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, createRef } from "vitest";
import { ChatInputCard } from "@/components/ChatInputCard";

function makePanelRef() {
  const ref = { current: document.createElement("div") };
  Object.defineProperty(ref.current, "offsetHeight", { value: 600 });
  return ref;
}

describe("ChatInputCard", () => {
  describe("Keyboard behavior", () => {
    it("Enter calls onSend", () => {
      const onSend = vi.fn();
      render(
        <ChatInputCard
          value="hello"
          onChange={vi.fn()}
          onSend={onSend}
          isStreaming={false}
          panelRef={makePanelRef()}
        />
      );
      const textarea = screen.getByPlaceholderText("Ask a question...");
      fireEvent.keyDown(textarea, { key: "Enter" });
      expect(onSend).toHaveBeenCalledTimes(1);
    });

    it("Cmd+Enter calls onSend", () => {
      const onSend = vi.fn();
      render(
        <ChatInputCard
          value="hello"
          onChange={vi.fn()}
          onSend={onSend}
          isStreaming={false}
          panelRef={makePanelRef()}
        />
      );
      const textarea = screen.getByPlaceholderText("Ask a question...");
      fireEvent.keyDown(textarea, { key: "Enter", metaKey: true });
      expect(onSend).toHaveBeenCalledTimes(1);
    });

    it("Shift+Enter does not call onSend", () => {
      const onSend = vi.fn();
      render(
        <ChatInputCard
          value="hello"
          onChange={vi.fn()}
          onSend={onSend}
          isStreaming={false}
          panelRef={makePanelRef()}
        />
      );
      const textarea = screen.getByPlaceholderText("Ask a question...");
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
      expect(onSend).not.toHaveBeenCalled();
    });
  });

  describe("Send button disabled states", () => {
    it("send button is disabled when value is empty", () => {
      render(
        <ChatInputCard
          value=""
          onChange={vi.fn()}
          onSend={vi.fn()}
          isStreaming={false}
          panelRef={makePanelRef()}
        />
      );
      expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
    });

    it("send button is disabled when isStreaming is true", () => {
      render(
        <ChatInputCard
          value="hello"
          onChange={vi.fn()}
          onSend={vi.fn()}
          isStreaming={true}
          panelRef={makePanelRef()}
        />
      );
      expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
    });

    it("send button is enabled when value is non-empty and not streaming", () => {
      render(
        <ChatInputCard
          value="hello"
          onChange={vi.fn()}
          onSend={vi.fn()}
          isStreaming={false}
          panelRef={makePanelRef()}
        />
      );
      expect(screen.getByRole("button", { name: /send/i })).not.toBeDisabled();
    });
  });

  describe("modeButton render prop", () => {
    it("renders modeButton in the toolbar when provided", () => {
      render(
        <ChatInputCard
          value=""
          onChange={vi.fn()}
          onSend={vi.fn()}
          isStreaming={false}
          modeButton={<button>Mode</button>}
          panelRef={makePanelRef()}
        />
      );
      expect(screen.getByRole("button", { name: "Mode" })).toBeInTheDocument();
    });

    it("renders nothing in mode slot when modeButton is not provided", () => {
      render(
        <ChatInputCard
          value=""
          onChange={vi.fn()}
          onSend={vi.fn()}
          isStreaming={false}
          panelRef={makePanelRef()}
        />
      );
      expect(screen.queryByRole("button", { name: "Mode" })).not.toBeInTheDocument();
    });
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
cd /Users/mark.stafford/git/episteme/.worktrees/feature/ai-chat-panel-restructure
npm test -- tests/unit/components/ChatInputCard.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/ChatInputCard'`

**Step 3: Commit the failing tests**

```bash
git add tests/unit/components/ChatInputCard.test.tsx
git commit -m "test: add failing ChatInputCard tests (TDD)"
```

---

## Task 2: Implement `ChatInputCard`

**Files:**
- Create: `src/components/ChatInputCard.tsx`

**Step 1: Create the component**

```tsx
import { useRef, useEffect, ReactNode, RefObject } from "react";
import { ArrowUp } from "lucide-react";

interface ChatInputCardProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isStreaming: boolean;
  modeButton?: ReactNode;
  panelRef: RefObject<HTMLDivElement | null>;
}

export function ChatInputCard({
  value,
  onChange,
  onSend,
  isStreaming,
  modeButton,
  panelRef,
}: ChatInputCardProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    const panel = panelRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const maxHeight = panel ? panel.offsetHeight * 0.5 : Infinity;
    textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + "px";
  }, [value, panelRef]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const canSend = value.trim().length > 0 && !isStreaming;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-blue-500">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask a question..."
        rows={1}
        disabled={isStreaming}
        className="w-full resize-none bg-transparent border-none outline-none px-3 pt-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 overflow-y-auto disabled:opacity-50"
      />
      <div className="flex items-center justify-between px-2 py-1.5 border-t border-gray-200 dark:border-gray-700">
        <div>{modeButton}</div>
        <button
          onClick={onSend}
          disabled={!canSend}
          aria-label="Send message"
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Run the ChatInputCard tests**

```bash
npm test -- tests/unit/components/ChatInputCard.test.tsx
```

Expected: All 9 tests pass.

**Step 3: Run the full suite to check for regressions**

```bash
npm test
```

Expected: 415 + 7 = 422 tests pass.

**Step 4: Commit**

```bash
git add src/components/ChatInputCard.tsx
git commit -m "feat: add ChatInputCard component with auto-grow textarea"
```

---

## Task 3: Clean up `AiChatPanel` header and remove `clearConversation`

**Files:**
- Modify: `src/components/AiChatPanel.tsx`
- Modify: `tests/unit/AiChatPanel.test.tsx`

This task removes `onClose`, ×, `RotateCcw`, and `clearConversation`, and adds a `Clock` no-op. The content area restructure happens in Task 4.

**Step 1: Update `AiChatPanel.tsx` — header only**

1. Remove `onClose` from `AiChatPanelProps` and the function signature
2. Remove `clearConversation` from the `useAiChatStore` destructure
3. In the header JSX, replace the two right-side buttons (`RotateCcw` + `X`) with a single `Clock` button (no-op):

```tsx
// Remove this import:
import { MessageSquare, RotateCcw, X, Send, Loader2 } from "lucide-react";

// Replace with:
import { Clock, Send, Loader2 } from "lucide-react";
```

```tsx
// Old interface:
interface AiChatPanelProps {
  onClose: () => void;
}

// New interface:
interface AiChatPanelProps {}

// Old function signature:
export function AiChatPanel({ onClose }: AiChatPanelProps) {

// New:
export function AiChatPanel(_props: AiChatPanelProps = {}) {
```

Replace the header buttons section:

```tsx
{/* Old — remove both buttons: */}
<button onClick={clearConversation} ...><RotateCcw /></button>
<button onClick={onClose} ...><X /></button>

{/* New — Clock no-op: */}
<button
  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
  title="Session history"
  onClick={() => {}}
>
  <Clock className="w-4 h-4 text-gray-500" />
</button>
```

**Step 2: Update `AiChatPanel.test.tsx`**

- Remove `onClose={vi.fn()}` from every `render(<AiChatPanel onClose={vi.fn()} />)` call — replace with `render(<AiChatPanel />)`
- Remove the two tests in the `Header` describe block:
  - `"close button calls onClose"` — the × button is gone
  - Keep `"shows 'AI Assistant' text"`
- In the `"Authenticated with messages"` describe, the `"shows send button"` test uses `screen.getByTitle("Send")` which will break when we restructure in Task 4 — leave it for now, it will be fixed in Task 4

**Step 3: Run the AiChatPanel tests**

```bash
npm test -- tests/unit/AiChatPanel.test.tsx
```

Expected: All remaining tests pass (the `"shows send button"` test may still pass since we haven't moved the send button yet).

**Step 4: Run full suite**

```bash
npm test
```

Expected: All tests pass (count may decrease by 1 from removed close test).

**Step 5: Commit**

```bash
git add src/components/AiChatPanel.tsx tests/unit/AiChatPanel.test.tsx
git commit -m "refactor: remove onClose, clearConversation, and RotateCcw from AiChatPanel; add Clock placeholder"
```

---

## Task 4: Restructure `AiChatPanel` content area and wire `ChatInputCard`

**Files:**
- Modify: `src/components/AiChatPanel.tsx`
- Modify: `tests/unit/AiChatPanel.test.tsx`

**Step 1: Update the return JSX in `AiChatPanel.tsx`**

Replace the current return statement. The panel ref is on the outer div (needed by `ChatInputCard`). The content area uses `flex flex-col flex-1 min-h-0`. `ChatInputCard` is conditionally rendered only when `isAuthenticated`.

```tsx
// Add panelRef at the top of the component function, alongside existing refs:
const panelRef = useRef<HTMLDivElement>(null);

// Remove these imports (no longer used directly in AiChatPanel):
// Send icon — ArrowUp will live in ChatInputCard
// Add ChatInputCard import:
import { ChatInputCard } from "@/components/ChatInputCard";

// New return statement:
return (
  <div
    ref={panelRef}
    className="w-96 flex flex-col h-full border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
  >
    {/* Header */}
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          AI assistant
        </span>
      </div>
      <button
        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
        title="Session history"
        onClick={() => {}}
      >
        <Clock className="w-4 h-4 text-gray-500" />
      </button>
    </div>

    {/* Content area */}
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages pane */}
      <div className="flex-1 overflow-y-auto p-4">{renderBody()}</div>

      {/* Input — only rendered when authenticated */}
      {isAuthenticated && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <ChatInputCard
            value={input}
            onChange={setInput}
            onSend={handleSend}
            isStreaming={isStreaming}
            panelRef={panelRef}
          />
        </div>
      )}
    </div>
  </div>
);
```

Also remove the `Send` icon import from lucide (no longer used in this file).

**Step 2: Update `AiChatPanel.test.tsx` for the new structure**

In the `"Authenticated with messages"` describe block:

- Remove `"shows send button"` test — the send button is now inside `ChatInputCard`, tested separately
- Update `"shows input textarea"` — the textarea placeholder is still `"Ask a question..."` so this test still works

**Step 3: Run AiChatPanel tests**

```bash
npm test -- tests/unit/AiChatPanel.test.tsx
```

Expected: All remaining tests pass.

**Step 4: Run full suite**

```bash
npm test
```

Expected: All tests pass.

**Step 5: Commit**

```bash
git add src/components/AiChatPanel.tsx tests/unit/AiChatPanel.test.tsx
git commit -m "refactor: restructure AiChatPanel into two-zone layout; wire ChatInputCard"
```

---

## Task 5: Add `MessageSquare` toggle to `TitleBar`

**Files:**
- Modify: `src/components/TitleBar.tsx`
- Modify: `tests/unit/TitleBar.test.tsx`

**Step 1: Update `TitleBarProps` and add the toggle button**

```tsx
// Add to TitleBarProps:
interface TitleBarProps {
  folderPath: string | null;
  onStartAuthoring: (skillName: string | null) => void;
  aiPanelOpen?: boolean;
  onToggleAiPanel?: () => void;
}
```

Add `MessageSquare` to the lucide import.

In the right section (currently `width: 80`), widen to `width: 112` to accommodate three buttons, and add the `MessageSquare` button before Share:

```tsx
{/* Section 3: actions — right-aligned, no-drag */}
<div
  className="titlebar-no-drag"
  style={{
    width: 112,  // widened from 80 to fit three buttons
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
    aria-label="Toggle AI panel"
    onClick={onToggleAiPanel}
    style={{
      color: aiPanelOpen
        ? "var(--color-accent)"
        : "var(--color-text-tertiary)",
    }}
  >
    <MessageSquare size={16} />
  </Button>
  <Button variant="ghost" size="sm" iconOnly aria-label="Share" disabled style={{ color: "var(--color-text-tertiary)" }}>
    <Share2 size={16} />
  </Button>
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

**Step 2: Add TitleBar tests for the toggle**

In `tests/unit/TitleBar.test.tsx`, add a new describe block:

```tsx
describe("AI panel toggle button", () => {
  it("renders with tertiary color when aiPanelOpen is false", () => {
    render(<TitleBar folderPath={null} aiPanelOpen={false} onToggleAiPanel={vi.fn()} />);
    const btn = screen.getByRole("button", { name: /toggle ai panel/i });
    expect(btn).toBeInTheDocument();
    expect(btn.style.color).not.toBe("var(--color-accent)");
  });

  it("renders with accent color when aiPanelOpen is true", () => {
    render(<TitleBar folderPath={null} aiPanelOpen={true} onToggleAiPanel={vi.fn()} />);
    const btn = screen.getByRole("button", { name: /toggle ai panel/i });
    expect(btn.style.color).toBe("var(--color-accent)");
  });

  it("calls onToggleAiPanel when clicked", async () => {
    const onToggle = vi.fn();
    render(<TitleBar folderPath={null} aiPanelOpen={false} onToggleAiPanel={onToggle} />);
    await userEvent.click(screen.getByRole("button", { name: /toggle ai panel/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
```

Also add `userEvent` and `vi` to the imports at the top of the test file:

```tsx
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
```

**Step 3: Run TitleBar tests**

```bash
npm test -- tests/unit/TitleBar.test.tsx
```

Expected: All tests pass (4 existing + 3 new = 7).

**Step 4: Run full suite**

```bash
npm test
```

Expected: All tests pass.

**Step 5: Commit**

```bash
git add src/components/TitleBar.tsx tests/unit/TitleBar.test.tsx
git commit -m "feat: add MessageSquare panel toggle to TitleBar"
```

---

## Task 6: Wire `aiPanelOpen` state in `App.tsx`

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add `aiPanelOpen` state and pass props to TitleBar**

Add `AiChatPanel` to the imports at the top:

```tsx
import { AiChatPanel } from "@/components/AiChatPanel";
```

Add state inside the `App` function (alongside existing state):

```tsx
const [aiPanelOpen, setAiPanelOpen] = useState(false);
```

In all three render paths, update the `TitleBar` calls — replace the `{/* TODO: re-wire... */}` comments and add the new props:

```tsx
// Loading path and no-folder path:
<TitleBar
  folderPath={null}
  onStartAuthoring={() => {}}
  aiPanelOpen={aiPanelOpen}
  onToggleAiPanel={() => setAiPanelOpen((v) => !v)}
/>

// Main render path:
<TitleBar
  folderPath={folderPath}
  onStartAuthoring={() => {}}
  aiPanelOpen={aiPanelOpen}
  onToggleAiPanel={() => setAiPanelOpen((v) => !v)}
/>
```

In the main render path, add `AiChatPanel` as a sibling to `DocumentViewer` inside the `flex-1 flex flex-col min-w-0` wrapper. The outer row already has `flex flex-1 min-h-0` — add the panel at the same level as the settings/document wrapper:

```tsx
<div className="flex flex-1 min-h-0">
  <Sidebar>
    <FileTree />
  </Sidebar>
  {settingsOpen ? (
    <div className="flex-1 flex flex-col animate-fade-in">
      <SettingsPanel />
    </div>
  ) : (
    <div className="flex flex-1 min-w-0 overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <DocumentViewer />
      </div>
      {aiPanelOpen && <AiChatPanel />}
    </div>
  )}
</div>
```

**Step 2: Run the full suite**

```bash
npm test
```

Expected: All tests pass with no regressions.

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire aiPanelOpen toggle in App.tsx; render AiChatPanel alongside DocumentViewer"
```

---

## Final verification

**Step 1: Run the full suite one last time**

```bash
npm test
```

Expected: All tests pass. Count should be higher than the original 415 (new ChatInputCard tests + new TitleBar tests).

**Step 2: Verify the TODO comments are gone**

```bash
grep -r "TODO: re-wire" src/
```

Expected: No output.
