---
created: 2026-03-10
last_updated: 2026-03-10
status: draft
issue: 36
specced_by: markdstafford
implemented_by: null
superseded_by: null
---

# Enhancement: Migrate interactive components to design system

## Parent feature

`feature-design-system.md`

## What

Establishes standardized `Button` and `Input` primitive components using design system tokens, and migrates all existing call sites to use them. Implements the button and input component patterns defined in `design-system.md` across all variants (primary, secondary, ghost, destructive for buttons; default, focused, error, disabled for inputs). Also resolves the shadcn/Radix strategy decision from the design spec — whichever approach was approved, this enhancement implements the accessible primitive layer.

## Why

Buttons and inputs are the most frequently used interactive components in the app. Without standardized primitives, every feature adds its own button styling, accumulating inconsistencies that compound over time. Establishing these primitives now gives every future feature a correct, token-referenced starting point with accessibility built in.

## User stories

- Eric can use `<Button variant="primary">` or `<Button variant="ghost">` anywhere in the app and get the correct visual output without writing any styles
- Eric implementing a new feature never writes a raw `<button>` element with inline Tailwind classes
- All interactive elements have consistent focus states, hover states, and disabled states across the app
- All button and input interactions are keyboard-accessible and meet WCAG AA contrast requirements

## Design changes

Per `design-system.md` button and input component patterns:
- All button variants, sizes, and states as specified
- All input states as specified
- Token references for every visual property — no hardcoded values

## Technical changes

### Affected files

- `src/components/ui/Button.tsx` — new primitive component
- `src/components/ui/Input.tsx` — new primitive component
- `src/components/Sidebar.tsx` — migrate button usage
- `src/components/CreateNewDialog.tsx` — migrate button and input usage
- `src/components/AiChatPanel.tsx` — migrate button and input usage
- `src/components/SettingsView.tsx` / `src/components/SettingsPanel.tsx` — migrate form inputs
- `src/App.tsx` — migrate toolbar button usage

### Changes

Create `src/components/ui/Button.tsx` and `src/components/ui/Input.tsx` implementing the patterns from `design-system.md`. If the Radix UI approach was approved, these wrap Radix primitives with design system styling. If shadcn was approved, they are generated shadcn components with all default styles replaced.

Migrate all existing `<button>` and `<input>` elements across the codebase to use the new primitives.

## Task list

*(To be completed after `design-system.md` is finalized and `enhancement-encode-design-tokens.md` is implemented.)*
