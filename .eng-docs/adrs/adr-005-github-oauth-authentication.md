# ADR 005: GitHub OAuth authentication

## Status

Accepted

## Context

Episteme integrates deeply with GitHub for:
- Creating branches and pull requests
- Creating and managing GitHub discussions (comments on documents)
- Accessing repository content
- User identity in collaboration features
- Approval workflows

Since GitHub is central to the application's workflow, we need authentication that:
- Provides access to GitHub APIs
- Identifies users for collaboration features
- Handles token storage securely
- Works in a desktop application context

The application stores documents in git repositories and manages the full review/approval workflow through GitHub's infrastructure (branches, PRs, discussions).

Key constraints:
- Must provide GitHub API access
- Must work in Tauri desktop app
- Must store tokens securely (OS keychain)
- Should be straightforward to implement

## Decision

We will use GitHub OAuth for authentication.

GitHub OAuth is the natural choice given the application's deep integration with GitHub's infrastructure. Users authenticate with their GitHub account, granting Episteme access to repository operations, PR management, and discussion creation. Tokens are stored securely in the OS keychain, and user identity is consistent across all collaboration features.

## Consequences

**Positive:**
- Direct access to GitHub APIs with proper scopes
- User identity matches GitHub identity (consistent across git, PRs, discussions)
- OAuth tokens provide fine-grained permission control
- Secure token storage via OS keychain
- No need to manage separate user database
- Users already have GitHub accounts (required for git workflow)

**Negative:**
- Requires GitHub account (not an issue given git requirement)
- OAuth flow adds initial setup complexity
- Token refresh and expiration must be handled

## Alternatives considered

**No viable alternatives:** Given that Episteme's core workflow depends on GitHub (branches, PRs, discussions, repository access), GitHub authentication is the only logical choice. Alternative authentication providers would still require GitHub tokens, adding unnecessary complexity without benefits.
