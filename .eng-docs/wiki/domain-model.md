---
created: 2026-03-04
last_updated: 2026-03-04
status: active
---

# Domain Model

This document defines the core domain entities, their relationships, and business rules for Episteme.

**Status**: Initial stub - to be populated as features are designed

---

## Core Entities

### Document

A markdown file in the git repository.

**Attributes** (to be detailed):
- ID (from frontmatter)
- Title
- Type (product description, tech design, SOP, etc.)
- Status (draft, in review, approved)
- Author
- Reviewers
- Approvers
- Related documents

**Relationships** (to be detailed):
- Has many Comments
- Belongs to Repository
- References other Documents

### Comment

A discussion thread on a document (backed by GitHub discussions).

**Attributes** (to be detailed):
- ID
- Document ID
- Position/anchor in document
- Author
- Content
- Status (open, resolved)

### Repository

A git repository containing documents.

**Attributes** (to be detailed):
- Path
- Remote URL
- Current branch

---

## Business Rules

(To be added as features are designed)

---

## Notes

This document will be updated as we design features and make domain decisions. Each significant domain decision should have a corresponding ADR.
