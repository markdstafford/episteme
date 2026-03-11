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

*(To be completed after `design-system.md` is finalized and `enhancement-encode-design-tokens.md` is implemented.)*
