---
created: 2026-03-10
last_updated: 2026-03-20
status: approved
issue: 39
specced_by: markdstafford
implemented_by: null
superseded_by: null
doc_id: 8146159f-93c0-4d38-9fe3-9725ec4e75ad
---

# Enhancement: Migrate AI chat panel to design system

## Parent feature

`feature-design-system.md`

## What

Migrates the AI chat panel and chat message components to use design system tokens for all visual properties. Implements the panel component patterns defined in `design-system.md` for the chat surface — background, typography, message layout, input area, and the panel's relationship to the document area.

## Why

The AI chat panel is a primary collaborative surface in Episteme — users spend significant time interacting with it during authoring, review, and approval workflows. Bringing it into the design system ensures it reads as a native part of the application rather than a visually separate component bolted on.

## User stories

- Patricia opens the AI chat panel and sees it match the visual language of the sidebar and document area
- Patricia can read AI responses in the chat panel with the same typographic comfort as reading documents
- Eric implementing new chat features (message types, actions) has a consistent visual baseline to build on

## Design changes

Per `design-system.md` panel and component patterns:
- Chat panel background, border treatment, and width as specified
- Message typography using UI token category
- Input area using the standardized Input primitive from `enhancement-migrate-interactive-components.md`
- All color and spacing values replaced with semantic token references

## Technical changes

### Affected files

- `src/components/ChatMessage.tsx` — color tokens for user/assistant bubbles, typography, radius
- `src/components/ChatInputCard.tsx` — color tokens, focus ring pattern, send button radius
- `src/components/SessionHistoryView.tsx` — color tokens, typography, icon button sizing, mode badge, radius
- `src/components/ChatView.tsx` — color tokens, typography, icon button sizing, suggested prompt buttons, motion, radius *(added issue #94)*
- `src/components/ConfigurationView.tsx` — color tokens, input styling (height, border, focus ring), button radius *(added issue #94)*

**Not in scope:** `AiChatPanel.tsx` is a thin router with no visual properties. `ChatMinimap.tsx` does not exist. `ChatHistoryView.tsx` was superseded by `SessionHistoryView.tsx`.

### Changes

Replace all hardcoded Tailwind color, typography, spacing, and radius classes with design system token references. No behavior changes — visual migration only.

**Token mapping applied across all files:**

| Hardcoded | Token |
|---|---|
| `bg-white dark:bg-gray-900` | `bg-[--color-bg-base]` |
| `border-gray-200 dark:border-gray-700` | `border-[--color-border-default]` |
| `border-gray-100 dark:border-gray-800` | `border-[--color-border-subtle]` |
| `text-gray-900 dark:text-gray-100` | `text-[--color-text-primary]` |
| `text-gray-500 dark:text-gray-400` | `text-[--color-text-tertiary]` |
| `text-gray-400 dark:text-gray-500` | `text-[--color-text-quaternary]` |
| `hover:bg-gray-100 dark:hover:bg-gray-800` | `hover:bg-[--color-bg-hover]` |
| `bg-gray-100 dark:bg-gray-800` | `bg-[--color-bg-subtle]` |
| `bg-blue-600 hover:bg-blue-700 text-white` | `bg-[--color-accent] hover:bg-[--color-accent-hover] text-[--color-text-on-accent]` |
| `text-blue-600 dark:text-blue-400` | `text-[--color-accent]` |
| `text-red-600` | `text-[--color-state-danger]` |
| `rounded-lg` on buttons | `rounded-[--radius-base]` |
| `text-sm` on controls | `text-[--font-size-ui-base]` |
| `text-sm font-semibold` on headers | `text-[--font-size-ui-md] font-medium` |
| `text-xs` on secondary labels | `text-[--font-size-ui-sm]` |
| `transition-colors` | `transition-colors duration-[--duration-fast]` |

**Input focus pattern** (replacing `focus:ring-2 focus:ring-blue-500` / `focus-within:ring-2 focus-within:ring-blue-500`):
```
focus:border-[--color-accent] focus:shadow-[0_0_0_2px_color-mix(in_oklch,var(--color-accent)_25%,transparent)] focus:outline-none
```

**Icon-only button sizing:** `p-1` → `size-7 flex items-center justify-center` (28×28px per `--height-control-base`)

**Input sizing:** `py-2` → `py-1.5` to target `--height-control-base` (28px)

## Task list

- [ ] **Story: Migrate `ChatMessage`**
  - [ ] **Task: Apply design tokens to `ChatMessage.tsx`**
    - **Description**: Replace all hardcoded Tailwind classes with design system tokens. User bubble: `bg-[--color-accent] text-[--color-text-on-accent]`. Assistant bubble: `bg-[--color-bg-subtle] text-[--color-text-primary]`. Both bubbles: `rounded-[--radius-md]`. Text: `text-[--font-size-ui-base]`. No behavior changes.
    - **Acceptance criteria**:
      - [ ] User bubble uses `--color-accent` background and `--color-text-on-accent` text
      - [ ] Assistant bubble uses `--color-bg-subtle` background and `--color-text-primary` text
      - [ ] Both bubbles use `--radius-md` border radius
      - [ ] All existing tests pass
    - **Dependencies**: None

- [ ] **Story: Migrate `ChatInputCard`**
  - [ ] **Task: Apply design tokens to `ChatInputCard.tsx`**
    - **Description**: Replace hardcoded classes with tokens. Container border: `--color-border-default`. Container radius: `--radius-xl` (12px card). Focus ring: replace `focus-within:ring-2 focus-within:ring-blue-500` with the design system focus pattern on the container. Textarea text: `--color-text-primary`. Textarea placeholder: `--color-text-tertiary`. Divider: `--color-border-default`. Send button: `bg-[--color-accent] hover:bg-[--color-accent-hover] text-[--color-text-on-accent] rounded-[--radius-base]`. Textarea font: `text-[--font-size-ui-base]`.
    - **Acceptance criteria**:
      - [ ] Container border uses `--color-border-default`
      - [ ] Focus ring uses accent color with glow shadow
      - [ ] Textarea uses `--color-text-primary` and `--color-text-tertiary` for placeholder
      - [ ] Send button uses `--color-accent` and `--radius-base`
      - [ ] All existing tests pass
    - **Dependencies**: None

- [ ] **Story: Migrate `SessionHistoryView`**
  - [ ] **Task: Apply design tokens to `SessionHistoryView.tsx`**
    - **Description**: Replace hardcoded classes. Panel: `bg-[--color-bg-base] border-[--color-border-default]`. Header: same borders. Icon buttons (Back, Plus): `size-7 flex items-center justify-center hover:bg-[--color-bg-hover] rounded-[--radius-base]` with `text-[--color-text-tertiary]` icons. Header title: `text-[--font-size-ui-md] font-medium text-[--color-text-primary]`. Session rows: `hover:bg-[--color-bg-hover] border-[--color-border-subtle]`. Session name: `text-[--color-text-primary] text-[--font-size-ui-base]`. Mode badge: `bg-[--color-bg-hover] text-[--color-text-secondary] text-[--font-size-ui-xs] rounded-[--radius-sm]`. Timestamp: `text-[--color-text-quaternary] text-[--font-size-ui-xs]`. Empty state text: `text-[--color-text-tertiary] text-[--font-size-ui-base]`. "Start a conversation" button: secondary-style with `text-[--color-accent] border-[--color-border-default] rounded-[--radius-base] hover:bg-[--color-bg-hover]`.
    - **Acceptance criteria**:
      - [ ] Panel uses `--color-bg-base` and `--color-border-default`
      - [ ] Icon buttons are 28×28px and use `--color-bg-hover` on hover
      - [ ] Mode badge uses neutral badge token colors
      - [ ] Timestamp uses `--color-text-quaternary`
      - [ ] All existing tests pass
    - **Dependencies**: None

- [ ] **Story: Migrate `ChatView`**
  - [ ] **Task: Apply design tokens to `ChatView.tsx`**
    - **Description**: Replace hardcoded classes. Panel: `bg-[--color-bg-base] border-[--color-border-default]`. Header borders: same. MessageSquare icon: `text-[--color-text-tertiary]`. Header title: `text-[--font-size-ui-md] font-medium text-[--color-text-primary]`. Icon buttons (Clock, Plus): `size-7 flex items-center justify-center hover:bg-[--color-bg-hover] rounded-[--radius-base]` with `text-[--color-text-tertiary]` icons. Empty state text: `text-[--color-text-tertiary] text-[--font-size-ui-base]`. Suggested prompt buttons: `text-[--color-text-secondary] bg-[--color-bg-subtle] hover:bg-[--color-bg-hover] rounded-[--radius-base] transition-colors duration-[--duration-fast]`. Error: `text-[--color-state-danger]`. Streaming pulse: `bg-[--color-text-tertiary]`. Content divider: `border-[--color-border-default]`.
    - **Acceptance criteria**:
      - [ ] Panel uses `--color-bg-base` and `--color-border-default`
      - [ ] Icon buttons are 28×28px
      - [ ] Suggested prompt buttons use ghost-style token colors with `--radius-base`
      - [ ] Error text uses `--color-state-danger`
      - [ ] All existing tests pass
    - **Dependencies**: None

- [ ] **Story: Migrate `ConfigurationView`**
  - [ ] **Task: Apply design tokens to `ConfigurationView.tsx`**
    - **Description**: Replace hardcoded classes. Panel: `bg-[--color-bg-base] border-[--color-border-default]`. Header: same borders. Loading spinner: `text-[--color-text-tertiary]`. Section labels: `text-[--font-size-ui-md] font-medium text-[--color-text-primary]`. Profile input: `border-[--color-border-default] bg-[--color-bg-subtle] text-[--color-text-primary] placeholder-[--color-text-tertiary] rounded-[--radius-base] py-1.5 text-[--font-size-ui-base]` with design system focus pattern (replace `focus:ring-2 focus:ring-blue-500`). Primary buttons (Connect, Re-authenticate): `bg-[--color-accent] hover:bg-[--color-accent-hover] text-[--color-text-on-accent] rounded-[--radius-base] text-[--font-size-ui-base]`. "Change profile" link: `text-[--color-accent] text-[--font-size-ui-sm]`. Error: `text-[--color-state-danger]`.
    - **Acceptance criteria**:
      - [ ] Panel uses `--color-bg-base` and `--color-border-default`
      - [ ] Profile input uses `--color-bg-subtle`, `--color-border-default`, and design system focus ring
      - [ ] Primary buttons use `--color-accent` and `--radius-base`
      - [ ] Error text uses `--color-state-danger`
      - [ ] All existing tests pass
    - **Dependencies**: None
