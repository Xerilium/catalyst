# System Architecture for Catalyst

## Overview

Catalyst's technology choices, structure, and integration patterns. Each feature spec in `.xe/features` carries its own requirements.

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

TypeScript in `src/` compiles to `dist/` and publishes to npm. When a consumer installs the package, a postinstall script copies the AI agent files (`.claude/commands/`, `.github/prompts/`) into their repo. Agent files then sit next to consumer code; framework code stays in `node_modules`.

### AI Platform Command Wrapper Architecture

AI platforms (Claude Code, GitHub Copilot) run Catalyst through slash commands that wrap playbooks. Each command is a markdown file in a platform directory (`.claude/commands/catalyst/`, `.github/prompts/`) that names the playbook to run. The layers: AI platform → command wrapper → playbook engine → template system. Playbooks never name a platform; the command wrapper holds everything platform-specific. To add a platform, write new command wrappers and leave the playbooks alone.

### File-Based Context Architecture

Project state lives in markdown files under `.xe/`. Git versions them, people read them, and AI loads them without parsing anything. Context nests two levels: project (product.md, engineering.md, architecture.md) and feature (features/{feature-id}/\*). Everything works offline and depends on nothing outside the repo.

### Kitchen-Sink Validation Pattern

The kitchen-sink playbook (`src/resources/cli-commands/kitchen-sink.yaml`) is both the demo and the end-to-end test for the playbook engine. It runs every registered action type inside one narrative. Add or change an action and you MUST add it to the kitchen-sink; `tests/e2e/kitchen-sink.test.ts` fails when an action in the catalog has no demonstration. Running the actions together catches what unit tests miss: broken dispatch, template resolution regressions, and state leaking between actions. The `playbook-demo` spec holds the requirements.

### Playbook Documentation Architecture

The playbook-documentation feature holds the public docs for every playbook action. Keeping them in one place stops the same text appearing in several action features, keeps the dependency graph acyclic, and gives playbook authors one thing to read. Internal design notes stay in each feature's own `architecture.md`. The playbook-documentation spec covers the rest.

### Markdown Validation and Traceability

Markdown specs (templates, action files, standards) carry rules that AI applies while it runs. A rule about how AI behaves has no artifact to inspect, so the test checks that the rule appears in the markdown file that enforces it. Put each rule in the fewest files that need it. Tests use `toMatch` against file content and fail when the rule goes missing. Two kinds of check, two targets: mechanical rules (heading present, format compliance) test the artifact; behavioral rules (how AI writes or reads at a workflow stage) test the markdown file that loads at that stage.

### Prefer Active Execution Over Implicit Reference

Do not point at rules for later use when you can make the agent run them now. Agents skip "Follow @standards/{topic}.md". Write "Execute @actions/{action}.md to {intent}" instead. `Execute @action.md` forces a read, so the rules land in working memory at the moment they apply. The trailing `to {intent}` makes the agent state what it wants before it composes the call. Together they close the recall gap that sinks passive standards.

This is a call-site convention, not a file type. The invoked file is an ordinary action with inputs, side effects, and outputs. Only the calling pattern differs, and it buys rule adherence for the cost of one extra Read.

Multi-line input uses `Execute @actions/{file}.md to {intent}:` with an indented list under it; the indentation marks where the input ends. If agents start missing that boundary, switch to explicit delimiters: `Execute @actions/{file}.md to {intent}, with: {{ {multi-line-payload} }}`. Use the single-line form whenever the intent fits on one line.

Use this when many call sites share a convention and citing a standard has already failed to make agents follow it.
