# Contributing to Episteme

## Commit messages

Episteme uses [Conventional Commits](https://www.conventionalcommits.org/) for all commit messages. This format is used to auto-generate release notes via git-cliff when a new version is published.

### Format

```
<type>: <description>

[optional body]
```

### Types

| Type | Appears in release notes? | When to use |
|---|---|---|
| `feat` | Yes — "Features" | New user-facing functionality |
| `fix` | Yes — "Bug fixes" | Bug fixes |
| `chore` | No | Maintenance, dependency updates |
| `refactor` | No | Code changes with no behavior change |
| `docs` | No | Documentation only |
| `test` | No | Adding or updating tests |
| `style` | No | CSS/formatting changes only |
| `ci` | No | CI/CD changes |

Breaking changes: append `!` after the type (e.g. `feat!:`) — these appear at the top of release notes under "Breaking changes".

### Examples

```
feat: add update notification to sidebar
fix: prevent duplicate intervals in App.tsx
chore: bump tauri to 2.10.1
feat!: remove legacy file format support
```

### Why this matters

`feat` and `fix` commits are what users see in release notes. Write them as if the user is reading them directly — short, clear, in plain language.
