# Catalyst Standards

Standards for Catalyst framework development.

## Templates

Markdown templates for generating consistent documentation:

- Token-optimized: Only include content AI needs for decisions (no bloat, no history, no explanations of what's not included)
- Use `{placeholder-name}` (kebab-case) for project-specific values in templates
  - Example: `{project-name}`, `{product-manager}`
  - Do NOT list placeholders separately in instructions or documentation (violates DRY - they're visible in the template)
- Use `> [INSTRUCTIONS]` prefix for AI/human guidance
  - Provide clear, actionable guidance on what to document
  - Do NOT use placeholders in instruction text itself
  - Removable after instantiation
- Standard markdown syntax with clear heading hierarchy (H1 title, H2 sections, H3 subsections)

Example:

```markdown
## System Overview

> [INSTRUCTIONS]
> 2-3 sentence overview of {project-name}: core value proposition and user benefits.
```
