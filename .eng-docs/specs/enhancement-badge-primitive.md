---
created: 2026-03-12
last_updated: 2026-03-12
status: complete
issue: 48
specced_by: markdstafford
implemented_by: markdstafford
superseded_by: null
---

# Enhancement: Badge primitive

## Parent feature

`feature-design-system.md`

## What

The design system gains a `Badge` primitive at `src/components/ui/Badge.tsx` with five variants: neutral, accent, danger, warning, and success. Each variant uses WCAG AA compliant color pairings. The primitive follows the existing spec geometry: `--height-control-sm`, `--radius-sm`, `--font-size-ui-xs`, weight 500. The DesignKitchen badge showcase and the `FrontmatterBar` `+N more` overflow indicator are migrated to use it, and the badge color values in `design-system.md` are updated to match the implementation.

## Why

Badge-like elements appear in multiple places in the app today as hardcoded inline styles. Formalizing them into a primitive eliminates visual drift between call sites and gives engineers a single, unambiguous component to reach for. The accessibility fix is included here because shipping a primitive with non-compliant colors would entrench the problem — correcting it at creation time costs nothing extra.

## User stories

- Eric can render a status label by writing `<Badge variant="danger">Error</Badge>` rather than an inline-styled span
- Eric can add a new badge call site without making any color or sizing decisions
- Patricia sees consistent badge styling across all parts of the app
- A user relying on color contrast can read badge labels across all five variants

## Design changes

Delta on the design system's Badges and tags component pattern.

**Geometry** (unchanged from current spec):

| Property | Value |
|---|---|
| Height | `--height-control-sm` (24px) |
| Padding | `0 8px` |
| Font size | `--font-size-ui-xs` (11px) |
| Font weight | 500 |
| Border radius | `--radius-sm` (3px) |
| Display | `inline-flex`, `align-items: center` |

No border. The background color defines the badge boundary.

**Corrected color values:**

The current spec pairs text and background at identical lightness values, producing near-zero contrast. Corrected values use dark tinted backgrounds with bright text in dark mode, and light tinted backgrounds with dark text in light mode.

| Variant | Mode | Background | Text |
|---|---|---|---|
| Neutral | dark | `oklch(21% 0.022 264)` | `oklch(92% 0.008 264)` |
| Neutral | light | `oklch(93% 0.005 264)` | `oklch(45% 0.01 264)` |
| Accent | dark | `oklch(24% 0.05 230)` | `oklch(74% 0.175 230)` |
| Accent | light | `oklch(95% 0.03 230)` | `oklch(42% 0.175 230)` |
| Danger | dark | `oklch(24% 0.06 25)` | `oklch(75% 0.22 25)` |
| Danger | light | `oklch(95% 0.04 25)` | `oklch(42% 0.22 25)` |
| Warning | dark | `oklch(24% 0.06 65)` | `oklch(82% 0.18 65)` |
| Warning | light | `oklch(95% 0.04 65)` | `oklch(42% 0.18 65)` |
| Success | dark | `oklch(24% 0.06 155)` | `oklch(76% 0.16 155)` |
| Success | light | `oklch(95% 0.04 155)` | `oklch(40% 0.16 155)` |

These values replace the current `-subtle` token definitions in `design-system.md` and `app.css`.

## Technical changes

### Affected files

- `src/components/ui/Badge.tsx` — new primitive; exports `Badge` with `variant` prop
- `src/app.css` — move `-subtle` tokens from mode-independent `@theme {}` to mode-specific `dark/:root {}` and `light/@media` blocks with corrected WCAG AA values; add `--color-badge-*-text` tokens
- `src/components/DesignKitchen.tsx` — migrate badge showcase to use `<Badge>`
- `src/components/FrontmatterBar.tsx` — migrate `+N more` overflow indicator to `<Badge variant="neutral">`
- `.eng-docs/wiki/design-system.md` — update badge color values to match corrected tokens

### Changes

The `Badge` component accepts a `variant` prop (`"neutral" | "accent" | "danger" | "warning" | "success"`, default `"neutral"`) and `children`. All visual properties reference CSS tokens — no hardcoded values in the component. The corrected `-subtle` token values are defined in `app.css`; the component references them by token name.

## Task list

- [x] **Story: Badge primitive**
  - [x] **Task: Update badge color tokens in `app.css`**
    - **Description**: In the `@theme {}` block in `src/app.css`, update the `-subtle` token values for accent, danger, warning, and success to the corrected dark/light mode pairs from the design spec. Neutral badge uses existing `--color-bg-hover` and `--color-text-secondary` tokens which are already correct.
    - **Acceptance criteria**:
      - [x] All five `-subtle` background tokens updated for dark mode
      - [x] All five `-subtle` background tokens updated for light mode
      - [x] Values match the design spec table exactly
    - **Dependencies**: None
  - [x] **Task: Implement `Badge` component**
    - **Description**: Create `src/components/ui/Badge.tsx`. Export a `Badge` component accepting `variant: "neutral" | "accent" | "danger" | "warning" | "success"` (default `"neutral"`) and `children: React.ReactNode`. Apply geometry and color tokens per the design spec. All visual properties must use CSS tokens — no hardcoded values.
    - **Acceptance criteria**:
      - [x] All five variants render with correct geometry (24px height, `--radius-sm`, `--font-size-ui-xs`, weight 500, `0 var(--space-2)` padding)
      - [x] Each variant uses the correct background and text tokens
      - [x] No hardcoded color or size values in the component
      - [x] Default variant is `"neutral"` when prop is omitted
    - **Dependencies**: Task: Update badge color tokens in `app.css`
  - [x] **Task: Write unit tests for `Badge`**
    - **Description**: Create `tests/unit/components/Badge.test.tsx`. Cover: each variant renders, default variant is neutral, children render correctly.
    - **Acceptance criteria**:
      - [x] Each of the five variants renders without error
      - [x] Correct variant class/token is applied per variant
      - [x] Children render as expected
      - [x] All tests pass
    - **Dependencies**: Task: Implement `Badge` component

- [x] **Story: Migrate call sites**
  - [x] **Task: Migrate DesignKitchen badge showcase to `<Badge>`**
    - **Description**: In `src/components/DesignKitchen.tsx`, replace the hardcoded badge `<span>` elements in the Components section with `<Badge variant="...">` for all five variants. Remove the inline style objects they replaced.
    - **Acceptance criteria**:
      - [x] All five variants rendered via `<Badge>` in the kitchen sink
      - [x] No hardcoded badge-like inline styles remain in the showcase
    - **Dependencies**: Task: Implement `Badge` component
  - [x] **Task: Migrate `FrontmatterBar` overflow indicator to `<Badge>`**
    - **Description**: In `src/components/FrontmatterBar.tsx`, replace the hardcoded `+N more` overflow `<span>` with `<Badge variant="neutral">+{hiddenCount} more</Badge>`. Remove the inline style block it replaces.
    - **Acceptance criteria**:
      - [x] `+N more` indicator uses `<Badge variant="neutral">`
      - [x] No hardcoded inline styles remain for this element
      - [x] Existing FrontmatterBar tests pass
    - **Dependencies**: Task: Implement `Badge` component

- [x] **Story: Documentation**
  - [x] **Task: Update `design-system.md` badge color values**
    - **Description**: In `.eng-docs/wiki/design-system.md`, update the Badges and tags component pattern section with the corrected color values from the design spec. Replace the old `-subtle` token values with the corrected pairs.
    - **Acceptance criteria**:
      - [x] All corrected color pairs documented for both dark and light mode
      - [x] No values in the spec reference the old identical-lightness pairings
    - **Dependencies**: None
