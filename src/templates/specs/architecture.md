# System Architecture for {project-name}

> [INSTRUCTIONS]
> Define technical architecture: technology choices, structure, and integration patterns. Feature-specific details go in individual specs.

## Overview

For engineering principles and standards, see [`.xe/engineering.md`](engineering.md).

For the development process, see [`.xe/process/development.md`](process/development.md).

## Technology Stack

### Runtime Technologies

> [INSTRUCTIONS]
> Technologies that ship to production (deployment footprint). Delete unused rows.

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
| Security                   | {security}               |

### Development Technologies

> [INSTRUCTIONS]
> Build-time tools (testing, linting, bundling). Delete unused rows.

| Aspect             | Details              |
| ------------------ | -------------------- |
| AI Coding          | {ai-coding}          |
| Dev Env            | {dev-env}            |
| Test Framework     | {test-framework}     |
| DevOps Automation  | {devops-automation}  |
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
> Document key TECHNICAL decisions affecting feature implementation. Describe in 1-5 sentences. Delete section if no significant patterns exist.

### Dependency Abstraction Pattern

Isolate external dependencies (APIs, CLIs, databases) behind abstraction layers for testability, swappability, and consistent error handling.
