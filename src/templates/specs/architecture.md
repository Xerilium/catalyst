# System Architecture for {project-name}

> [INSTRUCTIONS]
> Define technical architecture: technology choices, structure, and integration patterns. Feature-specific details go in individual specs. See `.xe/engineering.md` for engineering principles and `.xe/process/development.md` for development process.

## Technology Stack

> [INSTRUCTIONS]
> Define core technologies supporting enterprise-scale development. Adapt aspects as needed, keep to 5-7 rows.

| Aspect              | Details        |
| ------------------- | -------------- |
| Runtime Environment | {runtime-env}  |
| Data Storage        | {data-storage} |
| AI Integration      | {ai-tools}     |
| Testing Framework   | {testing}      |
| Deployment Method   | {deployment}   |

## Repository Structure

> [INSTRUCTIONS]
> Show directory structure revealing WHERE to add different component types. Include 1-line comments for purpose.

```text
# Brief description of organization strategy

{root}/
├── {dir}/
│   ├── {subdir}/  # Where X type of code goes
│   └── {subdir}/  # Where Y type of code goes
└── {dir}/         # Different concern
```

## Technical Architecture Patterns

> [INSTRUCTIONS]
> Document key TECHNICAL decisions affecting feature implementation. Describe in 1-5 sentences. Delete section if no significant patterns exist.

### External Dependencies

Isolate external dependencies (APIs, CLIs, databases) behind abstraction layers for testability, swappability, and consistent error handling.
