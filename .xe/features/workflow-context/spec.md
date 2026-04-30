---
id: workflow-context
title: Workflow Context
description: Common workflow conventions shared across orchestration playbooks (execution modes, etc.).
dependencies:
  - context-storage
traceability:
  code: disable
---

<!-- markdownlint-disable single-title -->

# Feature: Workflow Context

## Purpose

Common workflow conventions used across orchestration playbooks.

## Scenarios

### FR:execution-modes: Execution Mode Support

Developer needs to choose execution mode so that workflow autonomy aligns with project complexity and personal preferences.

- **FR:execution-modes.interactive** (P2): System MUST support interactive mode with progressive collaboration
  - Progressive AskUserQuestion prompts to build spec collaboratively
  - User approval required at phase gates (scope, spec, plan)
  - No state-changing git operations by AI without explicit user approval
- **FR:execution-modes.checkpoint-review** (P2): System MUST support checkpoint-review mode with autonomous execution and review gates
  - Run autonomously until checkpoints
  - User approval required at phase gates (scope, spec, plan)
  - No state-changing git operations by AI
- **FR:execution-modes.autonomous-local** (P2): System MUST support autonomous-local mode with full autonomy on current branch
  - Full autonomy on local/current branch
  - Auto-approved phase gates
  - No state-changing git operations by AI
- **FR:execution-modes.autonomous-branch** (P2): System MUST support autonomous-branch mode with feature branch and PR creation
  - Full autonomy in a feature branch with PR creation
  - Auto-approved phase gates
  - Create feature branch with naming pattern `xe/{rollout-id}`

## Data Model

None

## Architecture Constraints

None

## External Dependencies

None
