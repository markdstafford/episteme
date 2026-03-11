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

- `src/components/AiChatPanel.tsx` — apply design system tokens; implement panel layout per spec
- `src/components/ChatMessage.tsx` — apply design system tokens for message typography and layout

### Changes

Replace hardcoded Tailwind classes with design system token references throughout both components. Migrate the input area in `AiChatPanel.tsx` to use the `Input` primitive once `enhancement-migrate-interactive-components.md` is implemented. No behavior changes — visual migration only.

## Task list

*(To be completed after `design-system.md` is finalized and `enhancement-encode-design-tokens.md` is implemented.)*
