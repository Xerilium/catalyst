# Traceability Conventions

Conventions for AI agents working with requirements traceability (`@req` annotations) in Catalyst projects.

## Requirement ID Stability

**CRITICAL**: Requirement IDs MUST remain stable and immutable once assigned.

- **NEVER** change, rename, or reassign existing requirement IDs
- When updating a requirement's text or description, keep the original ID
- When refactoring or reorganizing specs, preserve all existing IDs
- If a requirement becomes obsolete, mark it as `[deprecated: FR:new.id]` rather than deleting
- Deleted requirement IDs MUST NOT be reused for new requirements

This ensures traceability links remain valid across the codebase history.

## Annotation Placement

**CRITICAL**: Place `@req` annotations on specific code constructs, not at file level.

- **DO** place annotations on functions, methods, classes, or interfaces that implement the requirement
- **DO** reference the most specific requirement that applies (prefer leaf nodes over parent groupings)
- **DO NOT** place annotations at the top of files without function context (file-level cop-out)
- **DO NOT** use a single annotation to cover an entire file's contents

Good example:

```typescript
/**
 * Validates session tokens.
 * @req FR:auth/session.validation.token-format
 */
function validateToken(token: string): boolean { ... }
```

Bad example (file-level cop-out):

```typescript
/**
 * @req FR:auth/session
 * This file handles all session stuff...
 */
// ... hundreds of lines of code ...
```

## Dependency Link Semantics

Spec files use `@req` references in blockquotes to declare cross-feature dependencies:

```markdown
- **FR:my.requirement** (P2): Description
  > @req FR:other-feature/their.requirement
```

These are **dependency declarations**, not implementation annotations:

- They declare that one requirement depends on another feature's requirement
- They do **NOT** count toward code or test coverage metrics
- They should **NOT** be flagged as misplaced annotations
- The dependency scanner (`catalyst deps`) processes these separately from the traceability scanner
