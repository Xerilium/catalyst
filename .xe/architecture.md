# System Architecture for Catalyst

## Overview

Defines the technical architecture for Catalyst: technology choices, structure, and integration patterns. Feature-specific requirements are documented in individual feature specifications in the `.xe/features` folder.

For engineering principles and standards, see [`.xe/engineering.md`](engineering.md).

For the development process, see [`.xe/process/development.md`](process/development.md).

## Technology Stack

### Runtime Technologies

| Aspect           | Details                                            |
| ---------------- | -------------------------------------------------- |
| Runtime Env      | Node.js                                            |
| Data & Analytics | Markdown files for context, JSON for configuration |

### Development Technologies

| Aspect            | Details                     |
| ----------------- | --------------------------- |
| Languages         | TypeScript                  |
| Dev Env           | GitHub, VS Code             |
| AI Coding         | Claude Code, GitHub Copilot |
| Test Framework    | Jest with ts-jest           |
| DevOps Automation | NPM scripts, GitHub Actions |
| Distribution      | NPM                         |

## Repository Structure

```text
# Source/deployed separation with npm package distribution

catalyst/
├── .claude/                 # Claude Code integration (slash commands)
├── .github/                 # GitHub integration (CI/CD workflows, Copilot prompts)
├── .xe/                     # Project context
│   ├── features/            # Feature specifications
│   ├── rollouts/            # Active rollout orchestration plans
│   └── process/             # Development workflow docs
├── docs/                    # GitHub Pages for end user docs
├── docs-wiki/               # Project wiki for internal docs (flat list of md files)
├── src/
│   ├── integrations/        # AI platform integration (Claude Code, GitHub Copilot)
│   ├── playbooks/           # Workflow definitions
│   │   └── scripts/         # Node scripts for playbook automation
│   └── templates/           # Markdown templates for issues and docs
└── tests/                   # Jest test suites (unit and integration)
```

## Technical Architecture Patterns

### Build and Distribution Pipeline

Catalyst uses a TypeScript build pipeline with source/deployed separation. Source code in `src/` is compiled to `dist/` and published to npm. Consumer projects install the package, triggering a postinstall script that copies AI agent integration files (`.claude/commands/`, `.github/prompts/`) to the consumer's repo. This allows agent-specific files to live alongside consumer code while maintaining a clean separation between framework code and integration points.

### AI Platform Command Wrapper Architecture

AI platforms (Claude Code, GitHub Copilot) invoke Catalyst via slash commands that wrap playbook execution. Commands are markdown files in platform-specific directories (`.claude/commands/catalyst/`, `.github/prompts/`) that reference playbooks by name. This creates a layered architecture: AI platform → command wrapper → playbook engine → template system. The abstraction allows playbooks to remain AI-agnostic while commands provide platform-specific invocation patterns. Future platforms can integrate by adding new command wrappers without modifying playbook logic.

### File-Based Context Architecture

All project state lives in markdown files within `.xe/` directory rather than databases or config files. This architecture enables git-based versioning, human readability, and AI-native consumption without serialization overhead. Context files are hierarchical: project-level (product.md, engineering.md, architecture.md) and feature-level (features/{feature-id}/\*). The file-based approach supports offline-first development and eliminates external dependencies for context management.

### Playbook Documentation Architecture

Public documentation for playbook actions is aggregated in a dedicated playbook-documentation feature rather than distributed across individual action features. This approach avoids documentation duplication, prevents circular dependencies, and provides a unified learning path for playbook authors. Internal architecture documentation remains in feature-specific `architecture.md` files. See the playbook-documentation feature specification for comprehensive action documentation strategy.
