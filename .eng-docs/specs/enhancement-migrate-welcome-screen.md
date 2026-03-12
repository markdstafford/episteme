---
created: 2026-03-10
last_updated: 2026-03-12
status: implementing
issue: 35
specced_by: markdstafford
implemented_by: markdstafford
superseded_by: null
---

# Enhancement: Migrate welcome screen to design system

## Parent feature

`feature-design-system.md`

## What

Removes the existing toolbar from `App.tsx` and migrates `WelcomeScreen.tsx` to use design system tokens. The toolbar (a thin strip between the title bar and document area containing only the AI chat toggle) is deleted entirely — the toggle will be replaced with a keyboard shortcut, and any persistent controls will eventually live in a footer. The welcome screen retains its current layout and behavior but drops all hardcoded Tailwind color classes in favor of semantic token references.

## Why

The toolbar currently holds a single button that will be replaced by a keyboard shortcut. Deleting it now removes dead UI surface and gives the document area the full vertical space. Migrating the welcome screen completes the design system token pass for all non-document surfaces visible before a workspace is opened.

## User stories

- Patricia opens the app and sees a welcome screen that matches the visual language of the rest of the app
- Patricia has the full window height available for the document area — no empty toolbar consuming vertical space

## Design changes

- Toolbar div removed from `App.tsx`; document area expands to fill the vacated height
- `WelcomeScreen.tsx`: replace `bg-gray-50 dark:bg-gray-900` with `var(--color-bg-app)`, `text-gray-900 dark:text-gray-100` with `var(--color-text-primary)`, `text-gray-600 dark:text-gray-400` with `var(--color-text-secondary)`, `bg-blue-600 hover:bg-blue-700` with the `Button` primitive (`variant="primary"`), and `text-red-600` with `var(--color-state-danger)`

## Technical changes

### Affected files

- `src/App.tsx` — delete toolbar div, `chatPanelOpen` state, `AiChatPanel` render, and associated imports
- `src/components/WelcomeScreen.tsx` — replace hardcoded Tailwind color classes with design token references; replace the open-folder button with the `Button` primitive

### Changes

In `App.tsx`: remove the toolbar `<div>` (the strip containing the AI chat toggle button), the `chatPanelOpen` useState declaration, the `AiChatPanel` conditional render, the `startAuthoring` store subscription, and the `MessageSquare` and `AiChatPanel` imports. Simplify `onStartAuthoring` on `TitleBar` to a no-op (`() => {}`). The `AiChatPanel` component, store, and Rust backend are left in place — only the App-level wiring is removed.

In `WelcomeScreen.tsx`: replace all hardcoded `gray-*`, `dark:*`, `blue-*`, and `red-*` Tailwind classes with inline style references to semantic tokens. Replace the `<button>` element with the `Button` primitive (`variant="primary"`).

## Task list

- [x] **Story: Remove toolbar and AI chat wiring from App.tsx**
  - [x] **Task: Delete toolbar div and AI chat panel wiring**
    - **Description**: In `src/App.tsx`, remove the following: (1) the toolbar `<div>` containing the `MessageSquare` toggle button; (2) the `const [chatPanelOpen, setChatPanelOpen] = useState(false)` declaration; (3) the `const startAuthoring = useAiChatStore(...)` subscription; (4) the `{!settingsOpen && chatPanelOpen && <AiChatPanel ... />}` conditional render; (5) the `AiChatPanel` and `MessageSquare` imports. Simplify the `onStartAuthoring` prop on all three `TitleBar` usages to `() => {}`. Do not delete `AiChatPanel.tsx`, `ChatMessage.tsx`, `stores/aiChat.ts`, or any Rust backend code — only the App-level wiring is removed here.
    - **Acceptance criteria**:
      - [x] No `chatPanelOpen` state or `setChatPanelOpen` calls remain in `App.tsx`
      - [x] No `AiChatPanel` import or render remains in `App.tsx`
      - [x] No `MessageSquare` import remains in `App.tsx`
      - [x] No `startAuthoring` subscription remains in `App.tsx`
      - [x] `onStartAuthoring` on all `TitleBar` usages is `() => {}`
      - [x] Document area fills the full height below the title bar — no empty toolbar strip
      - [x] All existing tests continue to pass
    - **Dependencies**: None

- [ ] **Story: Migrate WelcomeScreen to design tokens**
  - [ ] **Task: Replace hardcoded Tailwind classes with design token references**
    - **Description**: In `src/components/WelcomeScreen.tsx`, replace all hardcoded color classes with inline `style` props referencing CSS custom properties, following the same pattern used in `Button.tsx` and `Dialog.tsx`. Specific replacements: `bg-gray-50 dark:bg-gray-900` → `style={{ backgroundColor: "var(--color-bg-app)" }}`; `text-gray-900 dark:text-gray-100` on the `<h1>` → `style={{ color: "var(--color-text-primary)" }}`; `text-gray-600 dark:text-gray-400` on the subtitle → `style={{ color: "var(--color-text-secondary)" }}`; `text-red-600` on the error paragraph → `style={{ color: "var(--color-state-danger)" }}`. Replace the `<button>` element (with `bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-lg`) with the `Button` primitive (`variant="primary"`, `size="base"`) containing the `<FolderOpen>` icon and "Open Folder" label. Remove the `className` prop from the outer container and replace with an inline style for the background. No behavior changes — visual migration only.
    - **Acceptance criteria**:
      - [ ] No `gray-*`, `dark:*`, `blue-*`, or `red-*` Tailwind classes remain in the file
      - [ ] Background uses `var(--color-bg-app)`
      - [ ] Heading uses `var(--color-text-primary)`
      - [ ] Subtitle uses `var(--color-text-secondary)`
      - [ ] Error text uses `var(--color-state-danger)`
      - [ ] Open Folder button uses the `Button` primitive with `variant="primary"`
      - [ ] All existing `WelcomeScreen` tests continue to pass
    - **Dependencies**: None
