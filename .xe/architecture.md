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
├── scripts/                 # Build-time scripts (code generation, validation)
├── src/
│   ├── ai/                  # AI provider abstraction
│   │   └── providers/       # Provider implementations (Claude, Gemini, etc.)
│   ├── core/                # Shared core utilities (errors)
│   ├── playbooks/           # Playbook engine
│   │   ├── actions/         # Action implementations
│   │   ├── engine/          # Engine runtime
│   │   ├── registry/        # Action/playbook catalogs
│   │   └── types/           # Type definitions
│   ├── resources/           # Static resources (deployed)
│   │   ├── ai-config/       # AI command templates (provider config is in ai/providers/)
│   │   ├── playbooks/       # YAML playbook definitions
│   │   └── templates/       # Markdown templates
│   ├── setup/               # Postinstall scripts
│   └── traceability/        # Requirement traceability engine
└── tests/                   # Jest test suites (unit and integration)
```

## Technical Architecture Patterns

### Build and Distribution Pipeline

Catalyst uses a TypeScript build pipeline with source/deployed separation. Source code in `src/` is compiled to `dist/` and published to npm. Consumer projects install the package, triggering a postinstall script that copies AI agent integration files (`.claude/commands/`, `.github/prompts/`) to the consumer's repo. This allows agent-specific files to live alongside consumer code while maintaining a clean separation between framework code and integration points.

### AI Platform Command Wrapper Architecture

AI platforms (Claude Code, GitHub Copilot) invoke Catalyst via slash commands that wrap playbook execution. Commands are markdown files in platform-specific directories (`.claude/commands/catalyst/`, `.github/prompts/`) that reference playbooks by name. This creates a layered architecture: AI platform → command wrapper → playbook engine → template system. The abstraction allows playbooks to remain AI-agnostic while commands provide platform-specific invocation patterns. Future platforms can integrate by adding new command wrappers without modifying playbook logic.

### File-Based Context Architecture

All project state lives in markdown files within `.xe/` directory rather than databases or config files. This architecture enables git-based versioning, human readability, and AI-native consumption without serialization overhead. Context files are hierarchical: project-level (product.md, engineering.md, architecture.md) and feature-level (features/{feature-id}/\*). The file-based approach supports offline-first development and eliminates external dependencies for context management.

### Kitchen-Sink Validation Pattern

The kitchen-sink playbook (`src/resources/cli-commands/kitchen-sink.yaml`) serves as both a comprehensive demo and an end-to-end integration test for the playbook engine. It exercises every registered action type, demonstrating real-world usage patterns with an entertaining narrative. When adding or modifying playbook actions, the kitchen-sink MUST be updated to include a demonstration of the new or changed behavior, and the E2E test (`tests/e2e/kitchen-sink.test.ts`) enforces that every action in the catalog is represented. This pattern catches integration issues that unit tests miss — broken action dispatch, template resolution regressions, and cross-action state leaks. See the `playbook-demo` feature spec for requirements.

### Playbook Documentation Architecture

Public documentation for playbook actions is aggregated in a dedicated playbook-documentation feature rather than distributed across individual action features. This approach avoids documentation duplication, prevents circular dependencies, and provides a unified learning path for playbook authors. Internal architecture documentation remains in feature-specific `architecture.md` files. See the playbook-documentation feature specification for comprehensive action documentation strategy.

### Markdown Validation and Traceability

Markdown specs (templates, action files, standards) carry rules that AI applies at execution time. When a rule governs runtime AI behavior rather than static artifact structure, the test verifies the rule is documented in the markdown file that enforces it. Authors map each rule to the minimum set of files that need it — not every rule belongs in every file. Tests assert presence with `toMatch` against the file content; absence is the failure mode the test guards against. This complements direct artifact validation: mechanical rules (heading present, format compliance) test the artifact; behavioral rules (how AI writes/reads at a workflow stage) test the markdown file that loads at that stage.

### Prefer Active Execution Over Implicit Reference

Avoid referencing rules to be applied later (standards/conventions) when direct execution is possible. "Follow @standards/{topic}.md" has been observed to fall short. Replace with active invocation: "Execute @actions/{action}.md to {intent}". The `Execute @action.md` directive forces a read, loading the rules into working memory at the moment of action. The trailing `to {intent}` clause forces the agent to articulate intent before composing the call. Together these collapse the recall gap that defeats passive standards.

This is a call-site convention, not a file type. The invoked file is a normal action — it has inputs, side effects, and outputs like any other action. What's distinctive is the calling pattern, which trades a small token cost (the explicit Read) for higher rule adherence.

For multi-line input, the current convention is `Execute @actions/{file}.md to {intent}:` followed by an indented list — markdown structure carries the input boundary. If indentation cues prove insufficient, escalate to explicit delimiters: `Execute @actions/{file}.md to {intent}, with: {{ {multi-line-payload} }}`. The single-line form is preferred when intent fits.

Use when: a convention is invoked from many sites, and passive standards-citation has been observed to fail.
