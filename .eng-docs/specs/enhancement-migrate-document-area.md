---
created: 2026-03-10
last_updated: 2026-03-12
status: approved
issue: 38
specced_by: markdstafford
implemented_by: null
superseded_by: null
---

# Enhancement: Migrate document area to design system

## Parent feature

`feature-design-system.md`

## What

Migrates the document viewer and frontmatter bar to use design system tokens. Implements the document area component patterns defined in `design-system.md`, including the document column width, content padding, and the frontmatter bar redesign. Note: document content typography (rendered Markdown) is governed by `--font-size-doc-*` tokens defined in the design system but fully implemented in the follow-on markdown rendering feature.

## Why

The document area is the primary working surface — where users spend the most time reading and writing. Migrating it to the design system gives the reading experience the correct background, padding, and frontmatter treatment, even before the full markdown rendering improvements ship.

## User stories

- Patricia opens a document and sees a calm, focused reading surface with the correct background color and content width
- Patricia sees the frontmatter bar redesigned to match the design system's component patterns
- Eric can reference the document area implementation as the canonical example of applying document-category tokens

## Design changes

Per `design-system.md` document area and frontmatter bar patterns:
- Document column width, horizontal padding, and background color as specified
- Frontmatter bar: key/value layout, typography, color, and truncation behavior as specified
- All color and spacing values replaced with semantic token references

## Technical changes

### Affected files

- `src/components/DocumentViewer.tsx` — apply design system tokens; implement document column layout
- `src/components/FrontmatterBar.tsx` — full visual redesign per design-system.md frontmatter bar pattern

### Changes

Replace hardcoded Tailwind classes with design system token references. Implement the exact document area layout (max-width, padding, background) from `design-system.md`. Redesign `FrontmatterBar.tsx` to match the specified component pattern — this may involve structural changes to the component, not just token substitution.

Document content typography (`--font-size-doc-*` tokens) should be applied to the prose container at this stage, even though the full markdown rendering improvements are deferred.

## Task list

- [ ] **Story: Migrate DocumentViewer layout**
  - [ ] **Task: Restructure document column layout and container background**
    - **Description**: Move `FrontmatterBar` outside the content column wrapper so it renders as a full-width strip above the document content. Replace `max-w-4xl mx-auto p-8` on the inner wrapper with `max-w-[--doc-content-width] mx-auto px-[--padding-content]`. Add `bg-[--color-bg-base]` to the outermost scrollable container (`flex-1 overflow-y-auto`).
    - **Acceptance criteria**:
      - [ ] `FrontmatterBar` is rendered as a sibling above the content column wrapper, not inside it
      - [ ] Content column uses `max-width: var(--doc-content-width)` (680px) and `padding-inline: var(--padding-content)` (32px)
      - [ ] Outermost container has `background: var(--color-bg-base)`
      - [ ] Layout is visually verified in both dark and light mode
    - **Dependencies**: None
  - [ ] **Task: Apply doc-scale typography tokens to prose container**
    - **Description**: Wrap `MarkdownRenderer` in a container div that applies the document content type scale as the base reading size. Set `font-size: var(--font-size-doc-base)` (16px) and `line-height: 1.7` on the wrapper, scoping doc-scale typography to the prose area without modifying `MarkdownRenderer.tsx` itself.
    - **Acceptance criteria**:
      - [ ] Prose container div has `font-size: var(--font-size-doc-base)` applied
      - [ ] Prose container has `line-height: 1.7` matching the `--font-size-doc-base` spec
      - [ ] `MarkdownRenderer.tsx` is not modified by this task
      - [ ] No hardcoded font-size values remain in the `DocumentViewer` prose area
    - **Dependencies**: Task: Restructure document column layout and container background
  - [ ] **Task: Update empty/loading/error states to design system tokens**
    - **Description**: Replace all hardcoded Tailwind color classes in the three fallback render paths with design system token references: `text-gray-400` → `text-[--color-text-tertiary]` (empty state), `text-blue-600` on the `Loader2` icon → `text-[--color-accent]` (loading state), `text-red-600` → `text-[--color-state-danger]` (error state).
    - **Acceptance criteria**:
      - [ ] Empty state paragraph uses `--color-text-tertiary`
      - [ ] Loading state `Loader2` icon uses `--color-accent`
      - [ ] Error state text uses `--color-state-danger`
      - [ ] No hardcoded `text-gray-*`, `text-blue-*`, or `text-red-*` classes remain in `DocumentViewer.tsx`
    - **Dependencies**: None

- [ ] **Story: Redesign FrontmatterBar**
  - [ ] **Task: Redesign container structure and layout tokens**
    - **Description**: Replace the current container (`bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-6 flex flex-wrap gap-x-0`) with a full-width strip matching the design system frontmatter bar pattern: `background: var(--color-bg-subtle)`, `border-bottom: 1px solid var(--color-border-subtle)`, `padding: var(--space-3) var(--padding-content)`, flex row with `gap: var(--space-6)`. Remove `rounded-lg`, `mb-6`, and all `dark:` variant classes.
    - **Acceptance criteria**:
      - [ ] Container background is `--color-bg-subtle`
      - [ ] Container has a 1px `--color-border-subtle` bottom border
      - [ ] Vertical padding is `--space-3` (12px), horizontal padding is `--padding-content` (32px)
      - [ ] Pairs are laid out in a horizontal flex row with `--space-6` (24px) gap
      - [ ] No `rounded-lg`, `mb-6`, `dark:` variant classes, or hardcoded gray values remain
    - **Dependencies**: Task: Restructure document column layout and container background
  - [ ] **Task: Apply key and value typography tokens with truncation**
    - **Description**: Apply design system typography to key and value spans within each pair. Keys: `font-size: var(--font-size-ui-sm)` (12px), `font-weight: 500`, `text-transform: uppercase`, `letter-spacing: 0.06em`, `color: var(--color-text-tertiary)`. Values: `font-size: var(--font-size-ui-base)` (13px), `color: var(--color-text-secondary)`, `max-width: 200px`, `overflow: hidden`, `text-overflow: ellipsis`, `white-space: nowrap`.
    - **Acceptance criteria**:
      - [ ] Keys render at 12px, weight 500, uppercase, letter-spacing 0.06em, `--color-text-tertiary`
      - [ ] Values render at 13px, `--color-text-secondary`
      - [ ] Values longer than 200px are truncated with an ellipsis
      - [ ] No hardcoded `text-xs`, `text-sm`, `text-gray-*`, or `dark:` variant classes remain in key/value spans
    - **Dependencies**: Task: Redesign container structure and layout tokens
  - [ ] **Task: Implement `+N more` overflow badge**
    - **Description**: Add a `ResizeObserver` on the container ref to detect when the total width of rendered pairs exceeds available container width. Calculate how many pairs fit; hide the rest and render a neutral badge at the end showing `+N more`. Badge uses the Neutral badge pattern from `design-system.md`: `background: var(--color-bg-hover)`, `color: var(--color-text-secondary)`, `font-size: var(--font-size-ui-xs)` (11px), `font-weight: 500`, `border-radius: var(--radius-sm)` (3px), `padding: 0 8px`, `height: var(--height-control-sm)` (24px).
    - **Acceptance criteria**:
      - [ ] When all pairs fit in the available width, no badge is shown
      - [ ] When pairs overflow, excess pairs are not rendered and a `+N more` badge appears
      - [ ] Badge count `N` accurately reflects the number of hidden pairs
      - [ ] Badge styling matches the Neutral badge pattern from `design-system.md`
      - [ ] Resizing the window dynamically recalculates visible pairs and updates the badge
    - **Dependencies**: Task: Apply key and value typography tokens with truncation
