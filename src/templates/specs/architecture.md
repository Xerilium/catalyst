# System Architecture for {project-name}

> [INSTRUCTIONS]
> Define technical architecture: technology choices, structure, and integration patterns. Feature-specific details go in individual specs.

## Overview

For engineering principles and standards, see [`.xe/engineering.md`](engineering.md).

For the development process, see [`.xe/process/development.md`](process/development.md).

## Technology Stack

> [INSTRUCTIONS]
> Define core technologies - typically 5-10 rows but adjust based on project needs.

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
