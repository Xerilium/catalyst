# System Architecture for Catalyst

## Overview

This document defines the technical architecture for the Catalyst project: technology choices, structure, and integration patterns. Feature-specific requirements are documented in individual feature specifications in the `.xe/specs` folder.

For engineering principles and standards, see [`.xe/engineering.md`](engineering.md).

For the development process, see [`.xe/process/development.md`](process/development.md).

## Technology Stack

| Aspect              | Details                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| Runtime Environment | Node.js with TypeScript for type safety and modern JavaScript features                        |
| Data Storage        | File-based storage using markdown for context and JSON for configuration                      |
| Automation Tools    | npm scripts for build and distribution, postinstall scripts for agent integration              |
| AI Integration      | Claude Code (`.claude/commands/`), GitHub Copilot (`.github/prompts/`), future extensibility  |
| Testing Framework   | Jest with ts-jest for TypeScript support, unit and integration test suites                    |
| Deployment Method   | npm package distribution (`@xerilium/catalyst`), semantic versioning                           |
| Security Measures   | Input validation in playbooks, file path sanitization, no credential storage                  |
| Monitoring/Logging  | Console output for playbook execution, structured markdown for audit trails                   |

## Repository Structure

```text
# Source/deployed separation with npm package distribution

catalyst/
├── src/          # TypeScript source (built to dist/, not published directly)
├── dist/         # Build output (published to npm)
├── .xe/          # Project context files (generated during initialization)
├── .claude/      # Claude Code integration (copied to consumers via postinstall)
├── .github/      # GitHub integration (CI/CD workflows, Copilot prompts)
└── tests/        # Jest test suites
```

## Technical Architecture Patterns

### Build and Distribution Pipeline

Catalyst uses a TypeScript build pipeline with source/deployed separation. Source code in `src/` is compiled to `dist/` and published to npm. Consumer projects install the package, triggering a postinstall script that copies AI agent integration files (`.claude/commands/`, `.github/prompts/`) to the consumer's repo. This allows agent-specific files to live alongside consumer code while maintaining a clean separation between framework code and integration points.

### AI Platform Command Wrapper Architecture

AI platforms (Claude Code, GitHub Copilot) invoke Catalyst via slash commands that wrap playbook execution. Commands are markdown files in platform-specific directories (`.claude/commands/catalyst/`, `.github/prompts/`) that reference playbooks by name. This creates a layered architecture: AI platform → command wrapper → playbook engine → template system. The abstraction allows playbooks to remain AI-agnostic while commands provide platform-specific invocation patterns. Future platforms can integrate by adding new command wrappers without modifying playbook logic.

### File-Based Context Architecture

All project state lives in markdown files within `.xe/` directory rather than databases or config files. This architecture enables git-based versioning, human readability, and AI-native consumption without serialization overhead. Context files are hierarchical: project-level (product.md, engineering.md, architecture.md) and feature-level (specs/{feature-id}/*). The file-based approach supports offline-first development and eliminates external dependencies for context management.
