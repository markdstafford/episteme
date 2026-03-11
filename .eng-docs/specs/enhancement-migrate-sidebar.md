---
created: 2026-03-10
last_updated: 2026-03-11
status: complete
issue: 34
specced_by: markdstafford
implemented_by: markdstafford
superseded_by: null
---

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

- [ ] **Story: Migrate Sidebar.tsx**
  - [ ] **Task: Replace hardcoded styles in Sidebar.tsx**
    - **Description**: Replace bespoke Tailwind color and border classes. Per spec: background is `--color-bg-app`, no `border-right` (background contrast handles separation). Folder header uses section header tokens: `--font-size-ui-xs` (11px), weight 500, uppercase, letter-spacing 0.06em, `--color-text-quaternary`. Hover on folder name uses `--color-bg-subtle`.
    - **Acceptance criteria**:
      - [ ] `border-r border-gray-200 dark:border-gray-700` removed
      - [ ] `bg-white dark:bg-gray-900` replaced with `bg-(--color-bg-app)` token utility
      - [ ] Folder header `border-b border-gray-200 dark:border-gray-700` replaced with `border-b border-(--color-border-subtle)`
      - [ ] Folder name text color uses `--color-text-quaternary`
      - [ ] Folder name hover background uses `--color-bg-subtle`
      - [ ] No hardcoded color values remain
    - **Dependencies**: None

- [ ] **Story: Migrate FileTreeItem.tsx**
  - [ ] **Task: Fix item layout — height, padding, radius, font**
    - **Description**: Items must match the nav item spec exactly: height `--height-nav-item` (28px), base horizontal padding 8px (from `--padding-sidebar-item`), with `paddingLeft` override for depth indentation preserved, font size `--font-size-ui-lg` (16px), border radius `--radius-md` (6px). Remove the existing `px-3 py-1 text-sm` classes.
    - **Acceptance criteria**:
      - [ ] Item height is 28px (`h-(--height-nav-item)`)
      - [ ] Base horizontal padding is 8px (matches `--padding-sidebar-item`)
      - [ ] Font size is 16px (`text-(--font-size-ui-lg)`)
      - [ ] Border radius is 6px (`rounded-(--radius-md)`)
      - [ ] `px-3 py-1 text-sm` removed
    - **Dependencies**: None
  - [ ] **Task: Fix item color states — default, hover, selected, focused**
    - **Description**: Replace all bespoke color classes for all interactive states. Default: text `--color-text-secondary`, background transparent. Hover: text `--color-text-primary`, background `--color-bg-subtle`. Selected: text `--color-text-primary`, background `--color-bg-hover`. Add background transition at `--duration-fast`. Focus ring: replace `ring-2 ring-blue-500 ring-inset` with `outline-2 outline-(--color-accent) outline-offset-2` — use `outline` not `ring` since the sidebar scroll container has `overflow-y-auto` which would clip `box-shadow`-based rings.
    - **Acceptance criteria**:
      - [ ] Default text uses `--color-text-secondary` (no `text-gray-*`)
      - [ ] Hover background uses `--color-bg-subtle` (no `hover:bg-gray-100 dark:hover:bg-gray-800`)
      - [ ] Hover text uses `--color-text-primary`
      - [ ] Selected background uses `--color-bg-hover` (no `bg-blue-50 dark:bg-blue-900/30`)
      - [ ] Selected text uses `--color-text-primary` (no `text-blue-700 dark:text-blue-300`)
      - [ ] Background transition uses `--duration-fast`
      - [ ] Focus ring uses `outline` with `--color-accent` (no hardcoded `ring-blue-500`)
      - [ ] No hardcoded color values remain
    - **Dependencies**: "Task: Fix item layout — height, padding, radius, font"
  - [ ] **Task: Fix icon sizing and colors**
    - **Description**: Icons vary in apparent size because flex items lack `shrink-0` — flex compression changes their rendered size when filenames are long. Fix: add `shrink-0` to all icon and spacer elements. Per spec: Folder and FileText icons are 16px; the expand chevron (ChevronRight) is 12px. The non-directory spacer (`<span className="w-4">`) should match the chevron at 12px for alignment. Icon gap is 8px (`gap-2`). Colors: `--color-text-tertiary` by default, `--color-text-secondary` on hover/selected. ChevronRight rotation transition uses `--duration-fast` and `--ease-default`.
    - **Acceptance criteria**:
      - [ ] All icon and spacer elements have `shrink-0`
      - [ ] Folder and FileText icons are exactly 16px (`size-4`)
      - [ ] ChevronRight is exactly 12px (`size-3`)
      - [ ] Non-directory spacer is 12px (`w-3`) to match chevron width
      - [ ] Icon gap is 8px (`gap-2`)
      - [ ] Icon color is `--color-text-tertiary` by default (no `text-gray-400`)
      - [ ] Icon color is `--color-text-secondary` on hover/selected state
      - [ ] ChevronRight rotation transition uses `duration-(--duration-fast)` and `ease-(--ease-default)`
    - **Dependencies**: "Task: Fix item layout — height, padding, radius, font"

- [ ] **Story: Migrate FileTree.tsx**
  - [ ] **Task: Replace bespoke styles in FileTree.tsx empty state**
    - **Description**: The "No markdown files found" empty state uses `text-gray-400 text-sm`. Replace with design system token equivalents: `--color-text-tertiary` for color, `--font-size-ui-sm` (12px) for font size.
    - **Acceptance criteria**:
      - [ ] `text-gray-400` replaced with `--color-text-tertiary` token utility
      - [ ] `text-sm` replaced with `text-(--font-size-ui-sm)`
      - [ ] No hardcoded color values remain
    - **Dependencies**: None
