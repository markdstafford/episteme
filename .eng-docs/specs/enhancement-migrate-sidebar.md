# Enhancement: Migrate sidebar to design system

## Parent feature

`feature-design-system.md`

## What

Migrates the sidebar and file tree components to use design system tokens for all visual properties — colors, typography, spacing, density, border radius, and interaction states. Implements the sidebar component pattern defined in `design-system.md`, including the correct width, item height, section header treatment, icon sizing, and hover/selected/active states.

## Why

The sidebar is the primary persistent surface of the application — it is visible on every screen and sets the first impression of the app's density and visual quality. It is the highest-priority component migration because its before/after difference is the most visible signal that the design system is working.

## User stories

- Patricia sees a sidebar that feels native and compact, not like a website navigation panel
- Patricia can distinguish selected, hover, and default states clearly without visual noise
- Eric can reference the sidebar implementation as the canonical example of how to apply design system tokens to a navigation component

## Design changes

Per `design-system.md` sidebar pattern:
- Width, item height, section header styles, icon sizing, and all interaction states as specified
- All color values replaced with semantic token references

## Technical changes

### Affected files

- `src/components/Sidebar.tsx` — apply design system tokens; implement design spec layout
- `src/components/FileTree.tsx` — apply design system tokens
- `src/components/FileTreeItem.tsx` — apply design system tokens; implement item height, icon sizing, hover/selected states per spec

### Changes

Replace all hardcoded Tailwind color classes, spacing values, and sizing with design system token references. Implement the exact component pattern from `design-system.md`. No behavior changes — this is a visual migration only.

## Task list

*(To be completed after `design-system.md` is finalized and `enhancement-encode-design-tokens.md` is implemented.)*
