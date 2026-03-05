# Database Schema

This document defines database tables, columns, relationships, and constraints for Episteme.

**Status**: Initial stub - to be populated as features are designed

---

## Overview

Episteme uses **markdown files in git** as the primary data store. This document will capture any additional local storage needs (caching, indexes, user preferences, etc.).

---

## Local Storage

### User Preferences

**Storage**: Local JSON file in app data directory (excluded from git)

**Schema** (to be detailed):
```typescript
{
  theme: 'light' | 'dark',
  last_opened_folder: string | null,
  aws_profile: string | null,
}
```

### Document Cache

**Purpose**: Cache document summaries for hover previews

**Storage approach** (to be determined):
- SQLite database?
- Local JSON files?
- In-memory with persistence?

---

## Markdown Frontmatter Schema

Documents store metadata in YAML frontmatter.

**Example structure** (to be detailed):
```yaml
---
id: doc-uuid
title: Document Title
type: product-description | tech-design | sop | adr
status: draft | in-review | approved
author: github-username
reviewers: [github-username, ...]
approvers: [github-username, ...]
created: ISO-8601 timestamp
updated: ISO-8601 timestamp
---
```

---

## Notes

This document will be updated as we design features and determine storage needs. Significant schema decisions should be documented in ADRs.
