---
created: 2026-03-10
last_updated: 2026-03-12
status: approved
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

- [ ] **Story: Add missing Radix overlay package dependencies**
  - [ ] **Task: Install `@radix-ui/react-context-menu` and `@radix-ui/react-popover`**
    - **Description**: Add `@radix-ui/react-context-menu` and `@radix-ui/react-popover` to `package.json` dependencies. `@radix-ui/react-dialog` is already present. Run `npm install` to install both. Confirm they appear in `node_modules` and `package-lock.json` is updated.
    - **Acceptance criteria**:
      - [ ] `@radix-ui/react-context-menu` appears in `package.json` dependencies
      - [ ] `@radix-ui/react-popover` appears in `package.json` dependencies
      - [ ] `npm install` completes without errors
      - [ ] Both packages resolve correctly when imported in TypeScript
    - **Dependencies**: None

- [ ] **Story: Dialog primitive**
  - [ ] **Task: Create `src/components/ui/Dialog.tsx`**
    - **Description**: Create a Dialog primitive wrapping `@radix-ui/react-dialog`. Export named sub-components: `Dialog` (Root), `DialogTrigger`, `DialogOverlay`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogBody`, `DialogFooter`, and `DialogClose`. Apply all visual styling from design tokens — no hardcoded color, spacing, radius, or shadow values. Specifically:
      - `DialogOverlay`: `position: fixed; inset: 0; background: oklch(0% 0 0 / 0.5); backdrop-filter: blur(4px)`. Animate in with fade at `--duration-normal`; animate out at `--duration-fast`. Use Radix `data-[state=open]` / `data-[state=closed]` attributes for animation targeting.
      - `DialogContent`: `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--color-bg-elevated); border-radius: var(--radius-xl); box-shadow: var(--shadow-lg); width: 480px` (default). Animate in with fade + scale from `0.97` → `1.0` at `--duration-normal`, `--ease-default`; animate out in reverse at `--duration-fast`. Use `data-[state]` attributes.
      - `DialogHeader`: `padding: var(--padding-panel); border-bottom: 1px solid var(--color-border-subtle); display: flex; align-items: center; justify-content: space-between`.
      - `DialogTitle`: `font-size: var(--font-size-ui-md); font-weight: 600; color: var(--color-text-primary)`.
      - `DialogBody`: `padding: var(--padding-panel); font-size: var(--font-size-ui-base); color: var(--color-text-secondary)`.
      - `DialogFooter`: `padding: var(--space-4); border-top: 1px solid var(--color-border-subtle); display: flex; justify-content: flex-end; gap: var(--space-2)`.
      - `DialogClose`: ghost icon-only button using the existing `Button` primitive (`variant="ghost"`, icon-only), with `aria-label="Close dialog"`, containing a 16px `X` icon from Lucide.
    - **Acceptance criteria**:
      - [ ] All sub-components exported from `Dialog.tsx`
      - [ ] No hardcoded color, spacing, radius, or shadow values — all reference CSS custom properties
      - [ ] Backdrop renders with blur and semi-transparent background
      - [ ] Container enters with fade + scale and exits in reverse at the correct durations
      - [ ] Header, body, and footer are visually separated by 1px `--color-border-subtle` borders
      - [ ] Close button is a ghost icon-only button, keyboard-focusable, with ARIA label
      - [ ] `Escape` closes the dialog (Radix default)
      - [ ] Focus is trapped within the dialog while open (Radix default)
    - **Dependencies**: None (`@radix-ui/react-dialog` already installed)

- [ ] **Story: ContextMenu primitive**
  - [ ] **Task: Create `src/components/ui/ContextMenu.tsx`**
    - **Description**: Create a ContextMenu primitive wrapping `@radix-ui/react-context-menu`. Export named sub-components: `ContextMenu` (Root), `ContextMenuTrigger`, `ContextMenuContent`, `ContextMenuItem`, `ContextMenuSeparator`, `ContextMenuLabel`, and `ContextMenuShortcut`. Apply all visual styling from design tokens:
      - `ContextMenuContent`: `background: var(--color-bg-overlay); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); padding: var(--space-1) 0; min-width: 180px; max-width: 280px; z-index: 50`. Add `box-shadow: var(--shadow-base)` in light mode via `@media (prefers-color-scheme: light)`. Enter/exit via Radix `data-[state]` attributes using `--duration-fast`.
      - `ContextMenuItem`: `height: var(--height-control-base); padding: 0 8px; font-size: var(--font-size-ui-base); color: var(--color-text-secondary); border-radius: var(--radius-md); display: flex; align-items: center; cursor: default`. Hover: `background: var(--color-bg-hover); color: var(--color-text-primary)`. Accept a `destructive` boolean prop: when true, `color: var(--color-state-danger)`. Disabled: `opacity: 0.4; pointer-events: none`.
      - `ContextMenuSeparator`: `height: 1px; background: var(--color-border-subtle); margin: var(--space-1) 0`.
      - `ContextMenuLabel`: `font-size: var(--font-size-ui-xs); font-weight: 500; text-transform: uppercase; color: var(--color-text-quaternary); padding: var(--space-1) 8px`. Not interactive.
      - `ContextMenuShortcut`: `margin-left: auto; font-size: var(--font-size-ui-xs); color: var(--color-text-quaternary)`.
    - **Acceptance criteria**:
      - [ ] All sub-components exported from `ContextMenu.tsx`
      - [ ] No hardcoded color, spacing, radius, or shadow values
      - [ ] Shadow renders in light mode only (via `prefers-color-scheme: light` media query)
      - [ ] `destructive` prop on `ContextMenuItem` renders text in `--color-state-danger`
      - [ ] Disabled items have `opacity: 0.4` and are not interactive
      - [ ] Keyboard navigation works (arrow keys, Enter, Escape — Radix default)
    - **Dependencies**: "Task: Install `@radix-ui/react-context-menu` and `@radix-ui/react-popover`"

- [ ] **Story: Popover primitive**
  - [ ] **Task: Create `src/components/ui/Popover.tsx`**
    - **Description**: Create a Popover primitive wrapping `@radix-ui/react-popover`. Export named sub-components: `Popover` (Root), `PopoverTrigger`, `PopoverContent`, and `PopoverClose`. Apply the same container treatment as ContextMenu: `background: var(--color-bg-overlay); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); padding: var(--space-2)`. Add `box-shadow: var(--shadow-base)` in light mode via `@media (prefers-color-scheme: light)`. Enter/exit via Radix `data-[state]` attributes with `--duration-fast`. No specific consumer in this enhancement — the primitive is created to establish the pattern for future use.
    - **Acceptance criteria**:
      - [ ] All sub-components exported from `Popover.tsx`
      - [ ] No hardcoded color, spacing, radius, or shadow values
      - [ ] Shadow renders in light mode only
      - [ ] Popover positions correctly relative to its trigger (Radix default)
      - [ ] `Escape` closes the popover (Radix default)
    - **Dependencies**: "Task: Install `@radix-ui/react-context-menu` and `@radix-ui/react-popover`"

- [ ] **Story: Migrate CreateNewDialog**
  - [ ] **Task: Migrate `CreateNewDialog.tsx` to use Dialog primitive**
    - **Description**: Replace the current manual overlay implementation with the `Dialog` primitive. Specifically:
      - Remove the manual `<div className="fixed inset-0" onClick={onClose} />` click-capture backdrop.
      - Remove the manual `<div className="fixed top-1/3 left-1/2 ... bg-white dark:bg-gray-800 ...">` container with all hardcoded Tailwind color and layout classes.
      - Wrap the return value with `<Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>`.
      - Render `<DialogContent>` containing a `<DialogHeader>` with `<DialogTitle>New document</DialogTitle>` and `<DialogClose />`, followed by `<DialogBody>` containing the option buttons.
      - In the option buttons: replace `hover:bg-gray-100 dark:hover:bg-gray-700` with `hover:bg-(--color-bg-hover)`, replace `text-gray-900 dark:text-gray-100` with `text-(--color-text-primary)`, replace the keyboard shortcut badge's `bg-gray-100 dark:bg-gray-700` with `bg-(--color-bg-hover)` and `text-(--color-text-quaternary)`, and replace icon `text-gray-400` with `text-(--color-text-tertiary)`.
      - Preserve all existing logic unchanged: the `useEffect` data loading, `handleSelect` MRU flow, the `useEffect` keyboard shortcut handler (Escape + number keys), and the `onSelect`/`onClose` callbacks.
    - **Acceptance criteria**:
      - [ ] No hardcoded Tailwind `gray-*` or `dark:*` classes remain in the file
      - [ ] Dialog renders using `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogBody` primitives
      - [ ] Backdrop blur and fade animation apply per the Dialog primitive spec
      - [ ] MRU logic and `onSelect`/`onClose` callbacks are preserved and function identically
      - [ ] Keyboard shortcuts (Escape closes, 1–N selects option) continue to work
      - [ ] Dialog appears centered within the app window (no separate OS window)
      - [ ] All existing `CreateNewDialog` unit tests continue to pass; update mocks if needed
    - **Dependencies**: "Task: Create `src/components/ui/Dialog.tsx`"

- [ ] **Story: Wire ContextMenu to FileTree**
  - [ ] **Task: Add right-click context menu to `FileTreeItem.tsx`**
    - **Description**: Wrap the existing `<button>` in `FileTreeItem.tsx` with `ContextMenu` and `ContextMenuTrigger` so right-clicking any file tree item opens a context menu. Define initial menu items using existing callback props — no new props needed:
      - For files: an "Open" item that calls `onSelect(node.path)`.
      - For directories: an "Expand" or "Collapse" item (label matches `isExpanded` state) that calls `onToggle(node.path)`.
      - A `ContextMenuSeparator`, then a disabled "Rename" item (placeholder for future work, `disabled` prop set to `true`).
      Use `ContextMenu`, `ContextMenuContent`, `ContextMenuItem`, and `ContextMenuSeparator` from the new primitive. Do not add new props to `FileTreeItem`.
    - **Acceptance criteria**:
      - [ ] Right-clicking a file item opens a context menu with an "Open" item
      - [ ] Right-clicking a directory item opens a context menu with "Expand" or "Collapse" matching current state
      - [ ] A separator and disabled "Rename" item appear below the primary action
      - [ ] Context menu renders with correct design-token styling (background, border, radius, shadow in light mode)
      - [ ] Left-click behavior on the tree item is unchanged
      - [ ] Keyboard navigation within the menu works (arrow keys, Enter, Escape)
      - [ ] No new props added to the `FileTreeItem` interface
      - [ ] Existing `FileTreeItem` unit tests continue to pass; add tests for context menu rendering
    - **Dependencies**: "Task: Create `src/components/ui/ContextMenu.tsx`"
