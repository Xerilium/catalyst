---
id: init-agents
title: Init Agent Rules
description: Seeds a single agent-rules standard and syncs it into each AI provider's most reliably loaded instruction file.
dependencies:
  - ai-provider
  - cli-engine
  - engineering-context
  - playbook-actions-io
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
- **FR:rules.input** (P2):
  - Project name (string) — substituted into the seeded content
- **FR:rules.seed** (P1): Workflow MUST write the file from its bundled template when the file is absent
- **FR:rules.preserve** (P1): Workflow MUST leave an existing file unchanged
  > - @req FR:cli-init/init.idempotent
- **FR:rules.content** (P1): Template MUST state the Catalyst spec-driven workflow
  - **FR:rules.content.layout** (P2): Template MUST name `.xe/` as the source of truth for intent, locating product vision, features, blueprint, feature specs, rollouts, architecture, and engineering principles
  - **FR:rules.content.spec-first** (P1): Template MUST state that feature code MUST NOT change without reading and updating its spec first, and that spec-to-code drift is a defect
  - **FR:rules.content.routing** (P2): Template MUST route feature changes to `/catalyst:change` and bugs to `/catalyst:fix`
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
- **FR:sync.source** (P1): Workflow MUST read instruction content from the agent rules standard
  > - @req FR:init-agents/rules.@file
- **FR:sync.discovery** (P1): Workflow MUST iterate every provider declaring an instruction-file configuration
  > - @req FR:ai-provider/instructions.config
- **FR:sync.baseline** (P1): Workflow MUST write `AGENTS.md` at the project root for every project, independent of which providers are configured
- **FR:sync.managed-block** (P1): Workflow MUST confine its writes to a delimited block and preserve all content outside it
  - **FR:sync.managed-block.markers** (P2): Block MUST be delimited by HTML comments so the markers do not render
  - **FR:sync.managed-block.append** (P2): Workflow MUST append the block when no markers are present
  - **FR:sync.managed-block.replace** (P2): Workflow MUST replace content between existing markers
  - **FR:sync.managed-block.guard** (P1): Workflow MUST detect that the block body was edited after Catalyst wrote it, and warn rather than overwrite
- **FR:sync.import** (P2): Workflow MUST write an import reference rather than duplicated content when a provider's configuration declares one
- **FR:sync.idempotent** (P1): Workflow MUST make no write when every target file already holds the current content
  > - @req FR:cli-init/init.idempotent
- **FR:sync.output** (P2): Output:
  - Written paths (string) — one per instruction file created or updated
  - Skipped paths (string) — one per file left unchanged, with reason

### FR:resolve: Per-Provider File Resolution

**AI Agent** needs its rules in the instruction file its own platform loads most reliably so that the rules are not silently ignored.

- **FR:resolve.criterion** (P1): Each provider's instruction-file configuration MUST name the file that platform loads with the highest precedence and the fewest preconditions
- **FR:resolve.baseline-insufficient** (P1): Configuration MUST NOT rely on `AGENTS.md` alone for a provider whose platform reads it at lower precedence than a platform-specific file, or reads it only under non-default configuration
- **FR:resolve.no-detection** (P2): Workflow MUST NOT detect which AI tools are installed; the provider catalog is the only source of the target list
  > - @req FR:ai-provider/catalog.discovery
- **FR:resolve.platform-surface** (P2): A provider MUST declare an instruction-file configuration when its platform reads a repository instruction file, and MUST declare none when it does not; a provider being headless-only within Catalyst does not by itself remove its platform surface

### Non-functional Requirements

**NFR:cost**: Context Cost

Instruction files load on every request, so their size is paid continuously and competes with task content for attention.

- **NFR:cost.seed** (P1): Seeded template content MUST NOT exceed 1,200 characters
- **NFR:cost.ceiling** (P2): Workflow MUST warn when the agent rules standard exceeds 4,000 characters
- **NFR:cost.measure** (P3): Size limits MUST be measured in characters rather than lines

## Data Model

- **FR:$agent-rules** (P1): **`agent-rules`** — The project's rules for AI agents, held in one file and propagated to per-provider instruction files
  - `content` (string) — Markdown body synced into each target file
  - `path` (string) — Location of the source file. Default: `.xe/standards/agent-rules.md`

## Architecture Constraints

- **Single source**: Instruction content MUST have exactly one editable source; target files are derived and MUST NOT be edited directly.
- **No code CLI**: Sync logic MUST be expressed as a YAML playbook composed of broadly-useful native actions.
- **Explicit content over reference**: Target files MUST carry rule content directly rather than pointing at `.xe/` files, except where a provider's own import mechanism resolves the reference at load time.

## External Dependencies

None
