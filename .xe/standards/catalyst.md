# Catalyst Standards

Standards for Catalyst framework development.

## Templates

Markdown templates for generating consistent documentation:

- Use `{placeholder-name}` (kebab-case) for project-specific values
  - Example: `{project-name}`, `{product-manager}`
- Use `> [INSTRUCTIONS]` prefix for AI/human guidance
  - Provide clear, actionable guidance on what to document
  - Removable after instantiation
- Standard markdown syntax with clear heading hierarchy (H1 title, H2 sections, H3 subsections), concise yet comprehensive (minimize tokens)

Example:

```markdown
## System Overview

> [INSTRUCTIONS]
> 2-3 sentence overview of {project-name}: core value proposition and user benefits.
```
