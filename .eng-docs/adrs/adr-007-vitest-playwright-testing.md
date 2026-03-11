---
created: 2026-03-04
last_updated: 2026-03-04
status: accepted
decided_by: markdstafford
superseded_by: null
---

# ADR 007: Vitest and Playwright testing strategy

## Status

Accepted

## Context

Episteme needs comprehensive testing for:
- React components (document list, editor, AI chat panel)
- Rust backend functions (file operations, git CLI calls)
- State management (Zustand stores)
- TipTap editor integration
- End-to-end workflows (authoring, review, approval)

We need frameworks that:
- Work well with our stack (React, TypeScript, Tauri, Rust)
- Support both unit/integration and E2E testing
- Integrate with GitHub Actions CI/CD
- Work well with AI code generation
- Provide fast feedback during development

Key constraints:
- Must test React + TypeScript frontend
- Must test Rust backend
- Should support Tauri desktop app E2E testing
- Should be fast and reliable
- Should work well with AI-generated tests

## Decision

We will use Vitest for unit/integration tests and Playwright for E2E tests.

**Vitest** is the optimal choice for unit and integration testing with 36M weekly downloads and strong growth momentum. Its native Vite integration provides fast test execution and excellent TypeScript support, making it ideal for our React + TypeScript frontend. The Jest-compatible API ensures familiar patterns for AI code generation.

**Playwright** is the clear leader for E2E testing with 32.9M weekly downloads (4.6x more than Cypress). Its excellent Tauri support, fast execution, and modern developer experience make it perfect for desktop app testing. For a Tauri application, Playwright is the obvious choice.

## Consequences

**Positive:**
- Vitest's Vite integration provides fast test execution and watch mode
- Playwright's Tauri support enables proper desktop app E2E testing
- Both work excellently with TypeScript
- Jest-compatible API (Vitest) means familiar patterns for AI
- Fast feedback loops improve development velocity
- Strong growth momentum ensures long-term support
- GitHub Actions integration is straightforward

**Negative:**
- Vitest has smaller ecosystem than Jest (though growing rapidly)
- Playwright is younger than Cypress (though clearly winning adoption)
- May need to reference fewer examples than mature alternatives

## Alternatives considered

**Unit/Integration Testing:**

**Option 1: Jest**

Most popular JavaScript testing framework. 42M weekly downloads, stable and mature.

**Pros:**
- Most mature and widely used
- Huge ecosystem and examples
- AI knows Jest very well
- Comprehensive features

**Cons:**
- Slower than Vitest
- ESM support is clunky
- More configuration needed
- Less optimized for Vite
- Stable but not growing

**Why not chosen:** While Jest is mature, Vitest's native Vite integration provides significantly faster test execution and better developer experience for our Vite-based build. With 36M downloads and strong growth, Vitest is the modern choice for new Vite projects.

---

**E2E Testing:**

**Option 1: Cypress**

Popular E2E testing framework. 7.1M weekly downloads, stable but being outpaced.

**Pros:**
- Mature ecosystem
- Good documentation
- AI knows Cypress well

**Cons:**
- Primarily web-focused (limited Tauri support)
- Slower than Playwright
- Being significantly outpaced in adoption (7.1M vs 32.9M)

**Why not chosen:** Playwright's superior Tauri support is critical for desktop app testing. With 4.6x more downloads and better performance, Playwright is the clear choice for modern desktop app E2E testing.
