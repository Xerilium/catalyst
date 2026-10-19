# System Architecture for {project-name}

## Overview

Defines the technical architecture for {project-name}: technology choices, structure, and integration patterns. Feature-specific requirements are documented in individual feature specifications in the `.xe/features` folder.

For engineering principles and standards, see [`.xe/engineering.md`](engineering.md).

For the development process, see [`.xe/process/development.md`](process/development.md).

## Technology Stack

### Runtime Technologies

> [INSTRUCTIONS]
> Services, frameworks, libraries that ship to production. Delete unused rows.

| Aspect                     | Details                  |
| -------------------------- | ------------------------ |
| Runtime Env                | {runtime-env}            |
| App Platform               | {app-platform}           |
| Integration & Orchestration| {integration}            |
| Data & Analytics           | {data-analytics}         |
| Media & Gaming             | {media-gaming}           |
| Mobile                     | {mobile}                 |
| AI/ML                      | {ai-ml}                  |
| Observability              | {observability}          |

### Development Technologies

> [INSTRUCTIONS]
> Tools, frameworks, services used during development. Delete unused rows.

| Aspect             | Details              |
| ------------------ | -------------------- |
| Languages          | {languages}          |
| Dev Env            | {dev-env}            |
| AI Coding          | {ai-coding}          |
| Test Framework     | {test-framework}     |
| DevOps Automation  | {devops-automation}  |
| Distribution       | {distribution}       |
| Observability      | {dev-observability}  |

## Repository Structure

> [INSTRUCTIONS]
> Show directory tree revealing WHERE to add different component types. Include:
> - Source code (folder for simple apps, components/layers for complex apps/monorepos)
> - Configuration
> - DevOps/automation scripts
> - Internal and external documentation
> - Inline comments explaining each folder's purpose
>
> Do NOT include: build artifacts, dependencies (node_modules, vendor), VCS directories (.git), individual files unless critical

```text
# Brief description of organization strategy

{root}/
├── {source}/      # Application source code
├── {config}/      # Configuration files
├── {scripts}/     # DevOps/automation scripts
└── {docs}/        # Documentation
```

## Technical Architecture Patterns

> [INSTRUCTIONS]
> Document a pattern only if it repeats AND must be followed to re-implement correctly and consistently. Say where each applies ("every fact table") so the repetition is visible.
> Yes: how to add a fact table. No: "Postgres runs in a container" — decided once, not a pattern.
> Put everything else where it belongs:
>
> - One-time decisions → `.xe/features/design-decisions.md`
> - Feature-specific behavior → that feature's `spec.md`
> - Deployment and environment → their own section
>
> Most projects have 1-3 patterns. Few is healthy; none is fine.

### Dependency Abstraction Pattern

Applies to every external dependency (APIs, CLIs, databases): isolate it behind an abstraction layer for testability, swappability, and consistent error handling.
