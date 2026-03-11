---
created: 2026-03-10
last_updated: 2026-03-10
status: draft
issue: 37
specced_by: markdstafford
implemented_by: null
superseded_by: null
---

# Enhancement: Migrate overlays to design system

## Parent feature

`feature-design-system.md`

## What

Migrates dialogs, context menus, popovers, and the create new document dialog to use design system tokens and component patterns. Implements the overlay component patterns defined in `design-system.md` — all overlays render within the application window (no separate OS windows), with the correct background, elevation, border radius, and motion treatment.

## Why

Overlays are the highest-elevation components in the visual hierarchy — they appear above everything else and define how the app handles transient UI surfaces. Without design system tokens, each overlay makes independent decisions about background color, shadow, and border radius, producing a visually inconsistent experience. Standardizing them also enforces the in-app overlay principle: if all overlays use the same primitive, there is no path to accidentally spawning an OS window.

## User stories

- Patricia opens the create new document dialog and sees it rendered within the app with the correct elevation treatment
- Patricia right-clicks in the file tree and sees a context menu that matches the visual language of the rest of the app
- All overlay interactions use the correct motion tokens (enter/exit transitions as specified)
- Eric implementing a new overlay uses the established dialog or popover primitive and gets correct elevation, motion, and accessibility for free

## Design changes

Per `design-system.md` dialog, context menu, and popover patterns:
- Background, border, border radius, and elevation (shadow or color-contrast-based) as specified
- Motion: enter/exit transitions using the approved motion tokens
- Backdrop treatment for modal dialogs as specified
- All color and spacing values replaced with semantic token references

## Technical changes

### Affected files

- `src/components/ui/Dialog.tsx` — new primitive component (wraps Radix Dialog or shadcn Dialog per approved strategy)
- `src/components/ui/ContextMenu.tsx` — new primitive component
- `src/components/ui/Popover.tsx` — new primitive component
- `src/components/CreateNewDialog.tsx` — migrate to use Dialog primitive

### Changes

Create overlay primitives in `src/components/ui/` implementing the patterns from `design-system.md`. Migrate `CreateNewDialog.tsx` to use the new `Dialog` primitive. All overlay primitives must use design system tokens for every visual property — no hardcoded values.

## Task list

*(To be completed after `design-system.md` is finalized and `enhancement-encode-design-tokens.md` is implemented.)*
