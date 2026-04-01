---
created: 2026-03-31
last_updated: 2026-04-01
status: complete
issue: 153
specced_by: markdstafford
implemented_by: markdstafford
superseded_by: null
doc_id: d0c39282-47f0-4244-8e95-fee95e12c002
---

# Enhancement: copy/paste

## Parent feature

`feature-markdown-rendering.md` — the document renderer is the primary surface; text selection and code block copy are both rendering concerns.

`feature-ai-chat-assistant.md` is a secondary surface (paste into chat input).

## What

Three clipboard gaps are closed in priority order: paste into the chat and comment inputs is restored; prose text in the document becomes selectable and copyable; and code blocks gain a one-click copy button that copies the raw source.

## Why

Users cannot paste into the chat input or comment reply box today, and cannot select or copy text from the document. Code blocks have no one-click copy affordance. Getting content into or out of Episteme requires switching to another tool.

## User stories

- Patricia can paste text into the chat input and comment reply box with Cmd+V
- Eric can select and copy prose text from a document with standard OS text selection (click, drag, double-click to select word, triple-click to select paragraph)
- Eric can copy a code block with one click, getting the raw source
- Eric can copy a Mermaid diagram's source with one click, getting the raw definition text
- Any user who clicks a copy button sees a brief check icon confirming the clipboard write succeeded

## Design changes

### Prose text selection (CSS fix — no new UI)

No visual change. After the CSS fix, text selection in the document works exactly as expected: cursor becomes `text` over prose, selection highlight appears on drag, OS copy shortcut works.

### Code block copy button

A copy button overlays the top-right corner of each code block, appearing on hover. Copies raw source code (`node.textContent`), not highlighted HTML.

```
┌──────────────────────────────────────────────────┐
│  const target = 1_000                       [📋] │  ← hover to reveal
│  // req/s per node                               │
└──────────────────────────────────────────────────┘
```

Present in both the highlighted-HTML state (Shiki loaded) and the `<pre><code>` fallback state (loading or failure). The affordance must never disappear.

`Copy` icon (default) and `Check` icon (confirmed) from Lucide React at 12px. Confirmed state lasts 1.5 seconds, then resets. No layout shift — overlay only.

| State | Icon | Color |
|---|---|---|
| Default (hidden) | — | — |
| Hover visible | `Copy` | `--color-text-tertiary` |
| Confirmed | `Check` | `--color-state-success` |

## Technical changes

### Affected files

- `src-tauri/src/lib.rs` — modified; add macOS Edit menu with `PredefinedMenuItem` entries for Paste, Copy, Cut, Select All, Undo, Redo
- `src/app.css` — modified; add `user-select: text` and `cursor: text` to `.ProseMirror` to enable prose text selection in macOS WKWebView
- `src/components/ui/CopyButton.tsx` — new; copy button component used by code blocks
- `src/components/markdown/ShikiRenderer.tsx` — modified; add `relative group` wrapper and `CopyButton` with the `code` prop in both render paths
- `src/components/markdown/MermaidRenderer.tsx` — modified; add `relative group` wrapper and `CopyButton` with the `definition` prop in the SVG and error render paths

### Changes

#### Introduction and overview

**Prerequisites:**
- ADR-002 (TipTap) — document renders via TipTap in `editable: false` mode; code blocks are custom NodeViews rendered via Shiki
- ADR-004 (Tailwind) — `group`/`group-hover` used for hover visibility of the copy button
- `feature-markdown-rendering.md` — establishes `ShikiRenderer`, `CodeBlock` NodeView pattern
- `feature-ai-chat-assistant.md` — establishes the chat input (`ChatInputCard`) affected by the Edit menu fix

**Root cause of paste failure:**
macOS routes Cmd+V (and Cmd+C, Cmd+X, Cmd+Z, Cmd+A) through the application's menu bar Edit menu. Without an Edit menu, the WKWebView never receives these events — paste into a `<textarea>` is silently dropped. The fix is adding an Edit menu built from Tauri's `PredefinedMenuItem` entries, which hook into the OS's native editing machinery.

**Root cause of prose selection failure:**
TipTap with `editable: false` sets `contenteditable="false"` on the editor root div. In macOS WKWebView (Tauri's rendering engine), elements with `contenteditable="false"` have an implicit `user-select: none` behavior — text is not selectable unless the element or an ancestor explicitly sets `user-select: text`. The `prosemirror-view/style/prosemirror.css` file contains the necessary rule but is never imported in this project. Adding two CSS lines to `app.css` fixes it.

**Goals:**
- After the fix, prose text selection in the document behaves identically to any read-only web page
- Code block copy button is available regardless of Shiki load state
- Clicking the copy button writes plain text to the clipboard in < 100ms
- Visual confirmation appears immediately and resets after 1.5 seconds

**Non-goals:**
- Copy button on AI chat messages or comment bubbles — prose text selection makes manual copy workable; top-right corner of those bubbles is reserved for a future Reply button
- "Copy as Markdown" for document selections
- Keyboard shortcut binding for copy (OS shortcuts work once the Edit menu and prose selection are restored)

#### System design and architecture

**Component breakdown:**

| Component | New / Modified | Description |
|---|---|---|
| `lib.rs` | Modified | Add macOS Edit menu with `PredefinedMenuItem` — routes OS keyboard shortcuts (Cmd+V, Cmd+C, etc.) into the WKWebView |
| `app.css` | Modified | Add `user-select: text; -webkit-user-select: text; cursor: text` to `.ProseMirror` |
| `CopyButton` | New | Icon button: clipboard write + Copy → Check → Copy cycle |
| `ShikiRenderer` | Modified | `relative group` wrapper; `CopyButton` in both render paths |
| `MermaidRenderer` | Modified | `relative group` wrapper; `CopyButton` with `definition` in SVG and error paths |

No new Tauri commands, no store changes, no data model changes.

#### Detailed design

**`lib.rs` change — macOS Edit menu:**

Add `PredefinedMenuItem` to the import and construct an Edit submenu before building the top-level menu:

```rust
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};

let edit_menu = Submenu::with_items(app, "Edit", true, &[
    &PredefinedMenuItem::undo(app, None)?,
    &PredefinedMenuItem::redo(app, None)?,
    &PredefinedMenuItem::separator(app)?,
    &PredefinedMenuItem::cut(app, None)?,
    &PredefinedMenuItem::copy(app, None)?,
    &PredefinedMenuItem::paste(app, None)?,
    &PredefinedMenuItem::select_all(app, None)?,
])?;
let menu = Menu::with_items(app, &[&file_menu, &edit_menu])?;
```

`PredefinedMenuItem` uses macOS-native OS services for each action — no event handler needed.

**`app.css` change — prose text selection:**

```css
.ProseMirror {
  -webkit-user-select: text;
  user-select: text;
  cursor: text;
}
```

`cursor: text` reinforces the interaction affordance. `-webkit-user-select` is required for WebKit (WKWebView).

**`CopyButton` component:**

```tsx
interface CopyButtonProps {
  text: string;
  className?: string;
}
```

Internal `copied: boolean` state. Click handler: `navigator.clipboard.writeText(text)`, on success set `copied = true`, schedule reset after 1500ms. On failure: silently no-op.

Renders a single `<button>` with `Copy` (12px) or `Check` (12px) icon. Colors: `text-(--color-text-tertiary)` default; `text-(--color-state-success)` when confirmed. `aria-label="Copy to clipboard"` / `"Copied"`. Spreads `className` on the button.

**`ShikiRenderer` delta:**

Both render paths gain the same wrapper:

```tsx
<div className="relative group">
  <CopyButton
    text={code}
    className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
  />
  {/* existing content: dangerouslySetInnerHTML or <pre><code> */}
</div>
```

`code` is already the `code` prop — no change to `CodeBlockDispatcher` needed.

**`MermaidRenderer` delta:**

The SVG path and error path both gain the same wrapper. The loading path (`return null`) has nothing to copy and is left unchanged:

```tsx
// SVG path
<div className="relative group" style={{ maxWidth: '100%', overflow: 'hidden' }}>
  <CopyButton
    text={definition}
    className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
  />
  <div dangerouslySetInnerHTML={{ __html: svg }} />
</div>

// Error path — copy the raw definition so users can debug or reuse it
<div className="relative group" style={{ ... }}>
  <CopyButton
    text={definition}
    className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
  />
  {/* existing error content */}
</div>
```

#### Security, privacy, and compliance

No new attack surface. The CSS change enables standard browser text selection. `navigator.clipboard.writeText` writes text already displayed on screen.

#### Observability

No logging needed. All changes are local and ephemeral.

#### Testing plan

**Unit tests (Vitest):**

- `CopyButton.test.tsx` (new):
  - Renders `Copy` icon by default
  - Click calls `navigator.clipboard.writeText` with the provided text
  - Icon changes to `Check` after click
  - Icon resets to `Copy` after 1500ms (fake timer)
  - `aria-label` toggles correctly

- `ShikiRenderer.test.tsx` (new or update):
  - `CopyButton` rendered with the `code` prop value in both the highlighted-HTML path and the `<pre><code>` fallback

- `MermaidRenderer.test.tsx` (new or update):
  - `CopyButton` rendered with `definition` in the SVG path
  - `CopyButton` rendered with `definition` in the error path
  - No `CopyButton` in the loading path (`null`)

**Manual verification required for prose selection and paste:** WKWebView behavior cannot be tested in Vitest (jsdom). Manual testing in the running Tauri app is required to confirm prose text selection, Cmd+C, and Cmd+V paste after both fixes.

#### Alternatives considered

**Import `prosemirror-view/style/prosemirror.css` instead of adding to `app.css`:** The ProseMirror CSS contains other rules (hide-selection class, selected node outline, etc.) not relevant to this read-only viewer. Adding just the needed lines to `app.css` is more explicit.

**`cursor: default` instead of `cursor: text`:** We choose `cursor: text` because it correctly communicates that text is selectable.

#### Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `-webkit-user-select: text` on `.ProseMirror` breaks TipTap's internal drag behaviors | Low | TipTap handles drag via JavaScript event handlers, not CSS; text selection and drag are independent |
| `user-select: text` leaks selection into surrounding chrome | None | Rule is scoped to `.ProseMirror` |
| `CopyButton` z-index conflicts with Shiki's highlighted HTML | Low | `z-10` on the button is above any Shiki z-index |

## Task list

- [x] **Story: macOS Edit menu**
  - [x] **Task: Add Edit menu with `PredefinedMenuItem` entries to `lib.rs`**
    - **Description**: In `src-tauri/src/lib.rs`, add `PredefinedMenuItem` to the `tauri::menu` import. Before `Menu::with_items`, construct an Edit submenu containing `PredefinedMenuItem::undo`, `redo`, `separator`, `cut`, `copy`, `paste`, and `select_all`. Add the edit submenu to the top-level menu alongside the existing file menu.
    - **Acceptance criteria**:
      - [x] Edit menu appears in the macOS menu bar
      - [x] Manual verification: Cmd+V pastes into the chat input textarea
      - [x] Manual verification: Cmd+V pastes into the comment reply textarea in `ThreadView`
      - [x] Manual verification: Cmd+C, Cmd+X, Cmd+A work in any focused text input
      - [x] Existing File menu items and shortcuts are unchanged
      - [x] Rust compiles with no errors or warnings
    - **Dependencies**: None

- [x] **Story: Prose text selection fix**
  - [x] **Task: Add `user-select: text` to `.ProseMirror` in `app.css`**
    - **Description**: Add a `.ProseMirror` block in `src/app.css` with `-webkit-user-select: text`, `user-select: text`, and `cursor: text`. No JS changes required.
    - **Acceptance criteria**:
      - [x] `.ProseMirror { -webkit-user-select: text; user-select: text; cursor: text; }` present in `app.css`
      - [x] Manual verification: prose text can be selected by click-drag in the running Tauri app
      - [x] Manual verification: selected text copies with Cmd+C and pastes into another app
      - [x] Manual verification: double-click selects a word; triple-click selects a paragraph
      - [x] No visual regression elsewhere in the app
    - **Dependencies**: None

- [x] **Story: Copy button on code blocks**
  - [x] **Task: Implement `CopyButton`**
    - **Description**: Create `src/components/ui/CopyButton.tsx`. Accept `text: string` and optional `className?: string`. Internal `copied` boolean state. Click handler: `navigator.clipboard.writeText(text)`, on success set `copied = true`, schedule `setTimeout(() => setCopied(false), 1500)`. On failure: silently no-op. Render a single `<button>` with `Copy` icon (12px) when `!copied`, `Check` icon (12px) when `copied`. Colors: `text-(--color-text-tertiary) hover:text-(--color-text-secondary)` default; `text-(--color-state-success)` when confirmed. `aria-label="Copy to clipboard"` / `"Copied"`. Spread `className` on the button.
    - **Acceptance criteria**:
      - [x] Renders `Copy` icon by default
      - [x] Click calls `navigator.clipboard.writeText(text)` with the exact `text` prop value
      - [x] Icon changes to `Check` immediately on click
      - [x] Icon resets to `Copy` after exactly 1500ms
      - [x] `aria-label` is "Copy to clipboard" by default, "Copied" when confirmed
      - [x] Clipboard failure silently handled
      - [x] `className` applied to button element
      - [x] TypeScript compiles with no errors
    - **Dependencies**: None

  - [x] **Task: Unit tests for `CopyButton`**
    - **Description**: Create `tests/unit/components/ui/CopyButton.test.tsx`. Mock `navigator.clipboard.writeText`. Use `vi.useFakeTimers()` for the reset.
    - **Acceptance criteria**:
      - [x] Renders `Copy` icon by default
      - [x] Click calls `writeText` with correct text
      - [x] Icon → `Check` after click; → `Copy` after 1500ms
      - [x] `aria-label` toggles correctly
      - [x] All tests pass
    - **Dependencies**: Task: Implement `CopyButton`

  - [x] **Task: Add copy button to `ShikiRenderer`**
    - **Description**: Modify `src/components/markdown/ShikiRenderer.tsx`. Wrap the existing content in `<div className="relative group">`. Mount `<CopyButton text={code} className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity" />` before the content in both the highlighted-HTML path and the `<pre><code>` fallback path.
    - **Acceptance criteria**:
      - [x] `CopyButton` with `text={code}` rendered in the highlighted-HTML path
      - [x] `CopyButton` with `text={code}` rendered in the `<pre><code>` fallback path
      - [x] Button hidden by default; visible on hover; no layout shift
      - [x] TypeScript compiles with no errors
    - **Dependencies**: Task: Implement `CopyButton`

  - [x] **Task: Add copy button on Mermaid diagrams**
    - **Description**: Modify `src/components/markdown/MermaidRenderer.tsx`. Wrap the SVG render path and the error render path each in `<div className="relative group">`. Mount `<CopyButton text={definition} className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity" />` before the content in both paths. The loading path (`return null`) is left unchanged — no content to copy.
    - **Acceptance criteria**:
      - [x] `CopyButton` with `text={definition}` rendered in the SVG path
      - [x] `CopyButton` with `text={definition}` rendered in the error path
      - [x] No `CopyButton` in the loading path
      - [x] Button hidden by default; visible on hover; no layout shift
      - [x] TypeScript compiles with no errors
    - **Dependencies**: Task: Implement `CopyButton`

  - [x] **Task: Unit tests for `ShikiRenderer` copy button**
    - **Description**: Add copy button tests to `ShikiRenderer` test coverage.
    - **Acceptance criteria**:
      - [x] `CopyButton` rendered with correct `text` prop in highlighted path
      - [x] `CopyButton` rendered with correct `text` prop in fallback path
      - [x] All existing `ShikiRenderer` tests pass
    - **Dependencies**: Task: Add copy button to `ShikiRenderer`
