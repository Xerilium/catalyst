---
id: catalyst-cli
title: Catalyst CLI
author: "@flanakin"
description: "This document defines the minimal command-line interface for executing Catalyst playbooks."
dependencies:
  - playbook-definition
  - playbook-engine
  - error-handling
---

<!-- markdownlint-disable single-title -->

# Feature: Catalyst CLI

## Problem

There is no direct way to run playbooks from the command line, limiting automation possibilities and making it harder to test the playbook engine.

## Goals

1. **Direct execution**: Provide a CLI to run playbooks without requiring an AI platform
2. **Infrastructure foundation**: Establish the CLI framework for future command expansion
3. **Engine validation**: Enable manual testing of the playbook engine

Explicit non-goals:

- Domain-specific commands (rollout, blueprint, init, req, etc.) - deferred until underlying features mature
- Machine-readable output (`--json`) - deferred until CI integration needs are understood
- Binary distribution - deferred to future phase

## Scenario

- As a **developer**, I need to run playbooks directly so that I can test and debug playbook execution without AI mediation
  - Outcome: `catalyst run <playbook-id>` executes any discoverable playbook

- As a **new user**, I need to understand what commands are available so that I can start using Catalyst
  - Outcome: `catalyst --help` shows available commands with descriptions

- As a **CI pipeline** (future), I need predictable exit codes so that I can automate Catalyst operations
  - Outcome: CLI returns 0 on success, non-zero on failure

## Success Criteria

1. **Execution**: `catalyst run <playbook-id>` successfully invokes the playbook engine
2. **Discoverability**: `catalyst --help` displays available commands with ASCII banner
3. **Error handling**: Invalid commands produce helpful error messages using CatalystError

## Design Principles

- **Fail fast with guidance**
  > Commands should fail immediately when inputs are invalid, but error messages must explain what went wrong and how to fix it. Never leave users guessing.

- **Human-first output**
  > Default output optimizes for human readability. Machine output is deferred until needed.

- **Minimal surface area**
  > Start with the smallest useful CLI. Add commands only when underlying features are ready.

## Requirements

### Functional Requirements

#### FR:cli: CLI Framework

- **FR:cli.entry**: System MUST provide single CLI entry point
  - Command: `npx catalyst` or `catalyst` (if globally installed)
  - Package: `@xerilium/catalyst` with `bin.catalyst` in package.json

- **FR:cli.help**: System MUST provide help information
  - `catalyst --help` or `catalyst -h` lists available commands with descriptions
  - `catalyst run --help` shows run command options
  - Running `catalyst` with no arguments shows help

- **FR:cli.version**: System MUST display version information
  - `catalyst --version` or `catalyst -v` shows package version

- **FR:cli.banner**: System MUST display ASCII art banner on help
  - Banner shown with `catalyst --help` output
  - Banner NOT shown on `catalyst run` or error output
  - Banner respects `--quiet` flag (suppressed when quiet)

#### FR:run: Run Command

- **FR:run.execute**: System MUST execute playbooks by ID
  - Command: `catalyst run <playbook-id> [--input key=value...]`
  - Inputs passed as repeatable `--input` or `-i` flags
  - Uses `PlaybookProvider.loadPlaybook()` for discovery
  - Uses `Engine.run()` for execution

- **FR:run.output**: System MUST display playbook execution output
  - Show playbook name and status on start
  - Stream step output as playbook executes
  - Show final status (success/failure) on completion

#### FR:exit: Exit Codes

- **FR:exit.codes**: System MUST use standard exit codes
  - `0`: Success
  - `1`: General error (playbook failure, runtime error)
  - `2`: Invalid usage/arguments (bad command, missing required input)

#### FR:errors: CLI Error Codes

System MUST throw CatalystError with these codes for CLI-specific errors:

| Code | Message | Guidance | Exit Code |
|------|---------|----------|-----------|
| `PlaybookNotFound` | Playbook "{id}" not found | Check playbook ID or specify the full path. Run `catalyst run --help` to see discovery paths. | 1 |
| `InvalidInput` | Invalid input format: "{value}" | Playbook inputs must be in key=value format. Example: `--input name=value` | 2 |
| `MissingPlaybookId` | No playbook ID provided | Usage: `catalyst run <playbook-id> [--input key=value...]` | 2 |
| `PlaybookExecutionFailed` | Playbook "{id}" failed: {reason} | Check playbook output above for details. | 1 |

Note: These codes extend the error-handling feature. Other errors (e.g., `PlaybookNotFound` from PlaybookProvider) pass through unchanged.

#### FR:completion: Shell Completion

- **FR:completion.support**: System MUST support shell completion for discoverability
  - bash completion
  - zsh completion
  - fish completion
  - PowerShell completion

### Non-functional Requirements

#### NFR:compat: Compatibility

- **NFR:compat.node**: CLI MUST work with Node.js >= 18
- **NFR:compat.platforms**: CLI MUST work on macOS, Linux, and Windows
- **NFR:compat.terminals**: CLI MUST work in common terminals (bash, zsh, fish, PowerShell, cmd)

#### NFR:perf: Performance

- **NFR:perf.startup**: CLI MUST start in under 500ms for `--help` and `--version`

#### NFR:ux: User Experience

- **NFR:ux.colors**: CLI SHOULD use colors for emphasis (respects `NO_COLOR` env var)
- **NFR:ux.progress**: CLI SHOULD show progress for long-running operations (spinner for TTY, logs for non-TTY)

#### NFR:test: Testability

- **NFR:test.unit**: CLI module MUST have unit tests for argument parsing
- **NFR:test.integration**: CLI module MUST have integration tests for playbook execution

## Key Entities

Entities owned by this feature:

- None (CLI is a thin wrapper over playbook-engine)

Entities from dependencies:

- **PlaybookProvider** (playbook-definition): Playbook discovery and loading
- **Engine** (playbook-engine): Playbook execution runtime
- **CatalystError** (error-handling): Error class with code, message, and guidance

Inputs:

- Command-line arguments and flags
- Environment variables (e.g., `NO_COLOR`)

Outputs:

- Human-readable terminal output (with ASCII banner on help)
- Exit codes for scripting/CI integration

## Dependencies

**Feature Dependencies:**

- **playbook-definition**: CLI uses PlaybookProvider for playbook discovery and loading
- **playbook-engine**: CLI uses Engine for playbook execution
- **error-handling**: CLI uses CatalystError for error reporting

**External Dependencies:**

None required.
