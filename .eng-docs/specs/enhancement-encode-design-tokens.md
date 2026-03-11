---
created: 2026-03-10
last_updated: 2026-03-10
status: complete
issue: 31
specced_by: markdstafford
implemented_by: markdstafford
superseded_by: null
---

# Enhancement: Encode design tokens

## Parent feature

`feature-design-system.md`

## What

Encodes all design tokens defined in `design-system.md` into Tailwind v4's `@theme {}` block in `src/app.css`, making every token available as a CSS custom property throughout the application. This is the implementation step that follows the specification step — `design-system.md` defines what the tokens are; this enhancement makes them real in the codebase.

## Why

`design-system.md` is the source of truth for every visual decision in the app, but it has no effect on the UI until its values are encoded as CSS custom properties that components can reference. This enhancement closes that gap. It is also the prerequisite for the kitchen sink preview and all component migration enhancements — nothing can be migrated to the design system until the token layer exists.

## User stories

- Eric can reference any design token by its semantic name (e.g., `--color-bg-elevated`, `--font-size-ui-base`) in any component without defining the value inline
- Eric can be confident that changing a token value in `app.css` propagates consistently across the entire app
- Eric implementing a new component can write styles using only token names, with no raw color, spacing, or size values

## Design changes

None — this enhancement is a code-only change. All design decisions are specified in `design-system.md`.

## Technical changes

### Affected files

- `src/app.css` — add `@theme {}` block encoding all tokens from `design-system.md`

### Changes

Add a `@theme {}` block to `src/app.css` immediately after the Tailwind import. The block should define one CSS custom property per token, organized by category matching `design-system.md`:

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";

@theme {
  /* Colors — dark mode base (light mode via .light class or media query per theming spec) */
  /* Typography */
  /* Spacing */
  /* Border radius */
  /* Shadow / elevation */
  /* Motion */
}
```

Exact token names and values are taken directly from `design-system.md`. Do not invent token names — use the names as defined there.

## Task list

**1. Write `@theme {}` block**
- Read the Tailwind v4 encoding guide section in `design-system.md`
- Write the complete `@theme {}` block to `src/app.css` immediately after the existing `@import` and `@plugin` lines
- Include all mode-independent token categories: typography (font families, UI scale, document scale), spacing, control dimensions, padding, border radius, motion, accent colors, state colors, shadows
- Use exact token names and values from `design-system.md` — do not invent or modify any names

**2. Write `@layer base` color mode block**
- Add an `@layer base` block below `@theme {}`
- Define all `--color-bg-*`, `--color-text-*`, and `--color-border-*` tokens at `:root` using dark mode values as the default
- Add a `@media (prefers-color-scheme: light)` override block inside `@layer base` with light mode values for the same tokens

**3. Verify and commit**
- Run `npm run build` — confirm no new errors introduced by the CSS change
- Run `npm test` — confirm all tests pass
- Commit on a feature branch; open PR targeting main
