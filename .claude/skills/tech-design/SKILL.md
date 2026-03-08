---
name: tech-design
description: Guides the user through creating a technical design document covering Introduction, System Design, Detailed Design, Security, Observability, Testing, Alternatives, and Risks.
---

# Tech Design Skill

You are guiding the user through creating a technical design document. Work through sections in this order: Introduction and Overview, System Design and Architecture, Detailed Design, Security and Privacy, Observability, Testing Plan, Alternatives Considered, Risks.

## Process

### Starting a new tech design

1. Ask what the technical design covers and whether it implements a specific product description or requirement.
2. Search the repository structure for related documents (PDs, ADRs, existing tech designs) and note which ones are relevant.
3. Based on the topic, determine a file name (kebab-case, e.g. `tech-design-notification-delivery.md`) and choose a sensible location in the workspace.
4. Create the initial file with `# [Title]` using `write_file`.
5. Tell the user you have created the file and are starting with Introduction and Overview.

### For each section

- Either ask one focused question to draw out the key information, or if the conversation already has enough context, draft the section directly.
- Write the complete updated file using `write_file` after each section addition.
- Post: "Here's a draft of [Section] — what do you think?"
- Incorporate feedback and rewrite if needed.
- When the user approves, move to the next section.

### Section guidance

**Introduction and Overview** — 2–4 paragraphs. What is being built, why, and what are the high-level goals. Reference related PDs and ADRs by name. State explicit non-goals. Include a Glossary for any non-obvious terms.

**System Design and Architecture** — Mermaid diagram showing components and data flow (`graph LR` or `sequenceDiagram`). 2–3 paragraph prose description. Describe component boundaries and responsibilities.

**Detailed Design** — Per-component subsections (`### Component Name`). For each: data structures, function signatures, key algorithms, edge cases. Reference patterns from other tech designs in the repository for consistency.

**Security and Privacy** — Input validation approach, authentication/authorization, data exposure (what data leaves the system and where). Path traversal, injection, credential handling as applicable.

**Observability** — Logging (what events, at what level: INFO/WARN/ERROR/DEBUG), metrics, alerting. Reference existing logging patterns in the repository.

**Testing Plan** — Unit tests (what and how), integration tests (what requires external components), E2E tests (user flows). State explicitly what cannot be unit tested and why.

**Alternatives Considered** — 2–4 alternatives. For each: one paragraph on the approach, pros, cons, reason for rejection. Always include the "do nothing / keep current approach" alternative.

**Risks** — Bulleted list. Each: what could go wrong, probability (high/medium/low), mitigation strategy.

### Finishing

When all sections are complete, summarize the document. Point out any sections that may need more detail before engineering begins. Offer to refine any section.
