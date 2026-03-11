---
created: 2026-03-04
last_updated: 2026-03-04
status: accepted
decided_by: markdstafford
superseded_by: null
---

# ADR 006: Zod validation

## Status

Accepted

## Context

Episteme needs runtime validation for:
- User settings and preferences (API keys, git config, UI preferences)
- File paths and document names (prevent path traversal)
- GitHub API responses
- AI provider API responses
- Form inputs in settings panels

TypeScript provides compile-time type checking, but we need runtime validation to ensure data from external sources (user input, APIs, file system) matches expected schemas. The validation library should:
- Work well with TypeScript
- Be straightforward for AI to generate validation schemas
- Provide clear error messages
- Be lightweight and performant

Key constraints:
- Must work with TypeScript
- Should integrate well with React forms
- Should be easy for AI to generate correct validation code
- Performance matters for desktop app

## Decision

We will use Zod for validation.

Zod is the clear choice for TypeScript projects with 102M weekly downloads and explosive growth. Its TypeScript-first design enables type inference from validation schemas, eliminating duplicate type definitions. The library works excellently with AI code generation, produces clear error messages, and integrates seamlessly with React forms. For a modern TypeScript application, Zod provides the best developer experience and safety.

## Consequences

**Positive:**
- TypeScript types automatically inferred from schemas (no duplication)
- Excellent developer experience and ergonomics
- Works perfectly with AI code generation (declarative schemas)
- Clear, actionable error messages
- Lightweight and performant
- Strong React ecosystem integration
- Growing community and extensive documentation
- Single source of truth for runtime validation and types

**Negative:**
- Younger library (6 years) compared to alternatives
- Smaller ecosystem than Ajv (though growing rapidly)

## Alternatives considered

**Option 1: Ajv**

Ajv is a JSON Schema validator. 243M weekly downloads, most downloaded but older approach.

**Pros:**
- Most established and widely used
- JSON Schema standard compliance
- Very fast performance
- Mature ecosystem

**Cons:**
- Not TypeScript-first (requires manual type definitions)
- More verbose schema definitions
- Less ergonomic for TypeScript projects
- AI generates less idiomatic code
- Older design patterns

**Why not chosen:** TypeScript-first approach is critical for this project. Zod's type inference eliminates the duplication and maintenance burden of keeping types and schemas in sync.

---

**Option 2: Yup**

Yup is a JavaScript schema validator popular with React forms. 10M weekly downloads, trailing.

**Pros:**
- Good React form integration (especially Formik)
- Familiar API for many developers
- Decent TypeScript support

**Cons:**
- Not TypeScript-first (type inference is manual)
- Slower growth than Zod
- Less ergonomic than Zod for TypeScript
- Smaller community momentum

**Why not chosen:** Zod provides superior TypeScript integration and developer experience. With 10x the downloads and stronger growth trajectory, Zod is the clear modern choice.
