# Catalyst Standards

Standards for Catalyst framework development.

## Requirements Traceability Conventions

When working with requirements (`@req` annotations) in this codebase:

### Requirement ID Stability

**CRITICAL**: Requirement IDs MUST remain stable and immutable once assigned.

- **NEVER** change, rename, or reassign existing requirement IDs
- When updating a requirement's text or description, keep the original ID
- When refactoring or reorganizing specs, preserve all existing IDs
- If a requirement becomes obsolete, mark it as `[deprecated: FR:new.id]` rather than deleting
- Deleted requirement IDs MUST NOT be reused for new requirements

This ensures traceability links remain valid across the codebase history.

### Annotation Placement

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

## Templates

Markdown templates for generating consistent documentation:

- Token-optimized: Only include content AI needs for decisions (no bloat, no history, no explanations of what's not included)
- Use `{placeholder-name}` (kebab-case) for project-specific values in templates
  - Example: `{project-name}`, `{product-manager}`
  - Do NOT use placeholders in instructions that will not be in final output
- Use `> [INSTRUCTIONS]` prefix for AI/human guidance
  - Provide clear, actionable guidance on what to document
  - Do NOT use placeholders in instructions that will not be in final output
  - Removable after instantiation
- Standard markdown syntax with clear heading hierarchy (H1 title, H2 sections, H3 subsections)

Example:

```markdown
## System Overview

> [INSTRUCTIONS]
> 2-3 sentence overview of {project-name}: core value proposition and user benefits.
```
