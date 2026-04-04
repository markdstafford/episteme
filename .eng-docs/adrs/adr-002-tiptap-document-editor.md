---
created: 2026-03-04
last_updated: 2026-03-04
status: accepted
decided_by: markdstafford
superseded_by: null
doc_id: bdfbcd05-5b2f-4c2d-9a90-18207c136241
---

# ADR 002: TipTap document editor

## Status

Accepted

## Context

Episteme centers around editing markdown documents with AI assistance. The editor needs to:
- Provide excellent markdown editing experience with pure markdown support (not markdown-like formats)
- Support YAML frontmatter for document metadata
- Support well-adopted extensions like GitHub Flavored Markdown
- Avoid exotic or unsupported constructs (like columns or proprietary formatting)
- Support real-time collaboration (Phase 2) via Y.js CRDT
- Be extensible for custom features (AI chat integration, comments, highlights)
- Feel modern and performant
- Work within React and Tauri

Documents are stored as standard markdown files in git repositories, so maintaining standard markdown format is critical—users must be able to edit files directly in any text editor and have changes work seamlessly in the app.

**Important note**: Most of the time, AI will be editing the markdown directly through conversation with the user. This means **rendering quality and comment/annotation features are more important than the manual editing experience**. Users will primarily read and review rendered markdown rather than type it themselves.

The choice affects user satisfaction, collaboration features, and how easily we can integrate AI assistance into the editing workflow.

Key constraints:
- Must support pure/standard markdown with common extensions (GitHub Flavored Markdown)
- Must support YAML frontmatter
- Must avoid exotic unsupported constructs
- Must have Y.js integration for real-time collaboration
- Must work with React
- Must be extensible for custom functionality (especially comments/annotations)
- Should have excellent rendering quality

## Decision

We will use TipTap as our document editor framework.

TipTap provides the right balance of pure markdown support, extensibility, and rendering quality. It handles standard markdown natively, supports YAML frontmatter, integrates with Y.js for collaboration, and provides the extensibility we need for comments and AI integration. Since AI will be doing most of the editing, TipTap's excellent rendering capabilities and extension system for annotations are more valuable than a fully-featured WYSIWYG editing experience.

## Consequences

**Positive:**
- Pure markdown support ensures files work in any text editor
- Official Y.js extension provides battle-tested real-time collaboration
- Extensible architecture allows custom comment/annotation features
- Headless design gives full control over rendering and UI
- Large ecosystem of extensions for common needs
- Strong community and documentation
- Supports GitHub Flavored Markdown and frontmatter
- Excellent rendering quality for AI-generated content

**Negative:**
- Requires building custom UI components (not out-of-the-box)
- Initial setup and configuration needed
- Learning curve for ProseMirror concepts

## Alternatives considered

**Option 1: Raw ProseMirror**

Build directly on ProseMirror (the underlying editor framework) without abstractions.

**Pros:**
- Maximum control over every aspect
- No dependency on TipTap's abstractions
- Direct access to ProseMirror's full power

**Cons:**
- Significantly more code to write and maintain
- Must implement markdown serialization/deserialization ourselves
- Must build Y.js integration ourselves
- Must build all UI components ourselves
- Slower development velocity
- More potential for bugs

**Why not chosen:** TipTap provides helpful abstractions and proven solutions (Y.js integration, markdown support) without sacrificing flexibility. Building on raw ProseMirror would be reinventing the wheel.

---

**Option 2: BlockNote**

BlockNote is a modern block-based editor inspired by Notion, built on ProseMirror.

**Pros:**
- Beautiful UI out of the box
- Modern, intuitive block-based editing

**Cons:**
- Uses proprietary block-based JSON format (not pure markdown)
- Markdown support is via conversion/export, not native storage
- **Does not meet core requirement for pure markdown files that work in standard text editors**

**Why not chosen:** BlockNote's proprietary format directly contradicts our requirement for pure markdown storage. Not appropriate for Episteme.
