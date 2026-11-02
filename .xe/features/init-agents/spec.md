---
id: init-agents
title: Init Agent Rules
description: Seeds a single agent-rules standard and syncs it into each AI provider's most reliably loaded instruction file.
dependencies:
  - ai-provider
  - context-storage
  - engineering-context
  - playbook-yaml
---

<!-- markdownlint-disable single-title -->

# Feature: Init Agent Rules

## Purpose

Give every AI coding agent working in a Catalyst project the project's agent rules in context on every turn, from one source the team owns and edits. Owns the seeding of that source and its propagation into per-provider instruction files; does not author the rules' content domain, and does not govern instructions scoped to a subset of files.

## Scenarios

### FR:rules: Agent Rules Standard

**Project Maintainer** needs one editable file holding the rules every AI agent must follow so that the rules are maintained once instead of per AI tool.

- **FR:rules.@file** (P1): Interface: `.xe/standards/agent-rules.md`
- **FR:rules.@template** (P1): Interface: `src/resources/templates/standards/agent-rules.md`
  > - @req FR:context-storage/templates.framework
- **FR:rules.input** (P2):
  - Project name (string) — substituted into the seeded content
- **FR:rules.seed** (P1): Playbook MUST write the file from its bundled template when the file is absent
- **FR:rules.preserve** (P1): Playbook MUST leave an existing file unchanged
  - The file is project-owned: it lives in the repository so every AI tool can load it, and is never overwritten, versioned, or sectioned by Catalyst
- **FR:rules.content** (P1): Template MUST state the Catalyst spec-driven workflow
  - **FR:rules.content.layout** (P2): Template MUST name `.xe/` as the source of truth for intent, locating product vision, features, blueprint, feature specs, rollouts, architecture, and engineering principles
  - **FR:rules.content.spec-first** (P1): Template MUST forbid changing feature code without first reading and updating its spec
  - **FR:rules.content.drift** (P2): Template MUST state that spec-to-code drift is a defect
  - **FR:rules.content.routing** (P2): Template MUST route new features to `/catalyst:create`, feature changes to `/catalyst:change`, bugs to `/catalyst:fix`, and research to `/catalyst:explore`
  - **FR:rules.content.traceability** (P2): Template MUST state that every workflow ends with `npx catalyst traceability {feature-id}`
  - **FR:rules.content.edit-target** (P1): Template MUST direct agents to update `.xe/` specs rather than the generated instruction files
  - **FR:rules.content.principles** (P2): Template MUST list the engineering principles by name in a single line and point to `.xe/engineering.md` for their definitions
    > - @req FR:engineering-context/eng.principles
  - **FR:rules.content.no-restatement** (P1): Template MUST NOT restate principle bodies, FR text, or any other content that `.xe/` already owns

### FR:sync: Instruction File Sync

**Developer** needs the agent rules placed in the file each of their AI tools actually loads so that the rules apply without per-tool setup.

- **FR:sync.@playbook** (P1): Interface: `src/resources/playbooks/install-agent-rules.yaml`
  > - @req FR:playbook-yaml/structure
- **FR:sync.input** (P2):
  - Project root (string) — directory in the consumer's project where instruction files are written
- **FR:sync.source** (P1): Playbook MUST read instruction content from the agent rules standard
  > - @req FR:rules.@file
- **FR:sync.discovery** (P1): Playbook MUST iterate every provider declaring an instruction-file configuration
  > - @req FR:ai-provider/provider.instructions
  - **FR:sync.discovery.no-detection** (P2): Playbook MUST NOT detect which AI tools are installed; the provider catalog is the only source of the target list
    > - @req FR:ai-provider/catalog.discovery
  - **FR:sync.discovery.criterion** (P1): Provider MUST name in its instruction-file configuration the file its platform loads with the highest precedence and the fewest preconditions
  - **FR:sync.discovery.baseline-insufficient** (P1): Provider MUST NOT rely on `AGENTS.md` alone when its platform reads it at lower precedence than a platform-specific file, or only under non-default configuration
  - **FR:sync.discovery.platform-surface** (P2): Provider MUST declare an instruction-file configuration when its platform reads a repository instruction file; being headless-only within Catalyst does not by itself remove a platform surface
  - **FR:sync.discovery.no-surface** (P3): Provider MUST NOT declare an instruction-file configuration when its platform reads no repository instruction file
- **FR:sync.no-symlink** (P2): Playbook MUST NOT create symlinks between instruction files; symlinks fail on Windows without developer mode and in some archive or CI checkouts, and Copilot and Gemini need their own files regardless
- **FR:sync.baseline** (P1): Playbook MUST write `AGENTS.md` at the project root for every project, independent of which providers are configured
- **FR:sync.mode** (P1): Playbook MUST place content in each target file according to the provider's configured mode
  - **FR:sync.mode.inline** (P1): Playbook MUST write the full agent rules into the target file's managed block when the mode is `inline`
  - **FR:sync.mode.import** (P2): Playbook MUST write only an import reference to the configured import target into the target file's managed block when the mode is `import`, rather than duplicated content
- **FR:sync.managed-block** (P1): Playbook MUST confine its writes to a delimited block and preserve all content outside it
  - **FR:sync.managed-block.markers** (P2): Playbook MUST delimit the block with HTML comments so the markers do not render
  - **FR:sync.managed-block.append** (P2): Playbook MUST append the block when no markers are present
  - **FR:sync.managed-block.replace** (P2): Playbook MUST replace content between existing markers
  - **FR:sync.managed-block.guard** (P1): Playbook MUST detect that the block body was edited after Catalyst wrote it, and warn rather than overwrite
- **FR:sync.idempotent** (P1): Playbook MUST make no write when every target file already holds the current content
- **FR:sync.output** (P2): Output:
  - Written paths (string) — one per instruction file created or updated
  - Skipped paths (string) — one per file left unchanged, with reason

### Non-functional Requirements

**NFR:cost**: Context Cost

Instruction files load on every request, so their size is paid continuously and competes with task content for attention.

- **NFR:cost.seed** (P1): Seeded template content MUST NOT exceed 1,200 characters
- **NFR:cost.ceiling** (P2): Playbook MUST warn when the agent rules standard exceeds 4,000 characters
- **NFR:cost.measure** (P3): Size limits MUST be measured in characters rather than lines

## Data Model

None

## Architecture Constraints

None

## External Dependencies

None
