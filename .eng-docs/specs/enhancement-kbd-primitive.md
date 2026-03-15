---
created: 2026-03-12
last_updated: 2026-03-14
status: implementing
issue: 59
specced_by: markdstafford
implemented_by: markdstafford
superseded_by: null
---

# Enhancement: Kbd primitive

## Parent feature

`feature-design-system.md`

## What

The design system gains a `Kbd` primitive — a styled `<kbd>` semantic HTML element for rendering keyboard shortcut hints and numeric sequence indicators inline with UI text. The primitive renders as a small, subtly recessed chip: `--color-bg-hover` background, `--color-border-default` border, `--font-size-ui-xs` text, `--radius-sm` corners, and tight padding (`2px 5px`). It is visually distinct from `Badge` — flatter, smaller padding, no height token — and uses the semantic `<kbd>` element to communicate meaning to assistive technologies. The existing hardcoded shortcut hints in `CreateNewDialog` are migrated to use it, and the DesignKitchen gains a Kbd showcase in its Components section.

## Why

Keyboard shortcut hints are a recurring pattern in Episteme's UI — currently rendered as hardcoded `<span>` elements with inline styles wherever they appear. Without a primitive, these accumulate as one-off implementations that drift visually from each other and carry no semantic meaning for assistive technologies. The `<kbd>` HTML element has a defined role: it represents user input, specifically keyboard input, and screen readers can surface that meaning. Formalizing it as a primitive ensures consistent appearance across all call sites, makes the intent legible in the JSX, and closes the accessibility gap that hardcoded spans leave open.

## User stories

- Eric can render a keyboard shortcut hint by writing `<Kbd>1</Kbd>` rather than an inline-styled span
- Eric can add a new call site for a keyboard hint without making any visual decisions
- A screen reader user hears shortcut indicators announced as keyboard input rather than as unlabeled text
- Eric can find a live example of `Kbd` in the DesignKitchen to validate its appearance without opening the app's primary UI

## Design changes

Delta on the design system's component patterns (Badges and tags section):

**KbdShortcut**

A single public component that renders one or more keys as a keyboard shortcut.

| Property | Value |
|---|---|
| Element | Outer `<kbd>` (key combination) wrapping inner `<kbd>` per key |
| Background | `--color-bg-hover` |
| Border | `1px solid var(--color-border-default)` |
| Border radius | `--radius-sm` (3px) |
| Font size | `--font-size-ui-xs` (11px) |
| Font weight | 500 |
| Padding (per key chip) | `2px 5px` |
| Display | `inline-flex`, `align-items: center` |
| Separator | `+` as plain text between key chips (default; prop-configurable) |

**Distinction from Badge:** No fixed height token, has a visible border (Badge does not), tighter padding. The border provides the subtle keycap/recessed appearance that distinguishes it from a status badge.

**Internal structure:** A non-exported `Kbd` sub-component renders each individual key chip. `KbdShortcut` maps over the `keys` array and renders one `Kbd` per key with separators between them. Single-key usage (`keys={["1"]}`) renders a single chip with no separator.

**API:**
```tsx
// Single key (sequence indicator)
<KbdShortcut keys={["1"]} />

// Multi-key shortcut
<KbdShortcut keys={["⌘", ","]} />

// User-assignable shortcut from store
<KbdShortcut keys={shortcut.keys} />
```

**DesignKitchen:** A KbdShortcut row is added to the Components section showing: single key (`1`), single letter (`K`), and a multi-key combo (`⌘` + `,`).

## Technical changes

### Affected files

*(Populated during tech specs stage — list files that will change and why)*

### Changes

*(Added by tech specs stage — frame as delta on the parent feature's tech spec)*

## Task list

- [x] **Story: KbdShortcut primitive**
  - [x] **Task: Implement `Kbd` and `KbdShortcut` components**
    - **Description**: Create `src/components/ui/Kbd.tsx`. Implement a non-exported `Kbd` sub-component that renders a single `<kbd>` key chip using design tokens (background `--color-bg-hover`, border `1px solid var(--color-border-default)`, `--radius-sm`, `--font-size-ui-xs`, weight 500, padding `2px 5px`, `inline-flex`). Implement and export `KbdShortcut` which accepts `keys: string[]` and optional `separator?: string` (default `"+"`). It renders an outer `<kbd>` containing one `Kbd` per key with the separator as plain text between them. Single-key arrays render one chip with no separator.
    - **Acceptance criteria**:
      - [x] `KbdShortcut` is the only export from `Kbd.tsx`
      - [x] Single key: `<KbdShortcut keys={["1"]} />` renders one chip, no separator
      - [x] Multi-key: `<KbdShortcut keys={["⌘", ","]} />` renders two chips with `+` between
      - [x] Custom separator: `<KbdShortcut keys={["⌘", ","]} separator="-" />` renders with `-`
      - [x] All visual properties reference design tokens — no hardcoded values
    - **Dependencies**: None
  - [x] **Task: Write unit tests for `KbdShortcut`**
    - **Description**: Create `tests/unit/components/Kbd.test.tsx`. Cover: single-key rendering, multi-key rendering and separator count, custom separator prop, correct use of outer and inner `<kbd>` elements.
    - **Acceptance criteria**:
      - [x] Single key renders one `<kbd>` chip, no separator rendered
      - [x] Two keys render two chips and one `+` separator
      - [x] Three keys render three chips and two separators
      - [x] Custom separator prop is used instead of default
      - [x] Outer element is `<kbd>`, inner key chips are `<kbd>`
      - [x] All tests pass
    - **Dependencies**: Task: Implement `Kbd` and `KbdShortcut` components

- [ ] **Story: Migrate call sites**
  - [x] **Task: Migrate `CreateNewDialog` shortcut indicators to `<KbdShortcut>`**
    - **Description**: In `src/components/CreateNewDialog.tsx`, replace the hardcoded `<span>` shortcut indicator (lines ~215–226) with `<KbdShortcut keys={[String(i + 1)]} />`. Remove the inline style block it replaces.
    - **Acceptance criteria**:
      - [x] No inline-styled shortcut spans remain in `CreateNewDialog.tsx`
      - [x] Visual output is unchanged
      - [x] Existing `CreateNewDialog` tests pass
    - **Dependencies**: Task: Implement `Kbd` and `KbdShortcut` components
  - [ ] **Task: Add `KbdShortcut` showcase to DesignKitchen**
    - **Description**: In `src/components/DesignKitchen.tsx`, add a KbdShortcut row to the Components section (after Inputs, before Badges). Show three examples with labels: single digit `["1"]`, single letter `["K"]`, and multi-key `["⌘", ","]`.
    - **Acceptance criteria**:
      - [ ] Three labeled examples render correctly in the kitchen sink
      - [ ] Examples use `<KbdShortcut>`, no inline styles
    - **Dependencies**: Task: Implement `Kbd` and `KbdShortcut` components

- [ ] **Story: Documentation**
  - [ ] **Task: Add `KbdShortcut` to `design-system.md`**
    - **Description**: Add a KbdShortcut entry to the component patterns section of `.eng-docs/wiki/design-system.md`. Document: element structure, all visual token values, API (`keys`, `separator` props), distinction from Badge, and example usage.
    - **Acceptance criteria**:
      - [ ] KbdShortcut section present in design-system.md
      - [ ] All visual properties documented with token references
      - [ ] API props documented
      - [ ] Distinction from Badge noted
    - **Dependencies**: Task: Implement `Kbd` and `KbdShortcut` components
