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
| Distribution      | NPM, AI agent plugins       |

## Repository Structure

```text
# Source/deployed separation with npm package distribution

catalyst/
├── .claude/                 # Claude Code settings; self-hosted plugin (skills/catalyst/, generated)
├── .github/                 # GitHub integration (CI/CD workflows, Copilot prompts)
├── .xe/                     # Project context
│   ├── features/            # Feature specifications
│   ├── rollouts/            # Active rollout orchestration plans
│   └── process/             # Development workflow docs
├── docs/                    # GitHub Pages for end user docs
├── docs-wiki/               # Project wiki for internal docs (flat list of md files)
├── scripts/                 # Build-time scripts (code generation, validation)
├── src/
│   ├── ai/                  # AI provider abstraction and plugin bootstrap
│   │   ├── plugin/          # Bootstrap that ships in the npm package; the plugin hook and skills run it (Node.js built-ins only)
│   │   └── providers/       # Provider implementations (Claude, Gemini, etc.)
│   ├── core/                # Shared core utilities (errors)
│   ├── playbooks/           # Playbook engine
│   │   ├── actions/         # Action implementations
│   │   ├── engine/          # Engine runtime
│   │   ├── registry/        # Action/playbook catalogs
│   │   └── types/           # Type definitions
│   ├── resources/           # Static resources (deployed)
│   │   ├── ai-plugin/       # Skill templates (all platforms) and Claude-only hooks (claude-hooks/)
│   │   ├── playbooks/       # YAML playbook definitions
│   │   └── templates/       # Markdown templates
│   └── traceability/        # Requirement traceability engine
└── tests/                   # Jest test suites (unit and integration)
```

## Technical Architecture Patterns

### Build and Distribution Pipeline

Catalyst uses a TypeScript build pipeline with source/deployed separation. Source code in `src/` is compiled to `dist/` and published to npm. The build also generates the AI plugin into the package: a Claude Code plugin at the package root and an Agent Plugins 1.0 package at `agent-plugin/`. Consumer projects pin the npm package in their own `package.json`; each developer installs the plugin once in their AI tool.

### AI Plugin Architecture

AI platforms invoke Catalyst through plugin skills that wrap playbook execution. Each skill is generated from a template in `src/resources/ai-plugin/skills/` and points at a playbook in the project's `node_modules/@xerilium/catalyst/`, so workflow behavior follows the repo-pinned package version, not the plugin version. This creates a layered architecture: AI platform → plugin skill → playbook → playbook engine → template system. The plugin and the CLI ship as two npm packages — `@xerilium/catalyst-plugin`, which the Claude Code marketplace sources and which declares no `bin`, and `@xerilium/catalyst`, which keeps its `bin` for `npx catalyst` — and the plugin declares the minimum CLI version its skills need. A zero-dependency bootstrap, run from the first line of each skill and available as the `catalyst-bootstrap` binary, installs the package with the project's package manager when it's missing and fails loudly when the installed version is too old. New platforms integrate by adopting the Agent Plugins standard without playbook changes.

Plugin layout (generated at build time):

- Claude Code: `.claude-plugin/plugin.json` and `skills/{name}/SKILL.md` at the package root; frontmatter limited to `name`, `description`, `argument-hint`, `allowed-tools`.
- Portable (Agent Plugins 1.0.0): `agent-plugin/plugin.json` and `agent-plugin/skills/catalyst-{name}/SKILL.md`; frontmatter limited to `name` and `description`.
- Each platform reads only its own copy; neither is copied into consumer repositories.
- Claude marketplace: `.claude-plugin/marketplace.json` in the public `xerilium/ai-plugins` repository, named `xerilium`, sourced from the npm package. `scripts/generate-plugin.ts --marketplace` generates it and the release workflow publishes it there.

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
