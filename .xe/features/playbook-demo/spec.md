---
id: playbook-demo
title: Playbook Demo (Kitchen Sink)
description: Kitchen-sink demo playbook exercising every action — end-to-end validation and learning reference.
dependencies:
  - playbook-engine
  - playbook-template-engine
  - playbook-actions-io
  - playbook-actions-scripts
  - playbook-actions-controls
  - playbook-actions-github
  - playbook-actions-ai
  - cli-engine
traceability:
  code: disable
---

<!-- markdownlint-disable single-title -->

# Feature: Playbook Demo (Kitchen Sink)

## Purpose

Provides a comprehensive demonstration playbook that exercises every available playbook action — yes, everything including the kitchen sink — serving as both end-to-end validation that all actions work correctly and as a fun, entertaining educational reference for Developers learning playbook authoring patterns.

## Scenarios

### FR:coverage: Action Coverage

Playbook Engine needs every registered action demonstrated in the kitchen-sink playbook so that new actions are validated end-to-end and Developers can find examples of every action in one place.

- **FR:coverage.all** (P1): Playbook MUST exercise every action type registered in the action catalog
  > - @req FR:playbook-engine/execution.action-dispatch
  > - @req FR:playbook-actions-io/log.info-action
  > - @req FR:playbook-actions-scripts/script.interface
  > - @req FR:playbook-actions-controls/conditional.if-action
  > - @req FR:playbook-actions-github/issues.create
  > - @req FR:playbook-actions-ai/ai-prompt
- **FR:coverage.validation** (P1): E2E test MUST fail if any action type is missing from the playbook
- **FR:coverage.conditional** (P3): Actions requiring external dependencies (GitHub auth, PowerShell) SHOULD be wrapped in availability checks that skip gracefully with a log message

### FR:structure: Readability

Developer needs the playbook to be easy to navigate and debug so that they can find specific action examples and understand where execution is in a large file.

- **FR:structure.navigable** (P2): Playbook MUST have clearly separated and labeled sections for each action demonstration
  > - @req FR:playbook-template-engine/syntax.simple.resolve
- **FR:structure.identifiable** (P3): Action sections MUST be easily identifiable for debugging (e.g., via numbering, labels, or other visual markers)
- **FR:structure.skipped-logging** (P2): Conditional sections that are skipped MUST log a `log-info` message indicating they were skipped and why, prefixed with ⏭️

### FR:educational: Educational Value

Developer needs the playbook to demonstrate realistic, best-practice usage patterns so that they learn good habits, not just syntax.

- **FR:educational.entertaining** (P3): Playbook SHOULD be fun and entertaining to read and run, using a cohesive narrative scenario (the "Grand Tour" of a product launch with 11 acts + a finale)
- **FR:educational.best-practices** (P3): Playbook MUST demonstrate realistic usage patterns (e.g., proper log action grouping, meaningful variable names, error handling)
- **FR:educational.limitations** (P3): Playbook SHOULD document known limitations and gotchas with clear workarounds

### FR:inputs: Configurable Execution

Developer needs to control which sections of the playbook run so that they can test specific scenarios or skip sections requiring external dependencies.

- **FR:inputs.selective** (P2): Playbook MUST allow Developers to selectively enable or disable sections that require external dependencies (AI, GitHub, interactive checkpoints)
- **FR:inputs.defaults** (P3): All inputs MUST have sensible defaults so the playbook runs with zero configuration
- **FR:inputs.customizable** (P3): Playbook MUST accept inputs that allow customizing the demo scenario

### FR:cleanup: Resource Cleanup

Playbook Engine needs temporary resources created during the demo to be cleaned up so that repeated runs don't leave artifacts.

- **FR:cleanup.auto** (P2): Playbook MUST clean up all temporary resources it creates before completing

## Architecture Constraints

- **AC:catalog-sync**: The kitchen-sink playbook MUST stay in sync with the action catalog. When new actions are added to the system, they MUST be added to the kitchen-sink playbook. The E2E test suite enforces this constraint.
- **AC:cli-command**: The kitchen-sink playbook MUST be registered as a dynamic CLI command via `src/resources/cli-commands/kitchen-sink.yaml`, runnable via `npm run cli -- kitchen-sink`.
  > - @req FR:cli-engine/cli.dynamic

## External Dependencies

- **AI Providers**: Required for AI-powered action demonstrations (optional, skipped if no API key configured or Ollama unreachable)
- **GitHub CLI (`gh`)**: Required for GitHub action demonstrations (optional, skipped if not authenticated)
- **PowerShell (`pwsh`)**: Required for PowerShell demonstration (optional, skipped if not installed)
