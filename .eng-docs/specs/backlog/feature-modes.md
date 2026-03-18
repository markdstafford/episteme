---
created: 2026-03-18
last_updated: 2026-03-18
status: draft
issue: 25
specced_by: markdstafford
implemented_by: null
superseded_by: null
---

# Document Modes

## What

Document modes configure the AI session — defining which tools the AI can use and what system prompt it operates under. The active mode determines what the AI can do: whether it can edit a document, annotate it, read across the workspace, or something else entirely. Users select a mode explicitly from a picker, and the application enforces the configuration — if the active mode doesn't include write tools, the editor locks.

Modes can operate at three scopes: within a single document, across the entire workspace, or without any document at all (a free-form AI session). Built-in modes ship with the app; workspace owners can define custom modes by dropping manifest files on disk. Opening a document starts in a read-only default mode; workspace-scoped and document-free modes are part of the model but their implementation is deferred to future work.

## Why

Right now, every AI session in Episteme has the same capabilities and the same goal, regardless of what the user is trying to do. The AI infers intent from the conversation. That works for simple interactions, but it breaks down as the app grows: the AI that helps you draft a document shouldn't have the same tools as the one reviewing it for approval, and neither should behave the same as one running an audit across an entire workspace.

Modes give the application a formal way to configure AI sessions. Without this, every new capability — annotations, workspace search, document review — has to be bolted on as a special case, with the app guessing when to enable it. With modes, the model is clean: the user declares what they're doing, the app enforces the right boundaries, and new capabilities can be added by defining a new manifest rather than modifying application code. Custom modes also give workspace owners a way to encode their own workflows — a team's specific review process, a summary format their executives expect — without requiring app changes.

## Personas

- **Patricia: Product Manager** — selects Draft or Revise mode when creating and iterating on documents; benefits from mode preventing accidental edits during review cycles
- **Eric: Engineer** — uses Review mode to annotate others' technical designs; may define custom modes for team-specific workflows
- **Raquel: Reviewer** — primary user of Review mode; needs the AI to surface issues without modifying source documents
- **Aaron: Approver** — uses Approval readiness mode to evaluate readiness; needs write access locked while the AI surfaces risks
- **Olivia: Operations Lead** — may define custom Summary or Audit modes tailored to SOP documentation

## Narratives

### Switching from Review to Author mode

Raquel opens a product description that Patricia submitted for review. The document loads in Review mode — the default for a document in review state — and the AI panel is ready to help her read critically. Raquel asks the AI to surface gaps in the Personas section. The AI identifies two missing user roles and flags that one narrative doesn't map to any defined persona. Raquel starts typing a comment, then pauses — she knows how to fix this and it would be faster to just do it. She switches to Revise mode from the mode picker.

The mode transition is immediate. The editor unlocks, the AI's goal shifts from "surface issues" to "help you improve," and the tool set expands to include write access. Raquel asks the AI to draft a revised Personas section incorporating the two missing roles. The AI writes directly to the document. Raquel reviews the draft, makes a small tweak, and switches back to Review mode when she's done making changes — the editor locks again, and the AI resumes its reviewer goal for the rest of her session.

### Approving a doc and running a batch mode

Aaron has been notified that the notification system PD is ready for sign-off. He opens it in Approval readiness mode — the AI's goal is to help him evaluate readiness, not make changes. He asks the AI whether all the open questions from the review have been resolved. The AI surfaces two that haven't been explicitly addressed in the document and drafts a short checklist of what's missing. Aaron sends the checklist back to Patricia as a comment and puts the document back to In Review.

While he's in the document, Aaron remembers he's supposed to sign off on three other PDs this sprint. Rather than opening each one individually, he switches to Writing guidelines audit mode — a workspace-scoped mode — which operates across all documents rather than a single file. The AI scans the workspace, identifies which documents are in "ready for approval" state, and produces a summary report: two are ready to approve, one has a formatting violation in the Goals section that needs fixing first. Aaron reviews the report and routes accordingly. The batch mode produced a new document — the audit report — and Aaron can open it in any doc-scoped mode to work with it further.

### Adding a custom mode

Eric's team does a lot of architecture review — reading tech designs and evaluating whether they align with existing ADRs and platform decisions. The built-in Review mode is close to what they need, but it doesn't know to check ADR alignment specifically, and its system prompt is too general. Eric decides to define a custom mode.

He creates a new manifest file in the workspace's modes directory — a YAML file with a name, a system prompt that instructs the AI to cross-reference ADRs and flag deviations, and a tool set that includes `read_file` and `search_workspace`. He drops it on disk and reloads the workspace. The new "Architecture review" mode appears in the mode picker alongside the built-in modes. Eric opens a tech design, selects Architecture review, and asks the AI to evaluate the document. The AI immediately surfaces a section that introduces a new queue technology without referencing the existing ADR on messaging infrastructure. The custom mode does exactly what the built-in one couldn't.

## User stories

**Switching from Review to Author mode**

- Raquel can open a document and have a default mode applied automatically
- Raquel can see available modes in a mode picker
- Raquel can switch modes from the picker without leaving the document
- Raquel can see the editor lock or unlock automatically based on the active mode
- Raquel can see the AI's goal shift immediately when she changes modes

**Approving a doc and running a batch mode**

- Aaron can open a document with write access locked by the active mode
- Aaron can switch from a doc-scoped mode to a workspace-scoped mode from the same picker
- Aaron can see a workspace-scoped mode operate across all documents rather than a single file
- Aaron can open a document produced by a batch mode in any doc-scoped mode

**Adding a custom mode**

- Eric can define a custom mode by dropping a manifest file into the workspace
- Eric can specify the tool set and goal for a custom mode
- Eric can see a custom mode appear in the picker alongside built-in modes after reloading

## Goals

- The active mode is always explicit — the app never infers it from conversation context
- Switching modes is instantaneous from the user's perspective; the editor state and AI configuration update without a page reload or visible delay
- Editor write access is derived entirely from the active mode's tool set — no separate editability flag
- Workspace owners can add a custom mode by dropping a single manifest file on disk; no app changes required
- Built-in modes cover the primary workflows out of the box so most users never need to define a custom mode

## Non-goals

- Workspace-scoped and document-free modes — acknowledged in the model, implementation deferred to a future feature
- `available_when` and `priority` expressions for auto-selecting modes based on document state — manifest fields reserved for later
- User-level mode permissions or role-based mode availability
- A UI for creating or editing mode manifests — users write manifest files directly
- Undo/redo across mode switches

## Design spec

*(Added by design specs stage)*

## Tech spec

*(Added by tech specs stage)*

## Task list

*(Added by task decomposition stage)*
