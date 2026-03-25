---
created: 2026-03-24
last_updated: 2026-03-24
status: accepted
decided_by: markdstafford
superseded_by: null
---

# ADR 012: Modes, doc types, and processes domain model

## Status

Accepted

## Context

ADR-008 established the Claude skills pattern for document types — each document type (product description, tech design, SOP) is represented as a skill in `.claude/skills/`, consisting of a `SKILL.md` process file and a `references/` folder with templates and examples. This works for the single use case it was designed for: AI-guided document authoring.

The document modes feature expands the AI session model significantly. The app now needs to support multiple named AI configurations (modes) — each with its own tools and system prompt — that operate independently of document type. A "Review" mode and a "Draft" mode both apply to product descriptions, but their AI behavior is entirely different. A "Proofread" mode applies to any document type with no type-specific variation at all.

The current skills pattern conflates two things that need to be separate: the structural knowledge of a document type (what sections it has, what it looks like) and the process guidance for working with it in a specific mode (how to guide a user through drafting one). Keeping them merged means the "Draft a product description" skill can't be reused for "Review a product description" — you'd need separate skills for every mode × doc type combination.

Three decisions need to be made:

1. What are the core entities and how do they relate?
2. Where do these entities live on disk?
3. How does this supersede ADR-008?

## Decision

The AI session model is built from three independent entities that compose at runtime.

**Mode** — defines the AI's goal and capabilities for a session. A mode specifies a system prompt and a set of tools drawn from the app-owned tool catalog. Modes know nothing about document types. Three modes ship with the app; workspace owners add custom modes by dropping manifest files in `.episteme/modes/`. Built-in modes and their scopes:

| Mode | Scope | Description |
|---|---|---|
| Draft | Document | AI helps author and revise the open document |
| Review | Document | AI reads and surfaces issues without modifying the document |
| Ask | Workspace | AI answers questions drawing on all documents in the workspace |

**Doc type** — defines the template structure for a category of document. A single markdown file: name, description, and section template. No examples — these belong in processes where they're most useful. A small set of illustrative doc types ship with the app; workspace owners define their own in `.episteme/doc-types/`.

**Process** — provides instructions for a specific (mode, doc type) combination. Processes are optional. Simple processes are a single markdown file; complex processes use a directory with `stages/`, `roles/`, and `examples/` subdirectories to break down guidance into manageable chunks. Workspace owners define processes in `.episteme/processes/`.

**Frontmatter is the connective tissue of this model.** It serves two critical roles:

- **Documents declare their type** via frontmatter. The app reads `type: product-description` to know which doc type to load and which processes are applicable.
- **Processes declare their associations** via frontmatter. A process's frontmatter specifies which `mode` and `doc_type` it applies to — this is the canonical source of truth for the association, not the filename. Filenames like `draft+product-description.md` are a human-readable convention only.

Example document frontmatter:
```yaml
type: product-description
status: in-review
```

Example process frontmatter:
```yaml
mode: draft
doc_type: product-description
```

**Directory structure:**

```
.episteme/
  modes/
    draft.md                           # Built-in
    ask.md                             # Built-in
    review.md                          # Built-in
    <custom-mode>.md                   # Workspace-defined
  doc-types/
    product-description.md             # Single file: name + template
    tech-design.md
    <custom-doc-type>.md
  processes/
    draft+product-description.md       # Simple process (single file)
    draft+tech-design/                 # Complex process (directory)
      process.md                       # Main instructions
      stages/                          # Stage breakdowns
      roles/                           # Role definitions
      examples/                        # Examples for this combination
    review+product-description.md
    <mode>+<doc-type>.md or <mode>+<doc-type>/
```

**Context assembly at runtime:**

When the user activates a mode, the app assembles the AI system prompt from:
1. Active mode: system prompt + tool definitions
2. Open document's doc type template (if document frontmatter declares a `type`)
3. Process for the (active mode, doc type) pair — located by matching process frontmatter, not filename (if it exists)
4. Current document content
5. Workspace file tree

Steps 2–3 are skipped when no doc type is known. Step 3 is skipped when no process exists for the combination.

**Supersedes ADR-008:**

ADR-008's skill files conflated doc type and process. Under this model they separate:
- `SKILL.md` process guidance + examples → `.episteme/processes/draft+<doc-type>/`
- `references/template.md` → `.episteme/doc-types/<name>.md`

The `.claude/skills/` directory is retired. Existing skill files are migrated manually.

## Consequences

**Positive:**
- Mode and doc type are independently extensible — adding a new doc type requires no changes to any mode, and vice versa
- Context assembly is automatically optimized — only the process relevant to the active (mode, doc type) pair is loaded; unrelated guidance never enters the context window
- Frontmatter makes associations explicit and self-describing — the app doesn't rely on filename conventions or directory position to resolve relationships
- Workspace owners can define custom modes, doc types, and processes without touching app code
- Processes can scale from a single markdown file to a rich directory with stages, roles, and examples as needs grow

**Negative:**
- Three entities to understand and maintain instead of one — workspace owners adding a custom doc type must also author processes for each mode they want to support well
- No schema validation on manifest files — a malformed mode, doc type, or process produces degraded AI behavior rather than a clear error
- Process discovery requires scanning `.episteme/processes/` and reading frontmatter — slightly more runtime work than filename-based lookup

## Alternatives considered

### Option A: Mode absorbs doc type (single entity)

Each mode × doc type combination is its own manifest. "Draft a product description" and "Draft a tech design" are separate modes. No doc type entity exists.

**Pros:**
- Single entity to understand — one manifest file fully specifies an AI configuration
- No runtime composition step

**Cons:**
- Combinatorial explosion — N modes × M doc types = N×M manifests to author and maintain
- Adding a new doc type requires duplicating every mode for it
- Adding a new mode requires duplicating it for every doc type

**Why not chosen:** Does not scale. 10 modes × 15 doc types = 150 manifests; most would be near-identical copies.

### Option B: Mode and doc type separate, no process entity

Mode and doc type are independent manifests. Doc type content (template + examples + process guidance) is always injected into the system prompt when a document of that type is open, regardless of mode.

**Pros:**
- Two entities instead of three — simpler mental model
- No process authoring burden for workspace owners

**Cons:**
- Process guidance bleeds across modes — a "Review" session on a product description would receive Draft authoring instructions from the doc type
- Doc type files grow large and unfocused as they accumulate guidance for multiple modes
- No way to provide mode-specific examples or stage breakdowns per combination

**Why not chosen:** Context pollution — loading Draft process guidance into a Review or Proofread session wastes context window and risks confusing the model.
