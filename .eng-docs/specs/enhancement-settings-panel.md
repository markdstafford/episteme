# Enhancement: Settings panel

## Parent feature

`feature-design-system.md`

## What

Replaces the retired settings OS window with an in-app settings panel that follows the Linear-style navigation pattern. When the user opens settings (Cmd+,), the app navigates to a settings "place" — the main content area is replaced with settings content, and the sidebar transforms into a settings navigation menu. A "Back to app" control with a left chevron at the top of the sidebar returns the user to their previous state. This is not a dialog or overlay — it is a navigation mode, and it should feel like the app went somewhere.

## Why

Settings is the primary secondary experience in the app — the place every user visits to configure their workspace. The previous implementation (a separate OS window) conflicted with the design system's in-app overlay principle and broke the spatial model of the application. The new pattern, drawn directly from Linear's implementation, keeps the user inside the application context and makes it immediately clear how to return to their work.

## User stories

- Patricia presses Cmd+, and the settings panel opens within the app without spawning a new window
- Patricia can navigate between settings categories using the sidebar navigation that replaces the file tree
- Patricia can return to her document and the exact sidebar state she left by clicking "Back to app"
- Eric can add new settings categories by adding entries to the settings navigation structure without modifying the core layout

## Design changes

Per `design-system.md` settings and navigation experience pattern:
- Main content area transitions to settings content view
- Sidebar replaces file tree with settings category navigation
- "Back to app" link with left chevron at top of sidebar
- Transition behavior between normal mode and settings mode as specified
- Settings category content uses standard panel/form component patterns from the design system

## Technical changes

### Affected files

- `src/components/SettingsPanel.tsx` — new component; the settings content area
- `src/components/SettingsNav.tsx` — new component; the settings sidebar navigation
- `src/App.tsx` — add settings mode state; conditionally render SettingsPanel and SettingsNav
- `src/components/Sidebar.tsx` — accept and render SettingsNav when in settings mode
- `src/components/SettingsView.tsx` — existing file; migrate content into SettingsPanel

### Changes

Settings mode is managed as application state (likely a boolean or enum in the workspace store or a new settings store). When active:
- `App.tsx` renders `SettingsPanel` in place of `DocumentViewer`
- `Sidebar` renders `SettingsNav` (with "Back to app" at top) in place of `FileTree`

The Cmd+, shortcut handler in `App.tsx` (currently invoking the retired OS window command) is updated to toggle settings mode instead.

Existing settings content in `SettingsView.tsx` is migrated into `SettingsPanel.tsx` and styled using design system tokens.

## Task list

*(To be completed after `design-system.md` is finalized and `enhancement-encode-design-tokens.md` is implemented.)*
