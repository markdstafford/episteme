---
created: 2026-03-10
last_updated: 2026-03-10
status: draft
issue: 35
specced_by: markdstafford
implemented_by: null
superseded_by: null
---

# Enhancement: Migrate toolbar to design system

## Parent feature

`feature-design-system.md`

## What

Migrates the main toolbar and welcome screen to use design system tokens. Implements the toolbar component pattern defined in `design-system.md`, including the correct height, button sizing, and the mode-awareness rule (formatting tools visible only in edit mode).

## Why

The toolbar sits between the title bar and the document area and is visible on every document view. Migrating it completes the top-of-window chrome alongside the title bar enhancement, giving the app a fully consistent header region.

## User stories

- Patricia sees a toolbar that matches the density and visual language of the sidebar and title bar
- Patricia only sees formatting tools when in edit mode — the toolbar does not display irrelevant controls
- Eric can implement new toolbar buttons by following the existing token-referenced pattern

## Design changes

Per `design-system.md` toolbar pattern:
- Height, button sizing, separator treatment, and mode-awareness behavior as specified
- All color values replaced with semantic token references

## Technical changes

### Affected files

- `src/App.tsx` — toolbar area; apply design system tokens and correct height
- `src/components/WelcomeScreen.tsx` — apply design system tokens

### Changes

Replace hardcoded Tailwind classes with design system token references in the toolbar area of `App.tsx`. Implement mode-awareness for toolbar controls per the design spec. Migrate `WelcomeScreen.tsx` to use design system tokens for background, typography, and any interactive elements.

## Task list

*(To be completed after `design-system.md` is finalized and `enhancement-encode-design-tokens.md` is implemented.)*
