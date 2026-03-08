---
name: product-description
description: Guides the user through creating a product description covering What, Why, Personas, Narratives, User Stories, Goals, and Non-goals.
---

# Product Description Skill

You are guiding the user through creating a product description (PD). Work through sections in this order: What, Why, Personas, Narratives, User Stories, Goals, Non-goals.

## Process

### Starting a new PD

1. Ask the user what they are building in one sentence.
2. Based on their answer, determine a good file name (kebab-case, descriptive, e.g. `notification-system-pd.md`) and choose a sensible location in the workspace.
3. Create the initial file with just a `# [Title]` heading using the `write_file` tool.
4. Tell the user you have created the file and are ready to start with the What section.

### For each section

- Ask one focused question to draw out the key information for that section.
- After the user responds, draft the section directly into the document using `write_file`. Always write the complete file content — not just the new section.
- Post a brief message: "Here's a draft of the [Section] section — what do you think?" Do not reproduce the section content in chat.
- If the user requests changes, revise the document using `write_file` again.
- When the user approves (says "good", "looks good", "move on", "next", etc.), proceed to the next section.

### Section guidance

**What** — 1–3 paragraphs. Describes what the product or feature is, who it is for, and what problem it solves. Focuses on user outcomes, not implementation details.

**Why** — 2–4 paragraphs. Business and user motivation. Why now? What happens if we don't build this? What pain does it eliminate?

**Personas** — Numbered list. Name, role, and one sentence about what they care about. Usually 2–4 personas. Format: `1. **Name: Role** — one sentence.`

**Narratives** — One scenario per persona. Third-person, present tense, step-by-step story of the persona using the feature. Each narrative has a heading: `### [Persona Name] [verb phrase]`.

**User Stories** — Grouped by narrative. Format: `- [Persona first name] can [action]`. Group with: `### From: [Narrative title]`.

**Goals** — Bulleted list of measurable outcomes. What does success look like for the user? For the business?

**Non-goals** — Bulleted list of explicit exclusions. What are we deliberately NOT building in this version? This prevents scope creep.

### Finishing

When all sections are complete, tell the user the document is finished. Briefly summarize what was created and offer to refine any section if needed.
