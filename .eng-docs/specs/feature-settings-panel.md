---
created: 2026-03-10
last_updated: 2026-03-12
completed: 2026-03-12
status: complete
issue: null
specced_by: markdstafford
implemented_by: markdstafford
superseded_by: null
---

# Feature: Settings panel

## Parent feature

`feature-design-system.md`

## What

Settings is a place you go, not a window that appears. Pressing Cmd+, takes you there; pressing Esc or clicking "Back to app" brings you back. The app remembers exactly where you were.

## Why

A separate OS window for settings is disorienting — it breaks the spatial model of the application, competes with the main window for focus, and feels like a different product. Users shouldn't have to think about which window they're in. Settings should feel like part of the app: reachable, navigable, and dismissible without breaking flow.

## User stories

- Patricia is reading a document. She presses Cmd+, and the app transitions to settings: the sidebar contents are replaced with "Back to app" and a list of categories, and the content area shows the selected category's settings
- Patricia changes a setting and the change takes effect immediately — there is no save button
- Patricia clicks a different category in the sidebar and the content area updates to show that category's settings
- Patricia clicks "Back to app" and the app returns her to the exact document and sidebar state she left
- Patricia presses Esc from anywhere in settings and the app returns her to her previous state
- Eric adds a new settings category by adding an entry to the settings configuration — no changes to the core layout are required

## Design changes

Per `design-system.md` settings and navigation experience pattern and `app-layout.md` for zone definitions:

**Layout during settings mode**

- The sidebar contents are replaced by settings navigation: "Back to app" link with left chevron at the top, a `--color-border-subtle` separator below it, then a vertical list of category nav items each with a 16px Lucide icon and label
- The full content area is replaced by the settings panel for the selected category. There is no toolbar, no AI chat panel, no document viewer. Settings mode owns the full content area
- The title bar remains visible but its content is unchanged in this phase (title bar updates are deferred)

**Category navigation**

- Category items follow the main sidebar nav item spec: `--height-nav-item`, `--font-size-ui-lg`, `--padding-sidebar-item`, `--radius-md`
- Icon size 16px, `--space-2` gap between icon and label
- Default: `--color-text-secondary`, transparent background; hover: `--color-text-primary`, `--color-bg-subtle`; selected: `--color-text-primary`, `--color-bg-hover`

**Settings content area**

- Background: `--color-bg-base`
- Content is vertically scrollable; the panel takes the full available height
- Section headers: `--font-size-ui-md` (14px), weight 500, uppercase, letter-spacing 0.06em, `--color-text-tertiary`; `--space-4` bottom margin
- Form rows: `--height-control-base` (28px) controls, `--space-5` gap between rows
- All settings take effect immediately on change — no save/apply button

**Transition**

- Entering and exiting settings: cross-fade, `--duration-slow` (250ms), `--ease-default` — deliberate, feels like navigation

## Technical changes

### Affected files

- `src/stores/settings.ts` — new store; owns settings mode state and active category
- `src/components/SettingsNav.tsx` — new component; the settings sidebar navigation
- `src/components/SettingsPanel.tsx` — new component; the settings content area
- `src/App.tsx` — add Cmd+, and Esc handlers; conditionally render settings layout vs normal layout
- `src/components/Sidebar.tsx` — read settings mode from store; render SettingsNav in place of children when active
- `src/components/SettingsView.tsx` — existing file; migrate content into SettingsPanel, then delete

### Settings schema

Settings are defined as a static configuration tree. The schema has three levels:

```
Category
  └─ Section
       └─ Setting
```

**Category** — top-level navigation item in the sidebar. Has an id, label, icon, and display order.

**Section** — a labeled group of related settings within a category. Has an id, label, and display order. Rendered as a section header in the content area.

**Setting** — an individual configurable value. Has:
- `id: string` — stable identifier used for persistence
- `label: string` — display label
- `type: "text" | "select" | "toggle"` — drives which control renders
- `order: number` — display order within its section
- `defaultValue` — type-matched to the setting type
- `options` — for `select` type: array of `{ value, label }`

Categories, sections, and settings are all ordered by their `order` field. The rendering layer is generic — adding a new setting means adding an entry to the config, not writing new UI code.

### Changes

**Settings store (`src/stores/settings.ts`)**

A dedicated Zustand store keeps settings mode state isolated from workspace concerns:
- `settingsOpen: boolean` (default `false`)
- `activeCategory: string` (default first category by order)
- Actions: `openSettings()`, `closeSettings()`, `setActiveCategory(category: string)`

**Settings mode entry and exit (`App.tsx`)**

- Cmd+, is already registered as a native menu accelerator in `src-tauri/src/lib.rs` and emits a `menu:open-settings` Tauri event. `App.tsx` adds a `listen("menu:open-settings")` handler (matching the existing `menu:open-folder` pattern) that calls `openSettings()`
- `keydown` listener handles Esc — calls `closeSettings()` when settings is open
- Both listeners are removed on unmount
- When `settingsOpen` is `true`, `App.tsx` renders the settings layout: `Sidebar` (which self-switches to `SettingsNav`) + `SettingsPanel`. The toolbar and `AiChatPanel` are not rendered in settings mode

**Sidebar (`src/components/Sidebar.tsx`)**

Reads `settingsOpen` from the settings store. When true, renders `SettingsNav` in place of `{children}`. Cross-fade transition between the two states using `--duration-slow`.

**SettingsNav (`src/components/SettingsNav.tsx`)**

- "← Back" link: calls `closeSettings()`, `--font-size-ui-base`, `--color-text-tertiary` default, `--color-text-primary` on hover
- Separator: `--space-4` gap above, 1px `--color-border-subtle`
- Category list: items with icon + label driven by the settings config; active state from store, calls `setActiveCategory()` on click

**SettingsPanel (`src/components/SettingsPanel.tsx`)**

- Renders the content area for the active category
- Iterates sections and settings from the config for the active category; rendering is generic
- Migrates existing `SettingsView.tsx` content (AWS Profile) into the appropriate category and section in the config

**Immediate-effect settings**

All settings save on change using the existing `invoke("save_preferences", ...)` pattern. No save/apply button is added.

## Task list

- [ ] **Story: Settings state management**
  - [ ] **Task: Create `src/stores/settings.ts`**
    - **Description**: Add a Zustand store that owns settings mode state, isolated from workspace concerns. Follows the same pattern as the existing stores in `src/stores/`.
    - **Acceptance criteria**:
      - [ ] `settingsOpen: boolean` defaults to `false`
      - [ ] `activeCategory: string` defaults to the first category by order
      - [ ] `openSettings()`, `closeSettings()`, and `setActiveCategory(category: string)` actions are implemented and update state correctly
      - [ ] Store is fully TypeScript-typed and importable
    - **Dependencies**: None

- [ ] **Story: SettingsNav component**
  - [ ] **Task: Create `src/components/SettingsNav.tsx`**
    - **Description**: New component that renders the settings sidebar contents — a "Back to app" link, a separator, and a list of category nav items. Reads active category from the settings store. Category list is driven by the settings config (not hardcoded). Uses the same nav item dimensions and token-based styling as the main sidebar file tree.
    - **Acceptance criteria**:
      - [ ] "← Back to app" link renders at the top; clicking it calls `closeSettings()`
      - [ ] Link uses `--font-size-ui-base`, `--color-text-tertiary` default, `--color-text-primary` on hover
      - [ ] `--space-4` gap below the Back link, then a 1px `--color-border-subtle` separator
      - [ ] Category items render with a 16px Lucide icon and label; `--height-nav-item`, `--font-size-ui-lg`, `--padding-sidebar-item`, `--radius-md`
      - [ ] Default / hover / selected states match the sidebar nav item spec in `design-system.md`
      - [ ] Clicking a category calls `setActiveCategory()`; selected state reflects store
      - [ ] No hardcoded Tailwind color or size classes — design token utilities only
    - **Dependencies**: Task: Create `src/stores/settings.ts`

- [ ] **Story: SettingsPanel component**
  - [ ] **Task: Create `src/components/SettingsPanel.tsx` shell**
    - **Description**: New component that renders the settings content area. Reads `activeCategory` from the settings store and routes to the correct category's content. For categories with no settings yet, renders a placeholder. Layout and typography follow the settings content area spec in `design-system.md`.
    - **Acceptance criteria**:
      - [ ] Background is `--color-bg-base`; component takes full available height and is vertically scrollable
      - [ ] Section headers use `--font-size-ui-md`, weight 500, uppercase, letter-spacing 0.06em, `--color-text-tertiary`, `--space-4` bottom margin
      - [ ] Form rows use `--height-control-base` controls with `--space-5` gap between rows
      - [ ] Switching `activeCategory` in the store updates the displayed content
      - [ ] Categories with no settings render a placeholder
    - **Dependencies**: Task: Create `src/stores/settings.ts`
  - [ ] **Task: Migrate AI settings content into `SettingsPanel.tsx`**
    - **Description**: Move the AWS Profile setting from `SettingsView.tsx` into the appropriate category and section in the settings config. Restyle using design tokens — all legacy `gray-*` Tailwind classes replaced. Retain the existing `invoke("save_preferences")` save-on-change behavior unchanged.
    - **Acceptance criteria**:
      - [ ] AWS Profile setting is functionally identical to current `SettingsView.tsx`
      - [ ] Section header follows the pattern from the shell task
      - [ ] Label uses `--font-size-ui-base`, `--color-text-secondary`
      - [ ] Input uses `--color-bg-subtle` background, 1px `--color-border-default`, `--radius-base`, `--color-text-primary`, `--color-text-tertiary` placeholder
      - [ ] Input focus state: `--color-accent` border + `--color-accent-subtle` shadow ring
      - [ ] No `gray-*` or other legacy Tailwind classes anywhere in the component
      - [ ] Save-on-change behavior works as before
    - **Dependencies**: Task: Create `src/components/SettingsPanel.tsx` shell

- [ ] **Story: Wire Sidebar**
  - [ ] **Task: Update `Sidebar.tsx` to swap contents in settings mode**
    - **Description**: `Sidebar.tsx` reads `settingsOpen` from the settings store. When true, renders `SettingsNav` instead of `{children}`. Cross-fade transition between the two states. The sidebar shell (dimensions, background) is unchanged in both modes.
    - **Acceptance criteria**:
      - [ ] `SettingsNav` renders inside the sidebar when `settingsOpen` is true
      - [ ] `{children}` (FileTree) renders when `settingsOpen` is false
      - [ ] Cross-fade transition uses `--duration-slow` and `--ease-default` on both enter and exit
      - [ ] Sidebar shell dimensions and background are identical in both modes
    - **Dependencies**: Task: Create `src/stores/settings.ts`, Task: Create `src/components/SettingsNav.tsx`

- [ ] **Story: Wire App.tsx**
  - [ ] **Task: Add settings mode event and keyboard handlers to `App.tsx`**
    - **Description**: Wire up the two entry/exit mechanisms for settings mode. The `menu:open-settings` Tauri event is already emitted by the native menu (Cmd+, accelerator in `src-tauri/src/lib.rs`) — add a `listen("menu:open-settings")` handler following the same pattern as the existing `menu:open-folder` listener. Add a `keydown` listener for Esc that calls `closeSettings()` only when settings is open. Both listeners must be cleaned up on unmount.
    - **Acceptance criteria**:
      - [ ] Pressing Cmd+, opens settings mode via the existing native menu event
      - [ ] Pressing Esc closes settings mode when open; does nothing when already closed
      - [ ] Both listeners are removed on component unmount
      - [ ] No regression to existing keyboard shortcuts or menu handlers
    - **Dependencies**: Task: Create `src/stores/settings.ts`
  - [ ] **Task: Conditionally render settings layout vs normal layout in `App.tsx`**
    - **Description**: When `settingsOpen` is true, render the settings layout: `Sidebar` (which self-switches internally) alongside `SettingsPanel`. The toolbar and `AiChatPanel` must not render in settings mode. When `settingsOpen` is false, render the normal layout as today. Apply a cross-fade transition between the two layouts.
    - **Acceptance criteria**:
      - [ ] `SettingsPanel` renders in the content area when settings mode is open
      - [ ] Toolbar and `AiChatPanel` are absent from the DOM in settings mode
      - [ ] Normal layout is fully restored on exit — including `AiChatPanel` if it was open before entering settings
      - [ ] Cross-fade transition uses `--duration-slow` and `--ease-default` on both enter and exit
    - **Dependencies**: Task: Add settings mode event and keyboard handlers to `App.tsx`, Task: Create `src/components/SettingsPanel.tsx` shell

- [ ] **Story: Cleanup**
  - [ ] **Task: Delete `src/components/SettingsView.tsx`**
    - **Description**: `SettingsView.tsx` is fully superseded by `SettingsPanel.tsx`. Delete the file and verify no remaining imports.
    - **Acceptance criteria**:
      - [ ] `src/components/SettingsView.tsx` does not exist
      - [ ] No file in the codebase imports `SettingsView`
    - **Dependencies**: Task: Migrate AI settings content into `SettingsPanel.tsx`, Task: Conditionally render settings layout vs normal layout in `App.tsx`
