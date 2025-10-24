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
> Outline the directory structure in code block format. Focus on logical organization for source, deployed, and generated content. Ensure it supports the source/deployed separation.

```text
# {structure-description}

{root-level-files}/
├── {dir1}/
│   ├── {subdirs}
├── {dir2}/
│   └── {subdirs}
└── {additional-dirs}
```

## Engineering Patterns

> [INSTRUCTIONS]
> List 3-10 key patterns or approaches used, such as scripting languages, automation triggers, or integration methods. Keep high-level and principle-based.
