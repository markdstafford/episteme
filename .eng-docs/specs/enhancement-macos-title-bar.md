---
created: 2026-03-10
last_updated: 2026-03-11
status: implementing
issue: 33
specced_by: markdstafford
implemented_by: null
superseded_by: null
---

# Enhancement: macOS title bar

## Parent feature

`feature-design-system.md`

## What

Replaces the default macOS system title bar with a native overlay treatment using Tauri's `titleBarStyle: "Overlay"` configuration. The system title bar background is removed; web content fills the full window including the title bar area, and the native macOS traffic lights remain embedded in the app chrome. A custom `TitleBar` component provides the drag region and title bar content layout. This enhancement also retires the existing separate settings OS window — the Tauri command and window configuration are removed as part of this change.

## Why

The default system title bar is the clearest visual signal that an app is "a website in a window." Removing it and integrating the traffic lights directly into the app chrome is one of the highest-impact single changes for achieving a desktop-native feel. The settings OS window retirement is included here because it directly conflicts with the in-app overlay principle established in the design system — it cannot ship in a post-design-system world.

## User stories

- Patricia opens the app and sees the macOS traffic lights embedded in the app frame, not floating above a grey system title bar
- Patricia can drag the window by clicking anywhere in the title bar content area that is not an interactive control
- Patricia presses Cmd+, and the settings experience opens within the app rather than spawning a new OS window
- The app window integrates visually with macOS at the same level as apps like Linear and Arc

## Design changes

The title bar is a full-width, layout-level component rendered in `App.tsx` above all panels. It is divided into three sections with no visible vertical dividers between them. A single 1px `--color-border-subtle` bottom border separates the title bar from the app content below.

```
◄──────────────────────────── full window width ─────────────────────────►

┌─────────────────────────────────────────────────────────────────────────┐ ↑
│ [■■■■ 70px ■■■■]       [←] [→] ┊      ⊙  Episteme      ┊  [↗]  [+] │ 40px
└─────────────────────────────────────────────────────────────────────────┘ ↓
───────────────────────────────────────────────────────── 1px border-subtle

◄──── var(--width-sidebar) ─────►◄──── flex: 1 ──────────►◄── auto ────►
      Section 1 (sidebar)              Section 2 (title)    Section 3 (actions)

Section 1:                        Section 2:               Section 3:
· Left: traffic lights no-drag    · Centered icon + text   · Right-aligned
· Right: nav icon buttons         · Static placeholder     · Share2 btn
· Width tracks --width-sidebar      now; dynamic (doc      · Plus (New Doc)
  so resize sync is automatic       title/breadcrumbs)       disabled if no
  when CSS var is updated           in a future pass         folderPath
```

### Token update

`--height-titlebar` is reduced from 52px to **40px**. This matches the "stoplights + padding" height seen in reference apps (Linear, Arc). Update in both `app.css` and `design-system.md`.

### Section 1 — Sidebar section (left)

- **Width**: `var(--width-sidebar)` (244px), `flexShrink: 0`. Sync with the sidebar is automatic — both reference the same CSS variable. When sidebar resizing is implemented, it must update `--width-sidebar` via `document.documentElement.style.setProperty('--width-sidebar', newWidth + 'px')`, at which point section 1 tracks the sidebar width with no further changes needed in `TitleBar`. **Min-width**: traffic lights no-drag zone (~70px) + N icon buttons × 28px each; the sidebar resize implementation is responsible for enforcing this floor.
- **Background**: `var(--color-bg-app)`
- **Traffic lights no-drag zone**: left edge, ~70px wide, `-webkit-app-region: no-drag`
- **Icon buttons**: right-aligned within the section, all `-webkit-app-region: no-drag`
- **Prototype content**: 2 placeholder icon buttons (`←` `→`)
- No workspace label or folder name — this section is controls-only

### Section 2 — Title section (center)

- **Width**: `flex: 1` — takes all remaining space between sections 1 and 3
- **Content**: icon + text label, horizontally and vertically centered
- **Drag region**: the entire section (no interactive content initially)
- **Now**: static placeholder — `Aperture` icon + "Episteme" text, centered. This slot exists so the layout is correct; content is a stand-in.
- **Future** (deferred — requires a navigation/routing model not yet designed): shows the current document title or view name, with an optional one-level breadcrumb suffix (e.g., "My issues › Activity"). The icon and text update to reflect the active context. This will be wired up in a future enhancement once the app's view/route state is established.

### Section 3 — Actions section (right)

- **Width**: fixed, sized to content (N icon buttons × 28px)
- **Content**: right-aligned icon buttons; `-webkit-app-region: no-drag` on each
- **Prototype content**: New Document button (`+`, disabled when no workspace is open) + 1 additional placeholder icon button
- The New Document action lives here (global, always-visible) rather than in the sidebar section

### Sidebar

- `TitleBar` is removed from `Sidebar.tsx`
- The original folder name header (workspace name, clickable to reopen folder picker) is restored as the first item in the sidebar nav area, below the title bar

## Technical changes

### Already implemented (do not re-implement)

- ✅ `"titleBarStyle": "Overlay"` added to window object in `src-tauri/tauri.conf.json`
- ✅ `open_settings_window` Tauri command removed from Rust backend; macOS "Settings..." menu item now emits `"menu:open-settings"` to frontend
- ✅ Settings window invocations removed from `App.tsx`
- ✅ Orphaned `#settings` hash routing removed from `src/main.tsx`

### Affected files (remaining work)

- `src/app.css` — reduce `--height-titlebar` from 52px to 40px
- `.eng-docs/wiki/design-system.md` — update `--height-titlebar` token value and title bar pattern description
- `src/components/TitleBar.tsx` — full redesign: three-section layout replacing current single-section component
- `src/components/Sidebar.tsx` — remove TitleBar; restore folder name header below the title bar
- `src/App.tsx` — render `<TitleBar>` as the first element in the window layout, above the sidebar+content flex row

### TitleBar component structure

```tsx
<div style={{ height: 'var(--height-titlebar)', display: 'flex', WebkitAppRegion: 'drag', borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-app)' }}>
  {/* Section 1: sidebar section */}
  <div style={{ width: 'var(--width-sidebar)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0 }}>
    <div style={{ width: 70, WebkitAppRegion: 'no-drag' }} /> {/* traffic lights zone */}
    {/* right-aligned icon buttons */}
  </div>

  {/* Section 2: title section */}
  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    {/* centered title */}
  </div>

  {/* Section 3: actions section */}
  <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px', WebkitAppRegion: 'no-drag' }}>
    {/* right-aligned action buttons */}
  </div>
</div>
```

Props: `folderPath: string | null` (for disabling the New Document button when no workspace is open).

## Task list

- [x] **Story: Update design token**
  - [x] **Task: Reduce `--height-titlebar` to 40px in `app.css` and `design-system.md`**
    - **Description**: Change `--height-titlebar` from `52px` to `40px` in two places: (1) the `@theme {}` block in `src/app.css`, and (2) the control dimensions table in `.eng-docs/wiki/design-system.md`. Also update the macOS title bar pattern section in `design-system.md` to replace the single-section description with the three-section layout (sidebar section, title section, actions section) as specified in this enhancement spec.
    - **Acceptance criteria**:
      - [x] `--height-titlebar: 40px` in `src/app.css`
      - [x] `--height-titlebar` row updated to 40px in `design-system.md` control dimensions table
      - [x] macOS title bar pattern section in `design-system.md` describes the three-section layout
    - **Dependencies**: None

- [x] **Story: Rebuild TitleBar component**
  - [x] **Task: Rewrite `TitleBar.tsx` as a three-section component**
    - **Description**: Substantially rewrite `src/components/TitleBar.tsx`. The new component accepts `folderPath: string | null`. It renders a full-width horizontal bar with `height: var(--height-titlebar)`, `background: var(--color-bg-app)`, `border-bottom: 1px solid var(--color-border-subtle)`, and `WebkitAppRegion: 'drag'` on the root. Use the existing `TauriStyle` type for drag region styling.
      - **Section 1 (sidebar)**: `width: var(--width-sidebar)`, `flexShrink: 0`. Using the CSS variable here — not a hardcoded value — is what makes section 1 automatically track the sidebar width when resizing is implemented. Left 70px is the traffic lights no-drag zone (empty div, `WebkitAppRegion: 'no-drag'`). Remaining space: 2 placeholder icon buttons (`ChevronLeft`, `ChevronRight` from Lucide, 16px), right-aligned. Each button: 28×28px, transparent bg, `var(--color-text-tertiary)`, hover bg `var(--color-bg-hover)`, `var(--radius-base)`, `WebkitAppRegion: 'no-drag'`.
      - **Section 2 (title)**: `flex: 1`. Centered row: `Aperture` icon (14px, `var(--color-text-tertiary)`) + "Episteme" text (`var(--font-size-ui-base)`, weight 500, `var(--color-text-secondary)`, `var(--font-ui)`), gap `var(--space-2)`.
      - **Section 3 (actions)**: `flexShrink: 0`, padding-right `var(--space-2)`, `WebkitAppRegion: 'no-drag'`. Contains: `Share2` placeholder button + `Plus` New Document button. When `folderPath` is null, Plus button renders `opacity: 0.4, cursor: 'not-allowed'` and is `disabled`.
      - Rewrite `tests/unit/TitleBar.test.tsx`: (1) section 1 back/forward buttons render, (2) "Episteme" title renders, (3) New Document button disabled when `folderPath` is null, (4) New Document button enabled when `folderPath` is non-null.
    - **Acceptance criteria**:
      - [x] Three sections render in a single horizontal row
      - [x] Height `var(--height-titlebar)`, background `var(--color-bg-app)`, bottom border `1px solid var(--color-border-subtle)`
      - [x] Root div is `-webkit-app-region: drag`; all buttons are `-webkit-app-region: no-drag`
      - [x] Section 1 is `var(--width-sidebar)` wide with left 70px no-drag zone and back/forward buttons right-aligned
      - [x] Section 2 fills remaining space with centered "Episteme" icon+text
      - [x] Section 3 has Share2 placeholder button and Plus New Document button
      - [x] New Document button is visually disabled (`opacity: 0.4`) and `disabled` attribute set when `folderPath` is null
      - [x] New Document button is not disabled when `folderPath` is a string
      - [x] 4 TitleBar tests pass
    - **Dependencies**: "Task: Reduce `--height-titlebar` to 40px"

- [x] **Story: Update layout integration**
  - [x] **Task: Remove TitleBar from `Sidebar.tsx` and restore folder name header**
    - **Description**: Undo the TitleBar integration from the previous implementation pass. (1) Remove `import { TitleBar }` and the `<TitleBar folderName={folderName} />` render. (2) Re-add `openFolder` from `useWorkspaceStore`. (3) Restore the folder name header as the first child inside the scroll container (`overflow-y-auto` div, not above it): a div with `data-testid="folder-header"` showing `folderName` (clickable → `openFolder()`), plus the Plus button (`setDialogOpen(true)`). Use the same Tailwind classes as the original — the sidebar migration enhancement handles token alignment. (4) Restore the 4 header tests removed from `tests/unit/Sidebar.test.tsx`: folder header renders, clicking name calls `openFolder`, truncation class present, flex row layout.
    - **Acceptance criteria**:
      - [x] No TitleBar import or render in `Sidebar.tsx`
      - [x] `openFolder` subscribed from workspace store
      - [x] Folder name header div present inside scroll container when `folderName` is non-null, absent when null
      - [x] Clicking folder name calls `openFolder()`
      - [x] Plus button renders when `onStartAuthoring` prop is provided
      - [x] `data-testid="folder-header"` present on header div
      - [x] All sidebar tests pass including the 4 restored header tests
    - **Dependencies**: None

  - [x] **Task: Add `TitleBar` to `App.tsx` as full-width strip above the main layout**
    - **Description**: Integrate the rebuilt TitleBar into `App.tsx`. (1) Import `TitleBar` from `@/components/TitleBar`. (2) Change the outermost layout div from `flex h-screen` to `flex flex-col h-screen`. (3) Render `<TitleBar folderPath={folderPath} />` as the first child. (4) Wrap the sidebar + content + chat panel row in a new inner `<div className="flex flex-1 min-h-0">` — `flex-1` fills remaining height, `min-h-0` prevents flex children from overflowing. (5) Add `<TitleBar folderPath={folderPath} />` to the loading-state and welcome-screen early returns so the window remains draggable in those states. The `DesignKitchen` early return does not get TitleBar. (6) Update `tests/unit/app.test.tsx` to verify TitleBar is present in the main layout.
    - **Acceptance criteria**:
      - [x] `TitleBar` imported and rendered in `App.tsx`
      - [x] Outer div is `flex flex-col h-screen`
      - [x] TitleBar is the first child of the outer div in the main layout path
      - [x] Sidebar, content column, and chat panel are inside `flex flex-1 min-h-0` inner div
      - [x] TitleBar renders in the loading state and welcome screen paths
      - [x] DesignKitchen path renders without TitleBar
      - [x] All existing tests pass; new test verifies TitleBar in main layout
    - **Dependencies**: "Task: Rewrite TitleBar.tsx as a three-section component"
