# System Architecture for {project-name}

> [INSTRUCTIONS]
> Define technical architecture: technology choices, structure, and integration patterns. Feature-specific details go in individual specs.

## Overview

For engineering principles and standards, see [`.xe/engineering.md`](engineering.md).

For the development process, see [`.xe/process/development.md`](process/development.md).

## Technology Stack

### Runtime Technologies

> [INSTRUCTIONS]
> Technologies that ship to production (deployment footprint).

| Aspect                  | Details              |
| ----------------------- | -------------------- |
| Runtime Environment     | {runtime-env}        |
| Runtime Dependencies    | {runtime-deps}       |
| Data Storage            | {data-storage}       |
| AI Integration (Runtime)| {ai-runtime}         |
| Deployment Method       | {deployment}         |
| Security                | {security}           |
| Monitoring/Logging      | {monitoring}         |

### Development Technologies

> [INSTRUCTIONS]
> Build-time tools (testing, linting, bundling).

| Aspect                  | Details              |
| ----------------------- | -------------------- |
| Dev Dependencies        | {dev-deps}           |
| Automation              | {automation}         |
| AI Integration (Dev)    | {ai-dev-tools}       |
| Testing Framework       | {testing}            |

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

### Dependency Abstraction Pattern

Isolate external dependencies (APIs, CLIs, databases) behind abstraction layers for testability, swappability, and consistent error handling.
