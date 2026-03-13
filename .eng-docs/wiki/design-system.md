---
created: 2026-03-04
last_updated: 2026-03-12
status: active
---

# Design System

Episteme's canonical design reference. Every color, spacing value, type size, radius, shadow, and motion token is defined here. Every core component pattern is fully specified. An engineer implementing a new component should be able to do so using only this document, with no follow-up questions.

**Color space**: All color tokens are defined in `oklch()`. Perceptually uniform — equal changes in lightness and chroma produce visually equal steps. Makes the theming phase straightforward.

**Token encoding**: Tokens are implemented as CSS custom properties in a Tailwind v4 `@theme {}` block in `src/app.css`. See the [Tailwind v4 encoding guide](#tailwind-v4-encoding-guide) section.

**Mode default**: System preference (`prefers-color-scheme`) determines which mode is active. Both modes are fully specified with equal weight.

**Component library**: Radix UI primitives (`@radix-ui/*`) for accessible primitives (dialog, popover, dropdown-menu, context-menu, tooltip, select). No shadcn. All visual styling is applied from scratch using design tokens.

**Icon library**: Lucide React. Standard UI: 16px. Inline with text: 14px.

---

## Token reference

### Typography

#### Font families

| Token | Value |
|---|---|
| `--font-ui` | `"Inter Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` |
| `--font-mono` | `"JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace` |

Inter Variable is the variable font version of Inter — use this specifically, not static Inter. It covers the full weight range (100–900) and replaces Inter Display for headings; no separate import is needed.

Document prose uses `--font-ui`. Code blocks use `--font-mono`.

#### UI type scale

Governs all chrome: sidebar, toolbar, buttons, inputs, menus, dialogs, labels.

| Token | Size | Weight | Line height | Usage |
|---|---|---|---|---|
| `--font-size-ui-xs` | 11px | 400 | 1.4 | Labels, badges, timestamps, keyboard shortcuts |
| `--font-size-ui-sm` | 12px | 400 | 1.4 | Secondary text, captions, helper text |
| `--font-size-ui-base` | 13px | 400 | 1.45 | Controls, buttons, inputs, menus, dialog content |
| `--font-size-ui-md` | 14px | 500 | 1.4 | Dialog titles, section headers, emphasized labels |
| `--font-size-ui-lg` | 16px | 400 | 1.4 | Sidebar nav items |

#### Document content scale

Governs rendered Markdown. Implementation deferred to the markdown rendering feature, but tokens are defined here as the single source of truth.

| Token | Size | Weight | Line height | Usage |
|---|---|---|---|---|
| `--font-size-doc-xs` | 12px | 400 | 1.6 | Captions, footnotes |
| `--font-size-doc-sm` | 14px | 400 | 1.65 | Small body, dense list items |
| `--font-size-doc-base` | 16px | 400 | 1.7 | Body text (primary reading size) |
| `--font-size-doc-h4` | 16px | 600 | 1.5 | H4 |
| `--font-size-doc-h3` | 18px | 600 | 1.45 | H3 |
| `--font-size-doc-h2` | 22px | 600 | 1.35 | H2 |
| `--font-size-doc-h1` | 28px | 700 | 1.25 | H1 |

Note: line heights in the document scale are intentional for long-form reading. They are easy to tune — each is a single token change. Adjust during the markdown rendering feature phase after seeing rendered output.

Document content max-width: `--doc-content-width: 680px`

---

### Color tokens

All tokens are defined for both dark and light modes. System preference selects the active set.

#### Dark mode

**Backgrounds**

| Token | oklch | Approx hex | Usage |
|---|---|---|---|
| `--color-bg-app` | `oklch(7% 0.01 264)` | `#090909` | Sidebar, outermost shell |
| `--color-bg-base` | `oklch(9.5% 0.012 264)` | `#101012` | Main content background |
| `--color-bg-subtle` | `oklch(12% 0.015 264)` | `#15161c` | Component-level background |
| `--color-bg-elevated` | `oklch(15% 0.018 264)` | `#191a22` | Cards, popovers, toolbar |
| `--color-bg-overlay` | `oklch(18.5% 0.02 264)` | `#222430` | Context menus, elevated surfaces |
| `--color-bg-hover` | `oklch(21% 0.022 264)` | `#272937` | Hover and active states |

Each level has a distinct semantic role. Do not collapse them — the visual hierarchy between levels is what communicates elevation in dark mode without shadows.

**Text**

| Token | oklch | Approx hex | Usage |
|---|---|---|---|
| `--color-text-primary` | `oklch(100% 0 0)` | `#ffffff` | Primary content |
| `--color-text-secondary` | `oklch(92% 0.008 264)` | `#e4e4ed` | Secondary content, labels |
| `--color-text-tertiary` | `oklch(65% 0.008 264)` | `#999aa1` | Placeholder, hints, icons (default) |
| `--color-text-quaternary` | `oklch(42% 0.008 264)` | `#5d5e65` | Timestamps, metadata, keyboard shortcuts |

**Borders**

| Token | oklch | Approx hex | Usage |
|---|---|---|---|
| `--color-border-subtle` | `oklch(16% 0.02 264)` | `#20222f` | Dividers, section separators |
| `--color-border-default` | `oklch(20% 0.022 264)` | `#292b38` | Component borders |
| `--color-border-strong` | `oklch(23% 0.022 264)` | `#313240` | Emphasized borders, focus-adjacent |

#### Light mode

**Backgrounds**

| Token | oklch | Approx hex | Usage |
|---|---|---|---|
| `--color-bg-app` | `oklch(95% 0.004 264)` | `#f5f5f5` | Sidebar |
| `--color-bg-base` | `oklch(99% 0.002 264)` | `#fcfcfc` | Main content background |
| `--color-bg-subtle` | `oklch(97% 0.003 264)` | `#f8f8f8` | Component-level background |
| `--color-bg-elevated` | `oklch(100% 0 0)` | `#ffffff` | Cards, popovers, toolbar |
| `--color-bg-overlay` | `oklch(98% 0.003 264)` | `#fafafa` | Context menus |
| `--color-bg-hover` | `oklch(93% 0.005 264)` | `#ececec` | Hover and active states |

**Text**

| Token | oklch | Approx hex | Usage |
|---|---|---|---|
| `--color-text-primary` | `oklch(18% 0.012 264)` | `#23252a` | Primary content |
| `--color-text-secondary` | `oklch(45% 0.01 264)` | `#6b6f7a` | Secondary content, labels |
| `--color-text-tertiary` | `oklch(62% 0.008 264)` | `#999aa1` | Placeholder, hints |
| `--color-text-quaternary` | `oklch(72% 0.006 264)` | `#b0b5c0` | Very subtle — timestamps, metadata |

**Borders**

| Token | oklch | Approx hex | Usage |
|---|---|---|---|
| `--color-border-subtle` | `oklch(88% 0.006 264)` | `#e0e0e0` | Dividers |
| `--color-border-default` | `oklch(84% 0.007 264)` | `#d5d5d8` | Component borders |
| `--color-border-strong` | `oklch(78% 0.008 264)` | `#c4c4cc` | Emphasized borders |

#### Accent

Horizon blue — the accent hue for Episteme. Open, forward-looking, aspirational. Used for focus rings, selected states, links, and primary button backgrounds.

| Token | oklch | Usage |
|---|---|---|
| `--color-accent` | `oklch(62% 0.175 230)` | Focus rings, selected states, links, primary button bg |
| `--color-accent-hover` | `oklch(66% 0.175 230)` | Accent hover state (lighter) |
| `--color-accent-subtle` (dark) | `oklch(24% 0.05 230)` | Badge background (dark mode) |
| `--color-accent-subtle` (light) | `oklch(95% 0.03 230)` | Badge background (light mode) |

#### State colors

> Note: Base state colors are mode-independent. The `-subtle` background tokens are mode-specific (dark: low lightness ~24%; light: high lightness ~95%) for WCAG AA badge contrast.

| Token | oklch | Usage |
|---|---|---|
| `--color-state-danger` | `oklch(58% 0.2 25)` | Destructive actions, errors |
| `--color-state-danger-subtle` (dark) | `oklch(24% 0.06 25)` | Danger badge background (dark mode) |
| `--color-state-danger-subtle` (light) | `oklch(95% 0.04 25)` | Danger badge background (light mode) |
| `--color-state-warning` | `oklch(72% 0.16 65)` | Warnings |
| `--color-state-warning-subtle` (dark) | `oklch(24% 0.06 65)` | Warning badge background (dark mode) |
| `--color-state-warning-subtle` (light) | `oklch(95% 0.04 65)` | Warning badge background (light mode) |
| `--color-state-success` | `oklch(65% 0.15 155)` | Success, confirmations |
| `--color-state-success-subtle` (dark) | `oklch(24% 0.06 155)` | Success badge background (dark mode) |
| `--color-state-success-subtle` (light) | `oklch(95% 0.04 155)` | Success badge background (light mode) |

---

### Spacing

Base unit: 4px. Named steps match Linear's confirmed spacer set. Gaps in the sequence (e.g. `--space-7`) are intentional — an overly granular scale is used inconsistently.

| Token | Value | Usage |
|---|---|---|
| `--space-1` | 4px | Icon padding, tight inline gaps |
| `--space-2` | 8px | Internal component padding (compact) |
| `--space-3` | 12px | Internal component padding (standard) |
| `--space-4` | 16px | Section gaps, standard list spacing |
| `--space-5` | 20px | Panel internal padding |
| `--space-6` | 24px | Section separation |
| `--space-8` | 32px | Large section gaps |
| `--space-10` | 40px | Layout-level separation |
| `--space-14` | 56px | Major layout gaps |
| `--space-20` | 80px | Hero-level spacing |
| `--space-32` | 128px | Maximum layout spacer |

#### Control dimensions

| Token | Value | Usage |
|---|---|---|
| `--height-control-sm` | 24px | Compact controls, inline badges |
| `--height-control-base` | 28px | Buttons, inputs, menu items (standard) |
| `--height-control-lg` | 32px | Larger inputs, prominent controls |
| `--height-nav-item` | 28px | Sidebar nav items |
| `--height-toolbar` | 39px | Toolbar |
| `--height-titlebar` | 40px | Title bar / traffic lights zone |
| `--width-sidebar` | 244px | Sidebar (fixed, not resizable) |
| `--doc-content-width` | 680px | Document reading column max-width |

#### Standard padding

| Token | Value | Usage |
|---|---|---|
| `--padding-control` | `0 12px` | Button and input horizontal padding |
| `--padding-sidebar-item` | `0 8px` | Sidebar nav item horizontal padding |
| `--padding-toolbar` | `0 12px` | Toolbar item padding |
| `--padding-panel` | `20px` | Panel and dialog content padding |
| `--padding-content` | `32px` | Document content area horizontal padding |

---

### Border radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 3px | Badges, tags, inline code |
| `--radius-base` | 4px | Buttons, inputs, all controls |
| `--radius-md` | 6px | Cards, sidebar items, tooltips |
| `--radius-lg` | 8px | Panels, popovers, context menus |
| `--radius-xl` | 12px | Dialogs, modals |
| `--radius-2xl` | 16px | Large containers, image previews |
| `--radius-full` | 9999px | Pills, circular avatars |

---

### Shadow and elevation

**Dark mode**: Elevation is communicated entirely through background color contrast — no `box-shadow`. Each `--color-bg-*` level exists to create this hierarchy. A context menu at `--color-bg-overlay` over content at `--color-bg-base` is elevated by contrast alone.

**Light mode**: Shadow supplements background contrast where the difference between levels is insufficient.

| Token | Value | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 2px oklch(0% 0 0 / 0.08)` | Subtle card lift |
| `--shadow-base` | `0 2px 8px oklch(0% 0 0 / 0.12)` | Popovers, context menus |
| `--shadow-lg` | `0 8px 24px oklch(0% 0 0 / 0.16)` | Dialogs, modals |

**Inset border utility**: `--shadow-inset-border: inset 0 0 0 1px` — pair with a border color token to render borders via box-shadow when `border` would affect layout. Useful for overlapping elements.

---

### Motion

Bias: fewer, faster transitions. A focused desktop tool should feel instant, not animated.

| Token | Value | Usage |
|---|---|---|
| `--duration-instant` | `0ms` | State changes that feel immediate (selection, checkbox) |
| `--duration-fast` | `100ms` | Hover states, small reveals, exits |
| `--duration-normal` | `150ms` | Panel transitions, dropdown opens, entrances |
| `--duration-slow` | `250ms` | Deliberate layout shifts |

| Token | Value | Usage |
|---|---|---|
| `--ease-default` | `cubic-bezier(0.16, 1, 0.3, 1)` | Most transitions — fast out, ease in |
| `--ease-linear` | `linear` | Progress indicators |

**Rule**: hover and active states use `--duration-fast`. Entering elements use `--duration-normal`. Exiting elements use `--duration-fast` — exits feel snappier than entrances. Nothing uses `--duration-slow` unless it is a deliberate layout transition (e.g. settings mode entry).

---

## Component patterns

### Window chrome

#### macOS title bar

Implemented via Tauri `titleBarStyle: "Overlay"`. Web content fills the full window including the title bar area. The system title bar background is removed; native traffic lights remain.

The title bar is a full-width strip rendered in `App.tsx` above all panels. It is 40px tall (`--height-titlebar`) and divided into three sections with a 1px `--color-border-subtle` bottom border.

**Three-section layout:**

- **Section 1 (sidebar)** — `width: var(--width-sidebar)`, `flexShrink: 0`. Left 70px is the traffic lights no-drag zone. Remaining space holds right-aligned icon buttons. Width automatically tracks the sidebar when `--width-sidebar` CSS variable is updated.
- **Section 2 (title)** — `flex: 1`. Centered icon + app name label. In future, will show current document/view title. Entire section is the drag region.
- **Section 3 (actions)** — fixed width, right-aligned global action buttons (Share, New Document).

**Tokens and styling:**
- **Height**: `--height-titlebar` (40px)
- **Background**: `--color-bg-app`
- **Bottom border**: `1px solid --color-border-subtle`
- **Drag region**: root element (`-webkit-app-region: drag`); all interactive controls override to `-webkit-app-region: no-drag`
- **Traffic lights no-drag zone**: left 70px of Section 1 (`-webkit-app-region: no-drag`)

#### Windows (Phase 2)

`decorations: false` removes the OS frame. Custom close/minimize/maximize buttons rendered in React, positioned top-right, calling Tauri's window management API. Platform detection via `navigator.userAgent` or Tauri's platform API determines which chrome renders.

---

### Sidebar

- **Width**: `--width-sidebar` (244px), fixed
- **Background**: `--color-bg-app`
- **Top zone**: none — TitleBar is rendered above the sidebar in `App.tsx`, not inside `Sidebar.tsx`
- **Border-right**: none — background contrast separates sidebar from content area

**Nav items**

- Height: `--height-nav-item` (28px)
- Padding: `--padding-sidebar-item` (0 8px)
- Font: `--font-size-ui-lg` (16px), weight 400
- Radius: `--radius-md` (6px)
- Default: text `--color-text-secondary`, background transparent
- Hover: text `--color-text-primary`, background `--color-bg-subtle`
- Selected/active: text `--color-text-primary`, background `--color-bg-hover`
- Transition: background `--duration-fast`

**Icons in nav items**

- Size: 16px
- Default: `--color-text-tertiary`
- Hover/selected: `--color-text-secondary`
- Gap between icon and label: `--space-2` (8px)

**Section headers**

- Font: `--font-size-ui-xs` (11px), weight 500, uppercase, letter-spacing 0.06em
- Color: `--color-text-quaternary`
- Padding-top: `--space-4` (16px)
- Not interactive

**Separators**

- 1px `--color-border-subtle`
- Vertical margin: `--space-2` (8px)

**Folder expand/collapse**

- Chevron icon 12px, `--color-text-tertiary`, rotates 90deg when expanded
- Transition: `--duration-fast`, `--ease-default`
- Child items indented `--space-4` (16px) from parent

---

### Toolbar

- **Height**: `--height-toolbar` (39px)
- **Background**: `--color-bg-elevated`
- **Border-bottom**: 1px `--color-border-subtle`
- **Padding**: `--padding-toolbar` (0 12px)
- **Layout**: left group (mode-aware formatting tools) + right group (document actions), separated by flex spacer

**Toolbar buttons**

- Height: `--height-control-sm` (24px)
- Padding: `0 8px`
- Font: `--font-size-ui-base` (13px)
- Radius: `--radius-base` (4px)
- Default: text `--color-text-tertiary`, background transparent
- Hover: text `--color-text-secondary`, background `--color-bg-hover`
- Active/pressed: text `--color-text-primary`, background `--color-bg-overlay`

**Mode awareness**

Formatting tools (bold, italic, heading, etc.) are only rendered when document mode is `edit`. They are not hidden with `visibility: hidden` — they are not present in the DOM in other modes.

**Separators**

- 1px `--color-border-subtle`, height 16px (not full toolbar height)
- Horizontal margin: `--space-2` (8px)

---

### Buttons

All buttons share these base properties:

- Height: `--height-control-base` (28px)
- Padding: `--padding-control` (0 12px)
- Font: `--font-size-ui-base` (13px), weight 400
- Radius: `--radius-base` (4px)
- Transition: background and color `--duration-fast`
- Focus ring: `outline: 2px solid var(--color-accent)`, `outline-offset: 2px`
- Disabled: `opacity: 0.4`, `cursor: not-allowed`, no hover effect

**Variants**

| Variant | Default bg | Hover bg | Text | Border |
|---|---|---|---|---|
| Primary | `--color-accent` | `--color-accent-hover` | white | none |
| Secondary | `--color-bg-elevated` | `--color-bg-hover` | `--color-text-primary` | 1px `--color-border-default` |
| Ghost | transparent | `--color-bg-subtle` | `--color-text-secondary` | none |
| Destructive | `--color-state-danger` | `oklch(62% 0.2 25)` | white | none |

**Icon + label layout**

- Icon size: 14px
- Gap: `--space-2` (8px)
- Icon-only buttons: 28px × 28px, centered icon, ARIA label required

---

### Inputs

- **Height**: `--height-control-base` (28px)
- **Padding**: `0 10px`
- **Font**: `--font-size-ui-base` (13px), `--color-text-primary`
- **Background**: `--color-bg-subtle`
- **Border**: 1px `--color-border-default`
- **Radius**: `--radius-base` (4px)
- **Placeholder**: `--color-text-tertiary`
- **Transition**: border-color and box-shadow `--duration-fast`

**States**

| State | Border | Shadow |
|---|---|---|
| Default | `--color-border-default` | none |
| Hover | `--color-border-strong` | none |
| Focus | `--color-accent` | `0 0 0 2px var(--color-accent-subtle)` |
| Error | `--color-state-danger` | `0 0 0 2px var(--color-state-danger-subtle)` |
| Disabled | `--color-border-subtle` | none — also `opacity: 0.4` |

---

### Dialogs and modals

All dialogs are in-app. No separate OS windows.

**Backdrop**

- Color: `oklch(0% 0 0 / 0.5)`
- Backdrop-filter: `blur(4px)`
- Enter: fade from 0 → 1, `--duration-normal`. Exit: fade to 0, `--duration-fast`

**Container**

- Background: `--color-bg-elevated`
- Radius: `--radius-xl` (12px)
- Shadow: `--shadow-lg` (both modes — dialogs are prominent enough to warrant shadow even in dark mode)
- Default width: 480px. Wide variant: 640px
- Enter: fade + scale from `0.97` → `1.0`, `--duration-normal`, `--ease-default`. Exit: reverse at `--duration-fast`

**Header**

- Padding: `--padding-panel` (20px)
- Border-bottom: 1px `--color-border-subtle`
- Title font: `--font-size-ui-md` (14px), weight 600, `--color-text-primary`
- Close button: ghost icon-only button, top-right of header, X icon 16px

**Body**

- Padding: `--padding-panel` (20px)
- Font: `--font-size-ui-base` (13px), `--color-text-secondary`

**Footer**

- Padding: `--space-4` (16px) all sides
- Border-top: 1px `--color-border-subtle`
- Layout: right-aligned buttons, `--space-2` (8px) gap

---

### Context menus and popovers

- **Background**: `--color-bg-overlay`
- **Border**: 1px `--color-border-subtle`
- **Radius**: `--radius-lg` (8px)
- **Shadow**: `--shadow-base` in light mode; no shadow in dark mode (background contrast handles elevation)
- **Min-width**: 180px. **Max-width**: 280px
- **Padding**: `--space-1` (4px) vertical (top and bottom of menu container)

**Menu items**

- Height: `--height-control-base` (28px)
- Padding: `0 8px`
- Font: `--font-size-ui-base` (13px), `--color-text-secondary`
- Radius: `--radius-md` (6px) — applied to item, inside container padding
- Hover: background `--color-bg-hover`, text `--color-text-primary`
- Destructive item: text `--color-state-danger`
- Disabled item: `opacity: 0.4`, no hover

**Keyboard shortcut labels**

- Right-aligned within the item row
- Font: `--font-size-ui-xs` (11px), `--color-text-quaternary`
- Gap from label: auto (flex spacer)

**Separators**

- 1px `--color-border-subtle`
- Vertical margin: `--space-1` (4px)
- Full-width (no horizontal inset)

**Section labels**

- Font: `--font-size-ui-xs` (11px), weight 500, uppercase, `--color-text-quaternary`
- Padding: `--space-2` (8px) horizontal, `--space-1` (4px) vertical
- Not interactive

**Nested menu indicator**

- Chevron icon 12px, `--color-text-tertiary`, right-aligned
- Submenu opens on hover, `--duration-fast`

---

### Badges and tags

- **Height**: `--height-control-sm` (24px)
- **Padding**: `0 8px`
- **Font**: `--font-size-ui-xs` (11px), weight 500
- **Radius**: `--radius-sm` (3px)

**Variants:**

| Variant | Mode | Background | Text |
|---|---|---|---|
| Neutral | both | `--color-bg-hover` | `--color-text-secondary` |
| Accent | dark | `oklch(24% 0.05 230)` (`--color-accent-subtle`) | `oklch(74% 0.175 230)` (`--color-badge-accent-text`) |
| Accent | light | `oklch(95% 0.03 230)` (`--color-accent-subtle`) | `oklch(42% 0.175 230)` (`--color-badge-accent-text`) |
| Danger | dark | `oklch(24% 0.06 25)` (`--color-state-danger-subtle`) | `oklch(75% 0.22 25)` (`--color-badge-danger-text`) |
| Danger | light | `oklch(95% 0.04 25)` (`--color-state-danger-subtle`) | `oklch(42% 0.22 25)` (`--color-badge-danger-text`) |
| Warning | dark | `oklch(24% 0.06 65)` (`--color-state-warning-subtle`) | `oklch(82% 0.18 65)` (`--color-badge-warning-text`) |
| Warning | light | `oklch(95% 0.04 65)` (`--color-state-warning-subtle`) | `oklch(42% 0.18 65)` (`--color-badge-warning-text`) |
| Success | dark | `oklch(24% 0.06 155)` (`--color-state-success-subtle`) | `oklch(76% 0.16 155)` (`--color-badge-success-text`) |
| Success | light | `oklch(95% 0.04 155)` (`--color-state-success-subtle`) | `oklch(40% 0.16 155)` (`--color-badge-success-text`) |

---

### Frontmatter bar

Displays document frontmatter key/value pairs above the document content area.

- **Background**: `--color-bg-subtle`
- **Border-bottom**: 1px `--color-border-subtle`
- **Padding**: `--space-3` (12px) vertical, `--padding-content` (32px) horizontal — aligns with document content column
- **Layout**: horizontal row of key/value pairs, `--space-6` (24px) gap between pairs

**Key**

- Font: `--font-size-ui-sm` (12px), weight 500, uppercase, letter-spacing 0.06em
- Color: `--color-text-tertiary`

**Value**

- Font: `--font-size-ui-base` (13px)
- Color: `--color-text-secondary`
- Max-width: 200px per value; overflow truncated with ellipsis

**Overflow**

When pairs exceed available width, remaining pairs are hidden and replaced with a neutral badge: `+N more`

---

### Settings and navigation

The settings pattern applies to all full-app navigation experiences, not just settings. When the app enters settings mode, both the sidebar and content area transform simultaneously.

**Entering settings mode**

- Transition: cross-fade, `--duration-slow` (250ms), `--ease-default` — deliberate, feels like navigation
- Sidebar content is replaced by settings navigation categories
- Content area is replaced by the settings panel for the active category
- No backdrop, no scale effect — this is navigation, not a modal

**Settings sidebar**

- Same dimensions and background as main sidebar (`--color-bg-app`, `--width-sidebar`)
- "← Back" link at top:
  - Font: `--font-size-ui-base` (13px), `--color-text-tertiary`
  - Hover: `--color-text-primary`
  - Below it: `--space-4` (16px) gap, then 1px `--color-border-subtle` separator
- Category items: same dimensions as main sidebar nav items (`--height-nav-item`, `--font-size-ui-lg`)
- Selected category: background `--color-bg-hover`, text `--color-text-primary`

**Settings content area**

- Background: `--color-bg-base` — same as main content, no visual distinction
- Section headers: `--font-size-ui-md` (14px), weight 500, uppercase, letter-spacing 0.06em, `--color-text-tertiary`; `--space-4` (16px) bottom margin
- Form rows: `--height-control-base` (28px) controls, `--space-5` (20px) gap between rows
- Content padding: `--padding-content` (32px) horizontal, `--space-6` (24px) top

**Exiting settings mode**

- Same cross-fade transition in reverse
- Sidebar and content area return to their previous state (same document open, same scroll position)

---

## Tailwind v4 encoding guide

All tokens are defined as CSS custom properties in a `@theme {}` block in `src/app.css`. Tailwind v4 reads this block and generates utility classes automatically.

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";

@theme {
  /* Typography */
  --font-ui: "Inter Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: "JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;

  /* UI type scale */
  --font-size-ui-xs: 11px;
  --font-size-ui-sm: 12px;
  --font-size-ui-base: 13px;
  --font-size-ui-md: 14px;
  --font-size-ui-lg: 16px;

  /* Document type scale */
  --font-size-doc-xs: 12px;
  --font-size-doc-sm: 14px;
  --font-size-doc-base: 16px;
  --font-size-doc-h4: 16px;
  --font-size-doc-h3: 18px;
  --font-size-doc-h2: 22px;
  --font-size-doc-h1: 28px;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-14: 56px;
  --space-20: 80px;
  --space-32: 128px;

  /* Control dimensions */
  --height-control-sm: 24px;
  --height-control-base: 28px;
  --height-control-lg: 32px;
  --height-nav-item: 28px;
  --height-toolbar: 39px;
  --height-titlebar: 52px;
  --width-sidebar: 244px;
  --doc-content-width: 680px;

  /* Padding */
  --padding-control: 0 12px;
  --padding-sidebar-item: 0 8px;
  --padding-toolbar: 0 12px;
  --padding-panel: 20px;
  --padding-content: 32px;

  /* Border radius */
  --radius-sm: 3px;
  --radius-base: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-2xl: 16px;
  --radius-full: 9999px;

  /* Motion */
  --duration-instant: 0ms;
  --duration-fast: 100ms;
  --duration-normal: 150ms;
  --duration-slow: 250ms;
  --ease-default: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-linear: linear;

  /* Accent (mode-independent) */
  --color-accent: oklch(62% 0.175 230);
  --color-accent-hover: oklch(66% 0.175 230);

  /* State colors (mode-independent) */
  --color-state-danger: oklch(58% 0.2 25);
  --color-state-warning: oklch(72% 0.16 65);
  --color-state-success: oklch(65% 0.15 155);

  /* Shadows */
  --shadow-sm: 0 1px 2px oklch(0% 0 0 / 0.08);
  --shadow-base: 0 2px 8px oklch(0% 0 0 / 0.12);
  --shadow-lg: 0 8px 24px oklch(0% 0 0 / 0.16);
  --shadow-inset-border: inset 0 0 0 1px;
}

/* Dark mode tokens */
@layer base {
  :root {
    --color-bg-app: oklch(7% 0.01 264);
    --color-bg-base: oklch(9.5% 0.012 264);
    --color-bg-subtle: oklch(12% 0.015 264);
    --color-bg-elevated: oklch(15% 0.018 264);
    --color-bg-overlay: oklch(18.5% 0.02 264);
    --color-bg-hover: oklch(21% 0.022 264);

    --color-text-primary: oklch(100% 0 0);
    --color-text-secondary: oklch(92% 0.008 264);
    --color-text-tertiary: oklch(65% 0.008 264);
    --color-text-quaternary: oklch(42% 0.008 264);

    --color-border-subtle: oklch(16% 0.02 264);
    --color-border-default: oklch(20% 0.022 264);
    --color-border-strong: oklch(23% 0.022 264);

    --color-accent-subtle: oklch(24% 0.05 230);
    --color-state-danger-subtle: oklch(24% 0.06 25);
    --color-state-warning-subtle: oklch(24% 0.06 65);
    --color-state-success-subtle: oklch(24% 0.06 155);
  }

  @media (prefers-color-scheme: light) {
    :root {
      --color-bg-app: oklch(95% 0.004 264);
      --color-bg-base: oklch(99% 0.002 264);
      --color-bg-subtle: oklch(97% 0.003 264);
      --color-bg-elevated: oklch(100% 0 0);
      --color-bg-overlay: oklch(98% 0.003 264);
      --color-bg-hover: oklch(93% 0.005 264);

      --color-text-primary: oklch(18% 0.012 264);
      --color-text-secondary: oklch(45% 0.01 264);
      --color-text-tertiary: oklch(62% 0.008 264);
      --color-text-quaternary: oklch(72% 0.006 264);

      --color-border-subtle: oklch(88% 0.006 264);
      --color-border-default: oklch(84% 0.007 264);
      --color-border-strong: oklch(78% 0.008 264);

      --color-accent-subtle: oklch(95% 0.03 230);
      --color-state-danger-subtle: oklch(95% 0.04 25);
      --color-state-warning-subtle: oklch(95% 0.04 65);
      --color-state-success-subtle: oklch(95% 0.04 155);
    }
  }
}
```

**Notes on the encoding:**

- Tokens that don't vary by color mode (spacing, radius, motion, accent base colors, state base colors, shadows) go in `@theme {}` and become Tailwind utility classes automatically
- Tokens that vary by mode (all `--color-bg-*`, `--color-text-*`, `--color-border-*`, and mode-dependent tokens like `-subtle` badge backgrounds) go in `@layer base` with a `prefers-color-scheme` media query override
- The default (`:root` without media query) is dark mode — consistent with having the most thoroughly validated values from our reference research
- When theming is added in a future phase, a `data-theme` attribute override replaces the `prefers-color-scheme` media query

---

## Follow-on enhancements

The following enhancements implement this design system. They are planned as separate specs in rough implementation order:

1. **`enhancement-encode-design-tokens.md`** — implements the `@theme {}` block in `src/app.css` exactly as specified in the Tailwind v4 encoding guide above
2. **`enhancement-design-kitchen-sink.md`** — dev-only kitchen sink view; depends on token encoding being complete. This is the validation gate before component migration begins
3. **`enhancement-macos-title-bar.md`** — `tauri.conf.json` + `TitleBar.tsx`; implements the window chrome spec
4. **`enhancement-migrate-sidebar.md`**, **`enhancement-migrate-toolbar.md`**, **`enhancement-migrate-interactive-components.md`**, **`enhancement-migrate-overlays.md`**, **`enhancement-migrate-document-area.md`**, **`enhancement-migrate-ai-chat.md`** — per-area component migrations

Each enhancement spec references this document as the design authority.
