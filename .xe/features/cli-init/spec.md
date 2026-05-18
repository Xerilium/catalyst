---
id: cli-init
title: CLI Init
description: Single-command project initialization that installs Catalyst AI commands and hands off to product setup.
dependencies:
  - ai-provider
  - cli-engine
  - init-workflow
  - playbook-yaml
  - playbook-actions-controls
---

<!-- markdownlint-disable single-title -->

# Feature: CLI Init

## Purpose

Provide a single CLI command that prepares a consumer project for Catalyst by installing AI command files and pointing the user to product setup. Orchestrates per-feature install workflows (today: ai-provider; tomorrow: any feature that needs install-time setup) and hands off to the AI-driven product interview.

## Scenarios

### FR:init: Project Initialization

Framework consumer needs a single CLI command to set up Catalyst in their project so that AI command files are placed and they know how to start product setup, regardless of which package manager they use.

- **FR:init.@command** (P1): Interface: `catalyst init`
  > - @req FR:cli-engine/cli.dynamic
- **FR:init.@playbook** (P1): Interface: `src/resources/cli-commands/init.yaml`
  > - @req FR:playbook-yaml/structure
- **FR:init.ai-commands** (P1): Command MUST install AI commands
  > - @req FR:ai-provider/commands.@playbook
  > - @req FR:playbook-actions-controls/composition.playbook-action
- **FR:init.handoff** (P2): Command MUST output a closing message instructing the user to run `/catalyst:init` in their AI tool to set up product context
  > - @req FR:init-workflow/workflow.@ai-command
- **FR:init.idempotent** (P2): Command MUST be safe to run repeatedly without corrupting prior installs

### Non-functional Requirements

None

## Data Model

None

## Architecture Constraints

- **No code CLI**: Command logic MUST be expressed as a YAML playbook composed of broadly-useful native actions; no install-specific TypeScript code path.
- **Composition over coupling**: Per-feature install workflows are invoked via the `playbook` composition action; `cli-init` does NOT know the internals of any feature's install logic.

## External Dependencies

None
