# Enhancement: Sidebar Folder Name

## Goals

1. Users always know which folder is open without needing to check the OS or remember
2. The folder name is visible at a glance in the sidebar without taking up significant space
3. The display degrades gracefully for long folder names (truncation, not overflow)

## User stories

- User sees the open folder's name at the top of the sidebar at all times while a folder is open
- Long folder names are truncated with an ellipsis rather than wrapping or overflowing
- User can click the folder name to open a new folder, replacing the current workspace

## Design spec

### Layout

```
┌────────────────────────────┐
│ my-docs-folder          [+]│  ← flex row: folder name left, action slot right
├────────────────────────────┤
│ 📁 specs                   │
│   📄 app                   │
│   📄 feature-foo           │
│ 📁 adrs                    │
│   📄 001-tauri             │
└────────────────────────────┘
```

The `[+]` slot is reserved for the "New document" button added by the document authoring feature. This enhancement only implements the folder name — the button is not added here.

### UI components

#### Sidebar header
- Full width of sidebar, `px-3 py-2`
- **Flex row**: `flex items-center justify-between` — folder name on the left, action slot on the right
- Folder basename (not full path) in `text-sm font-medium text-gray-700 dark:text-gray-300` with `truncate min-w-0`
- Bottom border: `border-b border-gray-200 dark:border-gray-700`
- Clicking the folder name calls `openFolder()` from workspace store: `cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded` on the name element
- No folder icon — the header is a label, not a tree item
- Right side is empty in this enhancement; the authoring feature will add a button there

## Tech spec

**Prerequisites:** Feature: Sidebar file browser — `Sidebar.tsx` and `useWorkspaceStore` (with `folderPath` and `openFolder`) already exist.

**Changes:** `Sidebar.tsx` only. No new files, no new stores, no new Tauri commands.

- Read `folderPath` and `openFolder` from `useWorkspaceStore`
- Derive the display name by splitting on the OS path separator: `folderPath.split(/[\\/]/).pop()` — handles both macOS and Windows without an async Tauri API call
- Render the header above `{children}` per the design spec

## Task list

- [ ] **Story: Sidebar folder name header**
  - [ ] **Task: Add folder name header to `Sidebar.tsx`**
    - **Description**: Modify `Sidebar.tsx` to read `folderPath` and `openFolder` from `useWorkspaceStore`. Render a header above `{children}` as a flex row (`flex items-center justify-between`) with the folder basename on the left and an empty right side (reserved for the "New document" button from the authoring feature). The folder name element is clickable and calls `openFolder()`. Derive the basename with `folderPath.split(/[\\/]/).pop()`. Apply styles per the design spec.
    - **Acceptance criteria**:
      - [ ] Folder basename appears above the file tree when a folder is open
      - [ ] Full path is never shown — only the final path segment
      - [ ] Long names are truncated with ellipsis, not wrapped or clipped (`truncate min-w-0` on the name element)
      - [ ] Header is a flex row (`flex items-center justify-between`) to accommodate a future right-side button
      - [ ] Hover state (`bg-gray-100 dark:bg-gray-800`) is visible on mouse over the folder name
      - [ ] Clicking the folder name triggers `openFolder()` and opens the OS folder picker
      - [ ] Bottom border separates the header from the file tree
      - [ ] Dark mode styles apply correctly
    - **Dependencies**: None
