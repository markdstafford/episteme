---
created: 2026-03-10
last_updated: 2026-03-12
status: complete
issue: 36
specced_by: markdstafford
implemented_by: markdstafford
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

### Changes

Create `src/components/ui/Button.tsx` and `src/components/ui/Input.tsx` implementing the patterns from `design-system.md`. All visual properties reference design tokens — no hardcoded values.

Call site migrations are out of scope for this enhancement. Each per-area migration enhancement (`enhance-migrate-sidebar.md` #34, `enhance-migrate-toolbar.md` #35, `enhance-migrate-overlays.md` #37, `enhance-migrate-ai-chat.md` #39, and #46 for SettingsView) is responsible for swapping raw `<button>` and `<input>` elements with these primitives as part of their broader design system migration work.

## Task list

- [x] **Story: Create Button primitive**
  - [x] **Task: Create `src/components/ui/Button.tsx`**
    - **Description**: Implement the Button primitive from `design-system.md`. Supports four variants (primary, secondary, ghost, destructive), two sizes (base: 28px; sm: 24px for toolbar use), icon+label layout (14px icon, 8px gap), and icon-only mode (square, requires `aria-label`). All visual properties reference design tokens — no hardcoded values.
    - **Acceptance criteria**:
      - [x] File exists at `src/components/ui/Button.tsx`
      - [x] `variant` prop: `"primary" | "secondary" | "ghost" | "destructive"`, defaults to `"secondary"`
      - [x] `size` prop: `"base" | "sm"`, defaults to `"base"` (28px); sm is 24px
      - [x] Primary: bg `--color-accent`, hover `--color-accent-hover`, white text, no border
      - [x] Secondary: bg `--color-bg-elevated`, hover `--color-bg-hover`, text `--color-text-primary`, 1px `--color-border-default` border
      - [x] Ghost: transparent bg, hover `--color-bg-subtle`, text `--color-text-secondary`, no border
      - [x] Destructive: bg `--color-state-danger`, hover `oklch(62% 0.2 25)`, white text, no border
      - [x] Base padding `--padding-control` (0 12px); radius `--radius-base`; font `--font-size-ui-base` (13px) weight 400
      - [x] Icon-only mode: square (28×28px base, 24×24px sm), centered icon
      - [x] Focus ring: `outline: 2px solid var(--color-accent)`, `outline-offset: 2px`
      - [x] Disabled: `opacity: 0.4`, `cursor: not-allowed`, no hover effect
      - [x] Transitions: background and color `--duration-fast`
      - [x] Props extend `React.ButtonHTMLAttributes<HTMLButtonElement>`
      - [x] No hardcoded color or size values
    - **Note**: Implemented in PR #44 (enhancement-macos-title-bar). Tests fixed for jsdom border shorthand behaviour.
    - **Dependencies**: None

- [x] **Story: Create Input primitive**
  - [x] **Task: Create `src/components/ui/Input.tsx`**
    - **Description**: Implement the Input primitive from `design-system.md`. Covers all states (default, hover, focus, error, disabled). Forwards `ref` via `React.forwardRef` to support focus-on-mount patterns.
    - **Acceptance criteria**:
      - [x] File exists at `src/components/ui/Input.tsx`
      - [x] Height `--height-control-base` (28px), padding `0 10px`, radius `--radius-base`
      - [x] Background `--color-bg-subtle`, border `1px solid var(--color-border-default)`
      - [x] Font `--font-size-ui-base` (13px), text `--color-text-primary`, placeholder `--color-text-tertiary`
      - [x] Hover: border `--color-border-strong`
      - [x] Focus: border `--color-accent`, box-shadow `0 0 0 2px var(--color-accent-subtle)`, no default outline
      - [x] `error?: boolean` prop: border `--color-state-danger`, shadow `0 0 0 2px var(--color-state-danger-subtle)`
      - [x] Disabled: border `--color-border-subtle`, `opacity: 0.4`
      - [x] Transitions: border-color and box-shadow `--duration-fast`
      - [x] Forwards `ref` via `React.forwardRef`
      - [x] Props extend `React.InputHTMLAttributes<HTMLInputElement>`
      - [x] No hardcoded color or size values
    - **Dependencies**: None
