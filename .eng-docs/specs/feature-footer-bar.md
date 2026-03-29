---
created: 2026-03-26
last_updated: 2026-03-29
status: complete
issue: 124
specced_by: markdstafford
implemented_by: markdstafford
superseded_by: null
---

# Footer bar

## What

The footer bar is a narrow, persistent strip at the bottom of the application window. Its primary job is to hold icons that let users control what's visible in their workspace and surface at-a-glance information about the current document — things like document state, word count, or other contextual details. In its initial form, it provides two controls: a button to show and hide the sidebar, and a button to show and hide the AI chat panel.

## Why

Episteme's primary interaction surfaces — the title bar and document area — need to stay minimal so users can focus on their work. But burying controls in menus makes them effectively invisible. The footer bar strikes the middle ground: a consistent, low-profile home for controls and information that users need to find, but don't reach for constantly. Layout toggles are the natural first residents — discoverable when you want them, out of the way when you don't.

## Personas

- **Patricia: Product Manager**
- **Eric: Engineer**
- **Raquel: Reviewer**

## Narratives

### Focusing in, then navigating out

Eric opens a technical design document he needs to finish reviewing. The sidebar and AI panel are both visible, but he wants to give the document his full attention. He glances at the footer and clicks the sidebar toggle — the file tree disappears, and the document expands to fill the space. He notices the footer shows a reading time estimate for the document; it's a long one, about twelve minutes. He settles in.

Halfway through, he wants to check a related document. He clicks the sidebar toggle again, picks the file, then hides the sidebar once more and returns to his review. When he's ready to ask the AI a question, he clicks the AI panel toggle in the footer — the chat panel slides in without him needing to reach for the title bar.

## User stories

**Focusing in, then navigating out**

- Eric can toggle the sidebar and AI panel from the footer
- Eric can see at-a-glance information about the current document in the footer

## Goals

- Sidebar and AI panel can be toggled from the footer
- Footer displays reading time for the current document
- Footer height is visually subordinate to the title bar (24px vs 32px)
- Share icon and AI panel toggle are removed from the title bar

## Non-goals

- No additional doc metadata beyond reading time in this initial version
- No persistence of panel visibility state across sessions

## Design spec

#### FooterBar

- Narrow bar fixed to the bottom of the app window, 24px tall, full width
- Background and border-top match the title bar's treatment (`--color-bg-app`, `--color-border-subtle`)
- Three zones: left, center, right. Center is always flex-1 and sits between left and right. When the sidebar is visible, the left zone matches `--width-sidebar`; when hidden, it shrinks to the button width. When the AI panel is visible, the right zone matches the AI panel width; when hidden, it shrinks to the button width. This keeps the center zone aligned under the document viewer in all layout states.

#### Sidebar toggle (left zone)

- Icon button using `PanelLeft` (lucide), 14px
- Accent (`--color-accent`) when sidebar is open, tertiary (`--color-text-tertiary`) when closed

#### AI panel toggle (right zone — moved here from title bar)

- Icon button using `Sparkles` (lucide), 14px
- Accent (`--color-accent`) when panel is open, tertiary (`--color-text-tertiary`) when closed

#### Reading time (center zone)

- Text label, `--font-size-ui-xs`, `--color-text-tertiary`
- Format: "X min read"
- Centered within the center zone
- Empty when no document is open

## Tech spec

### Introduction and overview

**Prerequisites**
- ADR-003: Zustand state management
- ADR-004: Tailwind CSS styling
- Existing `TitleBar`, `Sidebar`, `AiChatPanel`, `DocumentViewer` components

**Goals**
- Render a `FooterBar` component at the bottom of the app window across all layout states
- Sidebar and AI panel visibility controlled from the footer
- Reading time derived from current document content and displayed in the footer center zone
- AI panel toggle and Share button removed from `TitleBar`

**Non-goals**
- Persistence of panel visibility state across sessions
- Additional document metadata beyond reading time
- Resizable sidebar or AI panel (future work, but the footer zone sizing must accommodate it cleanly)
- Any backend changes

**Glossary**
- *Center zone*: the flex-1 middle section of the footer, intended to align visually under the document viewer
- *Reading time*: estimated read duration computed from word count at ~200 wpm

### System design and architecture

**Component breakdown**

*New*
- `FooterBar` — renders the three-zone footer bar; receives sidebar and AI panel state as props

*Modified*
- `App` — adds `sidebarVisible` state; passes it and its setter to `FooterBar`; conditionally renders `Sidebar`; renders `FooterBar` at the bottom of all layout branches
- `TitleBar` — removes Share button and AI panel toggle button; removes `aiPanelOpen` and `onToggleAiPanel` props
- `DocumentViewer` (or child) — computes reading time from current document content and exposes it for the footer center zone

**State**

`sidebarVisible` and `aiPanelOpen` remain local state in `App`. Both will eventually need to move to a store when resizing is added (so panel widths can be tracked reactively). The footer zone sizing should use CSS variables (`--width-sidebar` for the left zone, a new `--width-ai-panel` for the right zone) so that adding resize support later only requires updating the CSS variable, not reworking the footer layout.

The AI panel width is currently hardcoded as `w-96` in `ChatView`. This should be extracted to `--width-ai-panel: 384px` in `app.css` so the footer right zone can reference it.

### Detailed design

**CSS variables**

Add to `app.css`:
- `--height-footer: 24px`
- `--width-ai-panel: 384px`

Replace `w-96` in `ChatView` with `w-[var(--width-ai-panel)]`.

**FooterBar layout**

Three-zone flex row:
- Left zone: `width: sidebarVisible ? "var(--width-sidebar)" : "auto"` — contains sidebar toggle, left-aligned
- Center zone: `flex: 1` — contains reading time, centered
- Right zone: `width: aiPanelOpen ? "var(--width-ai-panel)" : "auto"` — contains AI panel toggle, right-aligned

**Reading time**

A pure utility function `computeReadingTime(markdown: string): number` — strips markdown syntax, counts words, divides by 200, rounds up. Returns minutes as an integer. Displayed as "X min read"; returns `null` when no document is open (center zone renders nothing).

Where to call it: `DocumentViewer` has access to the current file content. It computes reading time and passes it up to `App` via a callback prop `onReadingTimeChange`, which passes it down to `FooterBar`.

**TitleBar cleanup**

Remove `aiPanelOpen`, `onToggleAiPanel` props and the Share and AI panel toggle buttons. The `onStartAuthoring` prop remains (used for new document creation).

### Testing plan

**Unit tests**
- `computeReadingTime` — test word counting, markdown stripping, rounding, and null/empty input

**Component tests**
- `FooterBar` — renders sidebar toggle and AI panel toggle; correct icon color when open/closed; reading time displays correctly; reading time absent when null
- `FooterBar` zone sizing — left zone width matches `--width-sidebar` when sidebar visible, shrinks to auto when hidden; right zone mirrors this for AI panel

**Integration**
- Sidebar toggles correctly from footer in full app render
- AI panel toggles correctly from footer in full app render
- `TitleBar` no longer renders Share or AI panel toggle buttons

### Alternatives considered

**Toolbar instead of footer** — a floating toolbar or inline document controls were considered but don't provide the persistent, low-profile presence the footer does. The footer's fixed position at the window edge makes it consistently findable without intruding on content.

**Store-based layout state now** — moving `sidebarVisible` and `aiPanelOpen` to Zustand immediately was considered. Deferred because local state in `App` is sufficient for this feature, and the right store design will be clearer once resizing requirements are known.

### Risks

- **Reading time prop-drilling** — passing reading time from `DocumentViewer` up through `App` and back down to `FooterBar` is workable now but will get unwieldy as more footer content is added. Mitigation: accept the prop-drill for now; move to a store when a second piece of footer content is introduced.
- **Zone alignment drift** — if the sidebar or AI panel width changes, the footer zones must be updated in sync. Mitigation: both widths are CSS variables; the footer references them directly, so they stay in sync automatically.

## Task list

- [x] **Story: Foundation**
  - [x] **Task: Add CSS variables**
    - **Description**: Add `--height-footer: 24px` and `--width-ai-panel: 384px` to the `:root` block in `app.css`.
    - **Acceptance criteria**:
      - [x] `--height-footer` and `--width-ai-panel` defined in `app.css`
      - [x] `w-96` in `ChatView` replaced with `w-[var(--width-ai-panel)]`
      - [x] AI panel visual width unchanged
    - **Dependencies**: None
  - [x] **Task: Implement `computeReadingTime` utility**
    - **Description**: Create `src/lib/readingTime.ts` exporting `computeReadingTime(markdown: string | null): number | null`. Strip markdown syntax (headings, bold, links, code fences, etc.), count words, divide by 200, round up. Return `null` for null/empty input.
    - **Acceptance criteria**:
      - [x] Returns `null` for null or empty string
      - [x] Strips common markdown syntax before counting
      - [x] Returns correct integer for typical document lengths
      - [x] Unit tests pass (see tests story)
    - **Dependencies**: None

- [x] **Story: FooterBar component**
  - [x] **Task: Build `FooterBar` component**
    - **Description**: Create `src/components/FooterBar.tsx`. Three-zone flex row at `--height-footer` tall, full width, `--color-bg-app` background, `--color-border-subtle` border-top. Props: `sidebarVisible: boolean`, `onToggleSidebar: () => void`, `aiPanelOpen: boolean`, `onToggleAiPanel: () => void`, `readingTime: number | null`. Left zone width is `var(--width-sidebar)` when sidebar visible, `auto` when not. Right zone width is `var(--width-ai-panel)` when AI panel open, `auto` when not. Center zone is `flex: 1`.
    - **Acceptance criteria**:
      - [x] Renders sidebar toggle (`PanelLeft`, 14px) left-aligned in left zone
      - [x] Renders AI panel toggle (`Sparkles`, 14px) right-aligned in right zone
      - [x] Both icons show `--color-accent` when their panel is open, `--color-text-tertiary` when closed
      - [x] Left zone width matches `--width-sidebar` when sidebar visible
      - [x] Right zone width matches `--width-ai-panel` when AI panel open
      - [x] Reading time displayed as "X min read" centered in center zone
      - [x] Center zone empty when `readingTime` is null
    - **Dependencies**: "Task: Add CSS variables"

- [x] **Story: App integration**
  - [x] **Task: Add sidebar visibility state and wire FooterBar**
    - **Description**: In `App.tsx`, add `sidebarVisible` state (default `true`). Wrap `<Sidebar>` in `{sidebarVisible && ...}` in the main layout branch. Add `readingTime` state (`number | null`, default `null`) and `onReadingTimeChange` callback prop on `DocumentViewer`. Import and render `<FooterBar>` at the bottom of all layout branches (loading, no-folder, and main), passing all required props.
    - **Acceptance criteria**:
      - [x] Sidebar shows/hides when sidebar toggle clicked
      - [x] AI panel shows/hides when AI panel toggle clicked
      - [x] `FooterBar` present in all three layout branches
      - [x] `readingTime` passed through to `FooterBar`
    - **Dependencies**: "Task: Build `FooterBar` component"

- [x] **Story: DocumentViewer reading time**
  - [x] **Task: Compute and emit reading time from DocumentViewer**
    - **Description**: In `DocumentViewer`, call `computeReadingTime` whenever the current document's markdown content changes. Emit the result via an `onReadingTimeChange?: (minutes: number | null) => void` callback prop. Pass `null` when no document is open.
    - **Acceptance criteria**:
      - [x] `onReadingTimeChange` called with correct value when a document is opened
      - [x] `onReadingTimeChange` called with `null` when no document is open
      - [x] Does not call on every render — only when content changes
    - **Dependencies**: "Task: Implement `computeReadingTime` utility", "Task: Add sidebar visibility state and wire FooterBar"

- [x] **Story: TitleBar cleanup**
  - [x] **Task: Remove Share button and AI panel toggle from TitleBar**
    - **Description**: Remove the Share icon button and MessageSquare AI panel toggle button from `TitleBar.tsx`. Remove the `aiPanelOpen` and `onToggleAiPanel` props from the `TitleBarProps` interface and all call sites in `App.tsx`.
    - **Acceptance criteria**:
      - [x] Share button absent from TitleBar
      - [x] AI panel toggle absent from TitleBar
      - [x] No TypeScript errors at TitleBar call sites
      - [x] No dead props remaining in `TitleBarProps`
    - **Dependencies**: "Task: Add sidebar visibility state and wire FooterBar"

- [x] **Story: Tests**
  - [x] **Task: Unit tests for `computeReadingTime`**
    - **Description**: Create `tests/unit/lib/readingTime.test.ts`. Cover: null input, empty string, plain text word count, markdown stripping (headings, bold, links, code fences), rounding up.
    - **Acceptance criteria**:
      - [x] All cases listed in description covered
      - [x] Tests pass
    - **Dependencies**: "Task: Implement `computeReadingTime` utility"
  - [x] **Task: Component tests for `FooterBar`**
    - **Description**: Create `tests/unit/components/FooterBar.test.tsx`. Test icon rendering, active/inactive color classes, reading time display, empty center zone when readingTime is null, and zone width logic for both panels open/closed.
    - **Acceptance criteria**:
      - [x] Sidebar toggle renders with correct color in both states
      - [x] AI panel toggle renders with correct color in both states
      - [x] "X min read" renders correctly for a given readingTime value
      - [x] Center zone empty when readingTime is null
      - [x] Tests pass
    - **Dependencies**: "Task: Build `FooterBar` component"
  - [x] **Task: Integration tests for App layout**
    - **Description**: Add tests to the existing App-level test suite covering: sidebar toggles from footer, AI panel toggles from footer, TitleBar does not render Share or AI panel toggle buttons.
    - **Acceptance criteria**:
      - [x] Sidebar hidden after clicking sidebar toggle
      - [x] Sidebar visible again after clicking toggle a second time
      - [x] AI panel shown/hidden correctly from footer
      - [x] TitleBar assertions for removed buttons pass
      - [x] Tests pass
    - **Dependencies**: "Task: Remove Share button and AI panel toggle from TitleBar", "Task: Add sidebar visibility state and wire FooterBar"
