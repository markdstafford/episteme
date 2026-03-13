---
created: 2026-03-13
last_updated: 2026-03-13
status: accepted
decided_by: markdstafford
superseded_by: null
---

# ADR 011: git-cliff for automated changelog generation

## Status

Accepted

## Context

The releases and auto-update feature requires generating release notes automatically from commit history when a version tag is pushed. Three tools were evaluated:

**Option A: git-cliff** — a Rust-based changelog generator that parses conventional commits and produces structured changelogs. Highly configurable via a `cliff.toml` file. Integrates directly into GitHub Actions.

**Option B: release-please** — Google's release automation tool. Creates a PR to bump versions and draft release notes; the release publishes when the PR merges. More opinionated: it owns the version bump and release creation steps, not just the changelog.

**Option C: semantic-release** — fully automated release tool originating in the Node.js/npm ecosystem. Analyzes commits, determines the version bump, generates notes, and publishes — no manual tagging. Designed primarily for npm package publishing.

## Decision

We will use git-cliff (Option A).

git-cliff is the natural fit for a Tauri desktop app. It is written in Rust, actively maintained within the same ecosystem, and does one thing well: generating a changelog from conventional commits. It slots cleanly into the existing release workflow (tag → build → publish) without taking ownership of the version bump or release creation steps, which remain intentional manual actions by the maintainer.

release-please (Option B) inverts the workflow — it drives the release via PR rather than tag. This conflicts with the chosen strategy of the maintainer controlling release timing via a manual tag push.

semantic-release (Option C) is dominant in the npm publishing space and carries strong assumptions about that workflow (automated version bumps, npm publish). It is not the right fit for a native desktop app distribution pipeline.

## Consequences

**Positive:**
- Changelog generation is a single, composable step in the Actions workflow
- Maintainer retains full control of version bumping and release timing
- Conventional commit messages (already a project convention) are the only input required
- Configurable output format via `cliff.toml` — can tailor sections, groupings, and style

**Negative:**
- Requires conventional commit discipline — poorly formatted commit messages produce poor changelogs
- Maintainer must edit generated notes manually if commit messages don't tell the full story (this is by design and noted in the non-goals)
