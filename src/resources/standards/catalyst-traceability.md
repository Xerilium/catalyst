# Traceability Conventions

Conventions for AI agents working with requirements traceability (`@req` annotations) in Catalyst projects.

## Requirement ID Stability

**CRITICAL**: Requirement IDs MUST remain stable and immutable once assigned.

- **NEVER** change, rename, or reassign existing requirement IDs
- When updating a requirement's text or description, keep the original ID
- When refactoring or reorganizing specs, preserve all existing IDs
- If a requirement becomes obsolete, deprecate it: `~~**FR:old.id**~~: [deprecated: FR:new.id]`
- Deleted requirement IDs MUST NOT be reused for new requirements
- When deprecating FR IDs, search for and update all `@req FR:{feature-id}/{old-id}` references across specs, tests, and code

This ensures traceability links remain valid across the codebase history.

## Annotation Placement

**CRITICAL**: Place `@req` annotations on the smallest construct that verifies or implements the requirement.

- **DO** reference the most specific requirement that applies (prefer leaf nodes over parent groupings)
- **DO NOT** place annotations at the top of files without function context (file-level cop-out)
- **DO NOT** use a single annotation to cover an entire file's contents

### Code

- Place on functions, methods, classes, or interfaces that implement the requirement

```typescript
/**
 * Validates session tokens.
 * @req FR:auth/session.validation.token-format
 */
function validateToken(token: string): boolean { ... }
```

### Tests

- Place on individual test cases (the smallest runnable unit), not on groups or suites
- A test case is the construct that runs a single assertion: `it()`, `test()`, `#[test]`, `def test_*`, etc.
- Groups (`describe()`, `mod tests`, `class TestFoo`) are organizational — they don't verify requirements

```typescript
// @req FR:auth/session.validation.token-format
it('should reject expired tokens', () => { ... });
```

## Dependency Link Semantics

Spec files use `@req` references in blockquotes to declare cross-feature dependencies:

```markdown
- **FR:my.requirement** (P2): Description
  > - @req FR:other-feature/their.requirement
```

These are **dependency declarations**, not implementation annotations:

- They declare that one requirement depends on another feature's requirement
- They do **NOT** count toward code or test coverage metrics
- They should **NOT** be flagged as misplaced annotations
- The dependency scanner (`catalyst deps`) processes these separately from the traceability scanner
