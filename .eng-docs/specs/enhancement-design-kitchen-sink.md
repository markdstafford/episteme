# Enhancement: Design kitchen sink

## Parent feature

`feature-design-system.md`

## What

Adds a dev-only kitchen sink view to the application that renders all design tokens and core component variants in a single scrollable page. The view is accessible in the Tauri dev build and is excluded from production. It serves as the visual validation tool for the design system — allowing review and sign-off of the actual rendered output before component migration begins.

## Why

`design-system.md` defines the design system on paper, and `app.css` encodes the tokens in code, but neither answers the question "does this actually look right?" The kitchen sink view provides that answer. It lets the user see every color swatch, type size, component variant, and interaction state rendered in the real app with real CSS — not in a mockup or a browser tab, but in the Tauri desktop build. Sign-off on the kitchen sink is the gate before component migration work begins.

## User stories

- The user can open the kitchen sink view in the dev build and see all color tokens rendered as labeled swatches in both dark and light modes
- The user can review the complete type scale, spacing scale, and all component variants in one place
- The user can identify any token value or component pattern that looks wrong and request a correction before it propagates to real components
- Eric can use the kitchen sink as a reference while implementing new components

## Design changes

The kitchen sink is a dev tool, not a user-facing feature. Its layout and organization should be functional and clear but does not need to follow the design system itself — it exists to display the design system. Structure:

- Sections matching `design-system.md` categories: Colors, Typography, Spacing, Border Radius, Shadows, Motion, Components
- Each section renders the relevant tokens or variants with their names and values labeled
- Component section includes: all button variants and states, input states, badge/tag variants, a sample sidebar (static), a sample dialog trigger, a sample context menu trigger

## Technical changes

### Affected files

- `src/components/DesignKitchen.tsx` — new component; the kitchen sink view
- `src/App.tsx` — add a dev-only keyboard shortcut (e.g., Cmd+Shift+K) to open the kitchen sink view, guarded by `import.meta.env.DEV`

### Changes

`DesignKitchen.tsx` is a single React component that renders all sections. It is excluded from production builds via:

```tsx
// In App.tsx
if (import.meta.env.DEV) {
  // register keyboard shortcut to render <DesignKitchen />
}
```

The component renders static examples — no interactivity beyond triggering states for demonstration (e.g., a button to show a dialog variant).

## Task list

### Story: App integration

#### Task: Register dev-only keyboard shortcut

- [x] Add `showKitchenSink` state and Cmd+Shift+K `useEffect` to `App.tsx`, guarded by `import.meta.env.DEV`
- [x] Create stub `DesignKitchen.tsx` and add conditional render in `App.tsx`; write and pass tests
- [x] Render DesignKitchen conditionally in App.tsx

### Story: Kitchen sink scaffold

- [x] Create DesignKitchen.tsx with section layout
