# System Architecture for {project-name}

> [INSTRUCTIONS]
> This document defines the technical architecture for {project-name}: technology choices, structure, and integration patterns. Base decisions on enterprise best practices for scalability, security, and maintainability. Feature-specific details go in individual specs. Keep concise—focus on high-level decisions that guide implementation. Remove all instruction blocks after completion.

## Overview

This document defines the technical architecture for the {project-name} project: technology choices, structure, and integration patterns. Feature-specific requirements are documented in individual feature specifications in the `.xe/specs` folder.

For engineering principles and standards, see [`.xe/engineering.md`](engineering.md).

For the development process, see [`.xe/process/development.md`](process/development.md).

## Technology Stack

> [INSTRUCTIONS]
> Define the core technologies in a table format. Focus on essential aspects that support enterprise-scale development: runtime, data handling, automation, AI integration, quality assurance, and deployment. Adapt aspects as needed for unique requirements, but keep to 5-10 rows to maintain conciseness.

| Aspect              | Details        |
| ------------------- | -------------- |
| Runtime Environment | {runtime-env}  |
| Data Storage        | {data-storage} |
| Automation Tools    | {automation}   |
| AI Integration      | {ai-tools}     |
| Testing Framework   | {testing}      |
| Deployment Method   | {deployment}   |
| Security Measures   | {security}     |
| Monitoring/Logging  | {monitoring}   |

## Repository Structure

> [INSTRUCTIONS]
> Show directory structure with enough depth to reveal WHERE developers add different types of components. Go as deep as needed to show logical boundaries (e.g., `src/components/` vs `src/services/`). Include 1-line comment to describe purpose. Stop at the boundary where feature-specific code begins.
>
> **Balance:** Show organization without listing every file. Focus on "where do I put X type of code?"

```text
# Brief description of the organization strategy (e.g., "feature-based modules", "layered architecture")

{root}/
├── {dir}/
│   ├── {subdir}/  # Where X type of code goes
│   └── {subdir}/  # Where Y type of code goes
└── {dir}/         # Different concern
```

## Technical Architecture Patterns

> [INSTRUCTIONS]
> Document any key, unique TECHNICAL decisions that affect how features are built. Focus on architecture (how systems connect, how code is organized/executed, technical constraints). Avoid duplicating requirements, principles, or processes.
>
> Describe in 1-5 sentences. Delete section if no significant architectural patterns exist.
