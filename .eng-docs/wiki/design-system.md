# Design System

This document defines reusable UI components, design tokens, and patterns for Episteme.

**Status**: Initial stub - to be populated as components are built

**Reference**: See app.md Design guidance section for foundational design decisions.

---

## Design Tokens

### Typography

**Font stacks**:
- **Sans-serif**: `-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif`
- **Monospace**: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`

**Type scale** (Tailwind classes):
- `text-4xl`: h1 headings
- `text-3xl`: h2 headings
- `text-2xl`: h3 headings
- `text-xl`: h4 headings
- `text-base`: Body text (16px)
- `text-sm`: Small text (14px)

### Colors

**Semantic colors** (using Tailwind palette):
- **Primary**: `blue-600` (light), `blue-500` (dark)
- **Background**: `white` / `gray-50` (light), `gray-900` / `gray-800` (dark)
- **Text**: `gray-900` / `gray-600` (light), `gray-100` / `gray-400` (dark)
- **Border**: `gray-200` (light), `gray-700` (dark)

### Spacing

**Layout spacing** (Tailwind classes):
- Sidebar width: `w-64` (256px)
- Content max width: `max-w-4xl` (896px)
- Panel padding: `p-6` (24px)
- Content padding: `p-8` (32px)

**Component spacing**:
- Tight: `space-y-2` (8px)
- Normal: `space-y-4` (16px)
- Comfortable: `space-y-6` (24px)
- Spacious: `space-y-8` (32px)

### Icons

**Library**: Lucide React

**Sizes**:
- Standard UI: `w-5 h-5` (20px)
- Inline with text: `w-4 h-4` (16px)

---

## Component Library

(To be populated as components are built)

### Buttons

**Primary Button**:
```tsx
<button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
  Primary Action
</button>
```

**Secondary Button**:
```tsx
<button className="bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-lg">
  Secondary Action
</button>
```

**Ghost Button**:
```tsx
<button className="hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg">
  Ghost Action
</button>
```

### Panels/Cards

```tsx
<div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6">
  {/* Panel content */}
</div>
```

### Other Components

(To be added as built: inputs, dropdowns, modals, etc.)

---

## Layout Patterns

(To be defined as we build features)

### Main Layout

- Sidebar (left)
- Content area (center)
- AI chat panel (right, optional)

---

## Accessibility Guidelines

- Maintain WCAG AA contrast standards (4.5:1 normal text, 3:1 large text)
- Always provide focus indicators: `focus-visible:ring-2 ring-blue-500`
- Use semantic HTML
- Provide ARIA labels for icon-only buttons
- Ensure keyboard navigation works for all interactive elements

---

## Notes

This document will be updated as we build components. New components and patterns should be added here to maintain consistency.
