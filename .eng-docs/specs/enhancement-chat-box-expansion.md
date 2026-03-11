---
created: 2026-03-10
last_updated: 2026-03-10
status: draft
issue: 8
specced_by: markdstafford
implemented_by: null
superseded_by: null
---

# Enhancement: Chat Box Expansion

## Parent feature

`feature-ai-chat-assistant.md`

## What

The chat input in the AI panel is replaced with an expandable card-style container. Instead of a fixed single-row textarea, the input grows automatically as the user types — line by line, up to 50% of the panel height, after which it scrolls internally. The card wraps the textarea on top and a persistent toolbar on the bottom, keeping the send button always visible. Users can send with `Enter` or `Cmd+Enter` and insert newlines with `Shift+Enter`.

## Why

A fixed single-row textarea is a poor fit for a conversational AI tool. Users composing longer messages — multi-step questions, document excerpts they want the AI to respond to, detailed context — have no way to see what they've written before sending. The expandable card pattern, used by Claude, ChatGPT, and similar tools, is the established convention for AI chat inputs precisely because it solves this: the input grows with the message, the send button stays put, and users always have full visibility of what they're about to send.

## Goals

1. Users can type multi-line messages without text being hidden behind a truncated single-line input
2. The input grows automatically with content — no manual action required
3. The input expands up to 50% of the chat panel height, then scrolls internally
4. The send button is always visible regardless of input height

## User stories

- User sees the input grow line by line as they type, without taking any action
- User can insert a newline with `Shift+Enter` and see the box expand to accommodate it
- User can send a message with `Enter` or `Cmd+Enter`
- When the input reaches 50% of the chat panel height, it stops growing and scrolls internally instead
- The send button remains visible at all times regardless of how tall the input is

## Design spec

### Layout

```
┌─────────────────────────────────────┐
│ Ask a question...                   │
│                                     │  ← textarea, grows upward
│                                     │
├─────────────────────────────────────┤
│                            [send ↑] │  ← fixed toolbar, always visible
└─────────────────────────────────────┘
```

The input area is a single rounded card containing both the textarea and the toolbar. The textarea has no border of its own — the card provides the container. The toolbar is a fixed-height row that never moves regardless of how tall the textarea gets. Left side of the toolbar is reserved for future actions (file attachment, model selector, etc.).

### UI components

#### Input card
- `rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800`
- `focus-within:ring-2 focus-within:ring-blue-500` — ring activates when textarea is focused
- Contains textarea on top, toolbar on bottom, separated by `border-t border-gray-200 dark:border-gray-700`

#### Textarea
- No border, no background (`bg-transparent border-none outline-none`)
- `w-full resize-none px-3 pt-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400`
- Starts at 1 row; auto-grows via `scrollHeight` on every input event
- Max height: 50% of the chat panel height, computed via a `ref` on the panel container and set as an inline `maxHeight` style
- `overflow-y-auto` always set — activates naturally once content exceeds max height

#### Toolbar
- `flex items-center justify-end px-2 py-1.5`
- Send button: `bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-1.5 disabled:opacity-50`
- Send icon: `ArrowUp` from Lucide (`w-4 h-4`)
- Disabled when input is empty or streaming

## Tech spec

**Prerequisites:** AI chat assistant feature — `AiChatPanel.tsx` exists with a working textarea and send flow.

**Changes:** `AiChatPanel.tsx` only. No new files, no store changes, no Tauri changes.

**Auto-grow**: In a `useEffect` watching `input`, reset the textarea height to `'auto'` then set it to `textarea.scrollHeight + 'px'`. Resetting to `auto` first forces the browser to recompute the natural height before reading `scrollHeight`.

**Max height**: Add a `ref` to the outer panel `div` (the `w-96` container). In the same effect, read `panelRef.current.offsetHeight * 0.5` and apply as `maxHeight` on the textarea via inline style. `overflow-y-auto` on the textarea handles scrolling once the max is reached.

**Input card**: Replace the current `flex gap-2` row (textarea + send button side by side) with the card structure from the design spec.

**Keyboard behavior**: Extend the existing `handleKeyDown` — send on `Enter` (without Shift) or `Cmd+Enter` (with metaKey). Shift+Enter falls through to default textarea behavior, inserting a newline.

## Task list

- [ ] **Story: Expandable chat input**
  - [ ] **Task: Refactor input area into card layout**
    - **Description**: In `AiChatPanel.tsx`, replace the `flex gap-2` row containing the textarea and send button with a card container per the design spec. The card wraps a textarea on top and a toolbar row on the bottom, separated by a border. The textarea should have no border of its own — the card provides the visual container. Move the send button into the toolbar row, right-aligned. Use `ArrowUp` icon instead of the current `Send` icon.
    - **Acceptance criteria**:
      - [ ] Input area renders as a single rounded card with `rounded-xl border`
      - [ ] `focus-within:ring-2 ring-blue-500` ring activates when the textarea is focused
      - [ ] Textarea has no visible border or background of its own
      - [ ] Toolbar is separated from textarea by a top border
      - [ ] Send button is right-aligned in the toolbar with `ArrowUp` icon
      - [ ] Send button disabled when input is empty or streaming
      - [ ] Dark mode styles apply correctly throughout
    - **Dependencies**: None
  - [ ] **Task: Implement auto-grow textarea**
    - **Description**: Add a `ref` to the textarea and a `useEffect` watching `input` state. On each change: set `textarea.style.height = 'auto'`, then set `textarea.style.height = textarea.scrollHeight + 'px'`. Add a `ref` to the outer panel container (`w-96` div) and compute `panelRef.current.offsetHeight * 0.5` to use as the textarea's `maxHeight` inline style. Set `overflow-y-auto` on the textarea so it scrolls internally once the max is reached.
    - **Acceptance criteria**:
      - [ ] Textarea starts at 1 row when input is empty
      - [ ] Textarea grows line by line as content is added
      - [ ] Textarea stops growing at 50% of the chat panel height
      - [ ] Textarea scrolls internally once max height is reached
      - [ ] Height resets to 1 row after a message is sent
    - **Dependencies**: "Task: Refactor input area into card layout"
  - [ ] **Task: Add Cmd+Enter send shortcut**
    - **Description**: In `AiChatPanel.tsx`, update `handleKeyDown` to also trigger `handleSend` when `e.key === 'Enter' && e.metaKey` is true, in addition to the existing `Enter` without Shift. Shift+Enter should continue to fall through to default textarea behavior (newline insertion).
    - **Acceptance criteria**:
      - [ ] `Enter` (no modifiers) sends the message
      - [ ] `Cmd+Enter` sends the message
      - [ ] `Shift+Enter` inserts a newline and grows the box
      - [ ] No change to send behavior while streaming
    - **Dependencies**: "Task: Refactor input area into card layout"
