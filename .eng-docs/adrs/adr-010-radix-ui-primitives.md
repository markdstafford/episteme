---
created: 2026-03-12
last_updated: 2026-03-12
status: accepted
decided_by: markdstafford
superseded_by: null
---

# ADR 010: Radix UI primitives for accessible overlay components

## Status

Accepted

## Context

Episteme's design system requires accessible primitives for overlay components: dialogs, context menus, popovers, dropdowns, tooltips, and selects. These components share a set of hard-to-implement requirements: focus trapping, keyboard navigation, screen reader announcements, ARIA attribute management, and correct portal behavior (rendering outside the normal DOM tree to avoid z-index and overflow issues).

The design system was established with a strong requirement that all visual styling come from design tokens — no pre-packaged visual defaults. Any component library chosen must support this: it must be headless or fully overridable, and must not ship visual opinions that conflict with the custom design language.

Three options were evaluated:

**Option A: Radix UI primitives directly** — use `@radix-ui/*` packages directly for accessible primitives, apply all styling from scratch using design tokens.

**Option B: shadcn/ui with full visual override** — generate shadcn components into `src/components/ui/`, replace all visual styling with design tokens. Keeps Radix under the hood but ships with default styles that must be stripped.

**Option C: Build from scratch** — implement all primitives including accessibility handling without a library. Maximum control, highest effort, accessibility risk.

## Decision

We will use Radix UI primitives directly (Option A).

Radix UI is the dominant accessible primitive library in the React/TypeScript ecosystem — it is the foundation that shadcn/ui is built on, and individual packages receive tens of millions of weekly npm downloads. It provides exactly the accessibility behaviors required (focus trapping, keyboard navigation, ARIA) without any visual styling, which is the right fit for a design system that specifies every visual property from scratch.

Going directly to Radix avoids the overhead of fighting shadcn's generated styles. The design system's density and visual language would require overriding essentially all of shadcn's defaults; stripping them adds friction with no benefit.

Option C (from scratch) carries unacceptable accessibility risk. Focus management, keyboard navigation, and screen reader behavior are well-solved problems. There is no reason to re-implement them.

## Consequences

**Positive:**
- No visual defaults to fight — all styling comes from design tokens
- Full accessibility behaviors (focus trap, keyboard nav, ARIA) provided out of the box
- Widely adopted, well-documented, actively maintained
- Each primitive is a separate package (`@radix-ui/react-dialog`, etc.) — only install what is used
- Works seamlessly with Tailwind v4 and the CSS custom property token layer

**Negative:**
- Radix's component API has more surface area than shadcn wrappers — engineers need to read Radix docs directly when building new primitives
- No pre-built visual starting point; every primitive must be styled from scratch (this is intentional but requires discipline)

## Packages in use

| Package | Used for |
|---|---|
| `@radix-ui/react-dialog` | Modal dialogs |
| `@radix-ui/react-context-menu` | Right-click context menus |
| `@radix-ui/react-popover` | Popovers |
| `@radix-ui/react-dropdown-menu` | Dropdown menus |

Additional packages (`@radix-ui/react-tooltip`, `@radix-ui/react-select`) to be added when those primitives are implemented.
