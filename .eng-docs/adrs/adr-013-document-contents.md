---
created: 2026-03-28
last_updated: 2026-03-28
status: accepted
decided_by: markdstafford
superseded_by: null
---

# ADR 013: Document Contents

## Status

Accepted

## Context

Episteme stores documents as markdown files in a git repository. As the application adds features — comments, review/approval workflows, reactions, sharing — it must decide what data belongs in the markdown file itself and what belongs in external storage outside the file.

This decision matters because:

- The git repository is the canonical record of a document's history. Every change to a file appears in `git log`, `git diff`, and PR reviews. Not all changes are equally meaningful to that history.
- Markdown files are portable artifacts. A document should be readable and complete on its own — in GitHub's file browser, in VS Code, in any markdown renderer — without requiring the Episteme application.
- Different categories of change have different audiences. A reviewer resolving a comment thread or a user reacting to a document are interactions *with* the document, not changes *to* it. Mixing these with document edits obscures what actually changed.

**The litmus test:** *Should this change be obvious in git history?*

Changes that record document truth — its content, title, lifecycle state (e.g., marking a document superseded) — belong in the markdown file. These are changes a reader would want to know about when reading the history of the document.

Changes that record user interactions with the document — commenting, resolving threads, sharing, reacting — do not belong in the file. These are workflow events, not document edits. Including them would create noise in git history and conflate the document as an artifact with the processes that surround it.

This boundary also has implications for what the application can build cleanly: keeping interaction data external makes it possible to clearly attribute document changes to their authors, and to show a clean diff of what actually changed in a review.

## Decision

Document content and document-truth metadata live in the markdown file. User interactions with the document live in external storage.

**The litmus test:** *Should this change be obvious in git history?* If yes, it belongs in the file.

**What lives in the file:**
- Document prose (body content)
- Frontmatter that describes the document itself: title, author, creation date, status, tags
- Footnotes

**What lives in external storage:**
- Comment threads and replies
- Comment resolution state
- Reactions
- Share / access records
- View history and reading activity
- Any other user interaction that does not change what the document *is*

The distinction is not about whether data is stored as frontmatter or prose — it is about whether the change represents a fact about the document or a fact about how users have interacted with it. Marking a document superseded is a fact about the document; resolving a comment thread is a fact about a reviewer's interaction with it.

## Consequences

**Positive:**
- Git history reflects meaningful document changes only — diffs are readable and attributable to the right authors
- Markdown files are portable standalone artifacts, readable in any editor or renderer without Episteme
- Document changes and reviewer interactions are clearly separated, making it straightforward to answer "what changed in this document?" vs. "what activity happened around this document?"
- External interaction data can evolve independently of the document format
- Comment management, reactions, and sharing can be built without touching the markdown source

**Negative:**
- External storage severs the natural link between document versions and interaction data. A comment anchored to content that is later rolled back becomes an orphan — the text it references may no longer exist. Re-introducing that content in a future commit does not automatically restore the relationship. The comments feature spec will need to define how anchor staleness is detected and communicated to users.
- Documents and their associated interaction data must be kept in sync when documents are moved, renamed, or deleted — operations that only touch the file system will leave orphaned external records unless Episteme intercepts them.
- The "what belongs in the file" test requires judgment on edge cases. Future features will need to evaluate new data types against the litmus test and may need to revisit this ADR if clear answers aren't available.

## Alternatives considered

### Option A: Content only — pure markdown, no frontmatter

The file contains only prose. All structured metadata (title, status, owner, lifecycle state) lives in external storage. The markdown file is maximally portable and carries zero application state.

**Pros:**
- Files are completely clean — readable anywhere with zero app-specific syntax
- No risk of application state leaking into the document

**Cons:**
- Document metadata is invisible to git history — you can't see from a diff that a document was marked superseded or changed ownership
- Frontmatter is a widely understood convention; rejecting it entirely is unnecessarily strict

**Why not chosen:** Document-truth metadata belongs in the historical record. Frontmatter is the right place for it.

---

### Option B: Rich markdown — embed all structured state in the file

Content, metadata, and user interactions all live in the markdown file. Comment threads are embedded as HTML annotations or custom syntax; workflow state lives in frontmatter.

**Pros:**
- Everything travels together in one file
- No synchronization problem between file and external state
- Comments are version-pinned by definition

**Cons:**
- Git history becomes noisy — every comment, reaction, and resolution commits against the document file
- Conflates document authorship with reviewer interactions; a commit from a reviewer looks like a document edit
- HTML annotations are fragile across markdown parsers and editors
- Documents require Episteme to strip embedded application state before they're readable elsewhere

**Why not chosen:** Noise in git history and conflation of document changes with reviewer interactions are disqualifying. Diff readability and clean attribution are core to Episteme's value.
