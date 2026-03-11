---
created: 2026-03-10
last_updated: 2026-03-10
status: accepted
decided_by: markdstafford
superseded_by: null
---

# ADR-009: Keyboard shortcuts strategy

## Status

Accepted

## Context

As Episteme grows, users will perform many distinct actions — creating documents, switching modes, sending messages, navigating between files. Without a consistent approach to keyboard shortcuts, these either get added ad hoc (inconsistent modifier keys, no discoverability) or not added at all.

Two constraints matter: the app targets macOS now and Windows later, so shortcuts need platform-aware key bindings (Cmd on macOS, Ctrl on Windows). And shortcuts need to be registered through a central mechanism — not hardcoded at the component level — so they're enumerable, displayable in tooltips and dialogs, and rebindable in the future (see issue #26).

The decision is: what is the app-wide convention for keyboard shortcuts — which actions get them, how are modifier keys chosen, and how are they registered?

## Decision

All user-facing actions should have keyboard shortcuts. Shortcuts are registered through a central Zustand store that maps named actions to key bindings. Components bind to action names through the registry rather than handling raw key events directly. The registry owns platform normalization (Cmd on macOS, Ctrl on Windows), conflict detection, and display strings used in tooltips, menus, and dialogs.

Focus behavior (suppressing shortcuts when a text input has focus) is handled by the registry, not by individual components.

## Consequences

**Positive:**
- All shortcuts are enumerable: help screens, tooltip labels, and dialog shortcut badges all read from one source
- Platform normalization (Cmd/Ctrl) lives in one place — no `metaKey` vs `ctrlKey` conditionals scattered across components
- Conflict detection is possible since every registered shortcut is known to the registry
- User-assignable shortcuts (issue #26) is a natural extension — rebinding updates the registry, components don't change
- Consistent with the existing Zustand state management pattern (ADR-003)

**Negative:**
- More upfront infrastructure than hardcoding — the registry needs to be designed and built before the first shortcut can use it
- Components must bind to action names through the registry API rather than handling `onKeyDown` directly, which is a new convention the codebase needs to follow consistently
- Focus behavior edge cases (suppressing shortcuts inside inputs) need to be handled manually rather than relying on a library

## Alternatives considered

### Option A: Hardcode shortcuts per component

Each component defines its own `onKeyDown` handlers and modifier keys inline with no shared infrastructure.

**Pros:**
- Simple, zero upfront cost
- Works immediately with no new abstractions

**Cons:**
- Can't enumerate shortcuts for help screens or tooltip population
- No conflict detection
- Platform-specific logic duplicated everywhere
- Conventions drift across components over time

**Why not chosen:** Makes user-assignable shortcuts (issue #26) effectively impossible and produces an unmaintainable mess as the shortcut surface grows.

### Option C: Library (`react-hotkeys-hook` or similar) + registry on top

Use a battle-tested shortcut library for low-level event handling and modifier normalization, with a thin registry layer on top for action naming and rebinding.

**Pros:**
- Library handles focus trapping, modifier normalization, and React lifecycle edge cases
- Less code to write than a full DIY registry
- Still supports centralized rebinding

**Cons:**
- Adds a dependency
- The registry layer still needs to be built regardless
- Tauri apps have tighter focus control than typical web apps, so library-handled edge cases are less likely to matter
- Some impedance mismatch between library API and a custom action-name system

**Why not chosen:** The library solves edge cases that are unlikely to arise in a Tauri app, while the registry layer — the majority of the actual work — needs to be built either way. Option B gives full control without the dependency.
