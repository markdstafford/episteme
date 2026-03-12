---
created: 2026-03-10
last_updated: 2026-03-12
status: draft
issue: 35
specced_by: markdstafford
implemented_by: null
superseded_by: null
---

# Enhancement: Migrate welcome screen to design system

## Parent feature

`feature-design-system.md`

## What

Removes the existing toolbar from `App.tsx` and migrates `WelcomeScreen.tsx` to use design system tokens. The toolbar (a thin strip between the title bar and document area containing only the AI chat toggle) is deleted entirely — the toggle will be replaced with a keyboard shortcut, and any persistent controls will eventually live in a footer. The welcome screen retains its current layout and behavior but drops all hardcoded Tailwind color classes in favor of semantic token references.

## Why

The toolbar currently holds a single button that will be replaced by a keyboard shortcut. Deleting it now removes dead UI surface and gives the document area the full vertical space. Migrating the welcome screen completes the design system token pass for all non-document surfaces visible before a workspace is opened.

## User stories

- Patricia opens the app and sees a welcome screen that matches the visual language of the rest of the app
- Patricia has the full window height available for the document area — no empty toolbar consuming vertical space

## Design changes

- Toolbar div removed from `App.tsx`; document area expands to fill the vacated height
- `WelcomeScreen.tsx`: replace `bg-gray-50 dark:bg-gray-900` with `var(--color-bg-app)`, `text-gray-900 dark:text-gray-100` with `var(--color-text-primary)`, `text-gray-600 dark:text-gray-400` with `var(--color-text-secondary)`, `bg-blue-600 hover:bg-blue-700` with the `Button` primitive (`variant="primary"`), and `text-red-600` with `var(--color-state-danger)`

## Technical changes

### Affected files

- `src/App.tsx` — delete toolbar div and the `MessageSquare` import
- `src/components/WelcomeScreen.tsx` — replace hardcoded Tailwind color classes with design token references; replace the open-folder button with the `Button` primitive

### Changes

Delete the toolbar `<div>` (lines 126–136 of current `App.tsx`) and remove the unused `MessageSquare` Lucide import. In `WelcomeScreen.tsx`, replace all hardcoded `gray-*`, `dark:*`, `blue-*`, and `red-*` Tailwind classes with inline style references to the appropriate semantic tokens. Replace the `<button>` element with the `Button` primitive (`variant="primary"`).

## Task list

*(To be decomposed at implementation time.)*
