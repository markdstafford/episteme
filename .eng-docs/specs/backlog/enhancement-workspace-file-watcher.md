---
created: 2026-04-02
last_updated: 2026-04-02
status: approved
issue: 116
specced_by: markdstafford
implemented_by: null
superseded_by: null
---

# Enhancement: Workspace file watcher

## Parent feature

- `feature-sidebar-browser.md` — owns the file tree that must refresh when files are created/deleted
- `feature-modes.md` — owns the `.episteme/` manifest watcher that has the race condition bug

## What

Replace the current `.episteme/`-only file watcher with a unified workspace-root watcher that (a) fixes the race condition where `.episteme/` created after `load_manifests` is never watched, (b) refreshes the sidebar file tree when markdown files are created, renamed, or deleted anywhere in the workspace, and (c) hot-reloads the currently-open document in the markdown renderer when it is modified externally (e.g. by Claude checking off a task list item).

## Why

The app currently has no awareness of filesystem changes after initial load. If a user creates a new document through the AI assistant's `write_file` tool, it doesn't appear in the sidebar until the workspace is manually reloaded. If Claude modifies an open document (e.g. checking off tasks), the user sees stale content until they re-select the file. The `.episteme/` watcher also silently fails if the directory is created after startup, breaking manifest hot-reload (issue #116). A workspace-level watcher fixes all three gaps with a single mechanism.

## User stories

- User can see new markdown files in the sidebar within seconds of creation, without reloading the workspace
- User can see deleted files disappear from the sidebar automatically
- User sees the document viewer update when an external process (e.g. Claude) modifies the currently-open file
- User sees new `.episteme/` manifests reflected in the mode picker even if `.episteme/` was created after the app started
- User can still manually reload the workspace as a fallback if the watcher misses an event

## Design changes

No visual design changes — the sidebar, document viewer, and mode picker already exist. The change is that they now update reactively instead of only on explicit user action.

## Technical changes

### Affected files

- `src-tauri/src/lib.rs` — expand `WatcherState` to hold workspace watcher (not just manifest watcher)
- `src-tauri/src/commands/manifests.rs` — remove the `.episteme/`-only watcher; consolidated into workspace watcher
- `src-tauri/src/commands/files.rs` — no structural change, but `list_files` will be re-invoked by the watcher callback
- `src/stores/workspace.ts` — subscribe to new `workspace-files-changed` event; trigger file tree reload
- `src/stores/fileTree.ts` — add `refreshTree` action (re-invoke `list_files` without clearing selection)
- `src/components/DocumentViewer.tsx` — subscribe to `workspace-files-changed`; re-read file if it matches `selectedFilePath`

### Changes

**Backend — unified workspace watcher (`manifests.rs` + `lib.rs`)**

Replace the current `.episteme/`-only watcher with a single `notify` watcher on the workspace root (`RecursiveMode::Recursive`). The watcher callback inspects changed paths and emits targeted events:

1. If any changed path is under `.episteme/`, reload manifests and emit `manifests-reloaded` (existing behavior, preserved)
2. If any changed path is a `.md`/`.markdown` file, emit `workspace-files-changed` with the list of affected paths
3. Both can fire in a single callback invocation (a file created in `.episteme/modes/` is both a manifest change and a workspace file change)

The watcher is registered on the workspace root, so `.episteme/` being created *after* startup is handled automatically — the parent directory is already watched.

Debounce: use `notify-debouncer-mini` (or a simple `Instant`-based skip in the callback) to coalesce rapid events within a 500ms window, preventing redundant reloads during batch file operations.

**Frontend — file tree refresh (`fileTree.ts`, `workspace.ts`)**

Add a `refreshTree(folderPath)` action to `useFileTreeStore` that re-invokes `list_files` but preserves `selectedFilePath` and `expandedPaths` (unlike `loadTree` which resets them). The workspace store subscribes to `workspace-files-changed` and calls `refreshTree`.

**Frontend — document hot-reload (`DocumentViewer.tsx`)**

Subscribe to `workspace-files-changed`. If the event's path list includes the currently-selected file, re-invoke `read_file` and update content/frontmatter state. This triggers the `MarkdownRenderer` to re-render via its existing `useEffect` on `content`.

## Task list

- [x] **Story: Unified workspace watcher (backend)**
  - [x] **Task: Refactor WatcherState to support workspace-level watcher**
    - **Description**: Change `WatcherState` in `lib.rs` to hold a watcher scoped to the workspace root instead of `.episteme/` only. The type stays the same (`Option<notify::RecommendedWatcher>`), but the watch target changes.
    - **Acceptance criteria**:
      - [ ] `WatcherState` struct unchanged in shape but documented as workspace-scoped
      - [ ] Old `.episteme/`-only watcher registration removed from `load_manifests`
      - [ ] Existing Rust tests still pass
    - **Dependencies**: None
  - [x] **Task: Implement unified watcher registration in `load_manifests`**
    - **Description**: Replace the `.episteme/`-specific watcher with a single `recommended_watcher` on the workspace root path. The callback inspects each event's paths: if under `.episteme/`, reload manifests and emit `manifests-reloaded`; if a `.md`/`.markdown` file, emit `workspace-files-changed` with the affected paths. Register with `RecursiveMode::Recursive`.
    - **Acceptance criteria**:
      - [ ] Watcher registered on workspace root, not `.episteme/`
      - [ ] `manifests-reloaded` event still emitted when `.episteme/` contents change
      - [ ] New `workspace-files-changed` event emitted when `.md` files change (payload: `Vec<String>` of absolute paths)
      - [ ] Watcher fires for new file creation, modification, and deletion
      - [ ] `.episteme/` created after startup still triggers manifest reload
      - [ ] Watcher stored in `WatcherState` and properly replaced on workspace change
      - [ ] Log messages indicate watcher scope (workspace root path)
    - **Dependencies**: "Task: Refactor WatcherState to support workspace-level watcher"
  - [x] **Task: Add debouncing to watcher callback**
    - **Description**: Coalesce rapid filesystem events within a 500ms window to prevent redundant manifest reloads and file-tree refreshes during batch operations. Use a simple `Instant`-based approach: track last-emitted timestamp per event type and skip if within the debounce window.
    - **Acceptance criteria**:
      - [ ] Rapid file changes (e.g. writing 10 files in 200ms) produce at most one `workspace-files-changed` event per 500ms window
      - [ ] Manifest reloads are similarly debounced
      - [ ] Single isolated changes still emit within ~500ms
      - [ ] Debounce state is thread-safe (uses `Arc<Mutex<Instant>>` or similar)
    - **Dependencies**: "Task: Implement unified watcher registration in `load_manifests`"
- [ ] **Story: Sidebar file tree hot-refresh (frontend)**
  - [x] **Task: Add `refreshTree` action to fileTree store**
    - **Description**: Add a `refreshTree(folderPath)` action that re-invokes `list_files` and updates `nodes` but preserves `selectedFilePath` and `expandedPaths`. Unlike `loadTree`, this is a non-destructive refresh.
    - **Acceptance criteria**:
      - [ ] `refreshTree` re-fetches file tree from backend
      - [ ] `selectedFilePath` preserved after refresh (even if the file no longer exists — deselection handled separately)
      - [ ] `expandedPaths` preserved after refresh
      - [ ] If the selected file was deleted, `selectedFilePath` is cleared
      - [ ] Unit test: refresh preserves selection and expanded state
      - [ ] Unit test: refresh clears selection when selected file is gone
    - **Dependencies**: None
  - [x] **Task: Subscribe to `workspace-files-changed` in workspace store**
    - **Description**: In `setupWorkspaceManifests` (or a new `setupWorkspaceWatcher` function), add a listener for the `workspace-files-changed` event from the backend. On receipt, call `refreshTree` on the file tree store.
    - **Acceptance criteria**:
      - [ ] Listener registered when workspace is opened
      - [ ] Previous listener cleaned up on workspace change
      - [ ] `refreshTree` called with correct folder path on event
      - [ ] Unit test: mock event triggers `refreshTree`
    - **Dependencies**: "Task: Add `refreshTree` action to fileTree store"
- [x] **Story: Document hot-reload (frontend)**
  - [x] **Task: Re-read open document on external change**
    - **Description**: In `DocumentViewer`, subscribe to `workspace-files-changed`. If the event payload includes the currently-selected file path, re-invoke `read_file` and update content/frontmatter state. This triggers the `MarkdownRenderer` to re-render via its existing `useEffect` on content.
    - **Acceptance criteria**:
      - [ ] Open document refreshes when modified externally
      - [ ] No refresh triggered for changes to other files
      - [ ] Scroll position is preserved after refresh (TipTap editor handles this naturally via `setContent`)
      - [ ] Loading spinner is NOT shown during hot-reload (avoid flicker)
      - [ ] Listener cleaned up on unmount
      - [ ] Unit test: mock event for selected file triggers re-read
      - [ ] Unit test: mock event for different file does NOT trigger re-read
    - **Dependencies**: "Task: Subscribe to `workspace-files-changed` in workspace store" (so the event is flowing)
- [ ] **Story: Tests and verification**
  - [ ] **Task: Integration test — new file appears in sidebar**
    - **Description**: Write a test that simulates a `workspace-files-changed` event and verifies the file tree store refreshes, with the new file visible in the node list while preserving existing selection and expanded state.
    - **Acceptance criteria**:
      - [ ] Test emits mock `workspace-files-changed` event
      - [ ] File tree store's `nodes` update to include new file
      - [ ] `selectedFilePath` and `expandedPaths` preserved
      - [ ] Test passes
    - **Dependencies**: "Task: Subscribe to `workspace-files-changed` in workspace store"
  - [ ] **Task: Integration test — open document re-renders on change**
    - **Description**: Write a test that simulates a `workspace-files-changed` event for the currently-open file and verifies `DocumentViewer` re-reads and re-renders the updated content.
    - **Acceptance criteria**:
      - [ ] Test mounts `DocumentViewer` with a selected file
      - [ ] Test emits mock `workspace-files-changed` with the selected file's path
      - [ ] `read_file` is invoked again
      - [ ] Updated content appears in the renderer
      - [ ] Test passes
    - **Dependencies**: "Task: Re-read open document on external change"
