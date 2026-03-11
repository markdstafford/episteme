---
created: 2026-03-10
last_updated: 2026-03-10
status: draft
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

Per `design-system.md` title bar pattern:
- Title bar height and background color as specified
- Traffic lights zone (left side, no-drag area) as specified
- Drag region covers remaining title bar area
- Title bar content layout (workspace label, right-side controls) as specified
- Sidebar header aligns with and extends into the title bar area

## Technical changes

### Affected files

- `src-tauri/tauri.conf.json` — add `titleBarStyle: "Overlay"` to window configuration
- `src/components/TitleBar.tsx` — new component
- `src/App.tsx` — integrate `TitleBar`, remove settings window invocation
- `src-tauri/src/lib.rs` (or equivalent) — remove `open_settings_window` command
- `src-tauri/tauri.conf.json` — remove separate settings window configuration

### Changes

**`tauri.conf.json`**: Add to the window object:
```json
"titleBarStyle": "Overlay"
```

**`TitleBar.tsx`**: New component that renders the title bar content area. Sets `-webkit-app-region: drag` on the container and `-webkit-app-region: no-drag` on all interactive child elements. Accounts for the traffic lights zone (~78px from the left edge on macOS). Uses design system tokens for height, background, and typography.

**Settings window retirement**: Remove the `open_settings_window` Tauri command from the Rust backend and its corresponding window entry from `tauri.conf.json`. Update `App.tsx` to remove the `invoke("open_settings_window")` call. The Cmd+, shortcut handler remains but routes to the in-app settings panel (implemented in `enhancement-settings-panel.md`). If that enhancement is not yet implemented, the shortcut can be a no-op temporarily.

## Task list

*(To be completed after `design-system.md` is finalized — task breakdown depends on the specific title bar design patterns defined there.)*
