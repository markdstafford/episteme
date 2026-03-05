# ADR 004: Tailwind CSS styling

## Status

Accepted

## Context

Episteme's UI needs styling for:
- Document editor and markdown rendering (TipTap integration)
- AI chat panel and conversation UI
- Document list and file browser
- Settings panels and forms
- Comments and annotations
- Modal dialogs and overlays

We need an approach that:
- Works well with AI code generation
- Enables rapid UI development
- Produces performant output
- Scales as UI complexity grows
- Integrates well with React, Tauri, and TipTap

**TipTap styling is particularly important**: TipTap is headless and requires custom styling for the editor interface, formatting toolbar, and markdown rendering. The styling approach must make it easy to style TipTap's components and editor content.

Key constraints:
- Must work with React 18+, Tauri, and TipTap
- Should be straightforward for AI to generate correct styles
- Should handle both component-specific and shared styles
- Must support styling TipTap editor and custom extensions
- Performance matters for desktop app feel

## Decision

We will use Tailwind CSS for styling.

Tailwind is the clear industry standard for new React projects with 58M weekly downloads and exponential growth. Its utility-first approach enables rapid development and works exceptionally well with AI code generation. The framework integrates seamlessly with React, Tauri, and TipTap, has no runtime overhead, and produces small production bundles through unused class purging. For a desktop app prioritizing performance and development velocity, Tailwind is the optimal choice.

## Consequences

**Positive:**
- AI generates excellent Tailwind code (extensive training data)
- Rapid UI development with utility classes
- Small production bundle (tree-shaking removes unused classes)
- No runtime overhead (compiled to CSS)
- Consistent design system built-in (spacing, colors, typography)
- Extensive documentation and community examples
- Works well with TipTap styling patterns
- Industry standard with massive ecosystem

**Negative:**
- HTML can become cluttered with many class names
- Utility-first approach has a learning curve
- Additional build step and configuration
- Can be verbose for very complex component styles

## Alternatives considered

**Option 1: CSS-in-JS (styled-components)**

Write CSS directly in JavaScript/TypeScript with component-scoped styles. 9M weekly downloads, steady but declining relative share.

**Pros:**
- Dynamic styles based on props
- Full TypeScript integration
- Scoped styles automatically
- No separate CSS files
- Still has significant community

**Cons:**
- Runtime overhead (styles generated at runtime)
- Larger bundle size
- Performance concerns (style recalculation)
- More complex for AI to generate correctly
- Less suitable for Tauri desktop performance goals
- Declining relative to Tailwind

**Why not chosen:** Runtime overhead conflicts with desktop performance goals. Tailwind's compile-time approach produces faster, leaner applications with better AI code generation.

---

**Option 2: CSS Modules**

Scoped CSS files that work with standard CSS syntax. Minimal adoption (2,184 weekly downloads), effectively deprecated.

**Pros:**
- Standard CSS syntax (familiar)
- Scoped styles (no naming conflicts)
- No runtime overhead

**Cons:**
- More boilerplate (separate CSS files)
- Slower development than utility-first
- Minimal community adoption
- AI generates less idiomatic code than Tailwind
- Less guidance for consistent design system

**Why not chosen:** Minimal community adoption and slower development velocity. Tailwind's utility-first approach with 58M downloads is the clear industry direction.
