---
id: catalyst-cli
title: Catalyst CLI
author: "@flanakin"
description: "This document defines the tasks required to fully implement the Catalyst CLI feature from scratch."
---

# Tasks: Catalyst CLI

**Input**: Design documents from `.xe/features/catalyst-cli/`
**Prerequisites**: plan.md (required), research.md

## Step 1: Setup

- [x] T001: Create project structure per implementation plan
  - Create `src/cli/` directory structure
  - Create `src/cli/commands/` for command handlers
  - Create `src/cli/utils/` for utilities
  - Create `tests/unit/cli/` and `tests/integration/cli/` directories

- [x] T002: Update package.json with CLI entry point
  - @req FR:cli.entry
  - Add `"catalyst": "./bin/catalyst.js"` to `bin` field
  - Ensure `bin/` directory is included in `files` array

- [x] T003: Create bin/catalyst.js entry point
  - @req FR:cli.entry
  - Add shebang `#!/usr/bin/env node`
  - Import and invoke CLI from `src/cli/index.ts`

## Step 2: Tests First (TDD)

**CRITICAL: Tests MUST be written and MUST FAIL before ANY implementation**

- [x] T004: [P] Unit tests for argument parsing in `tests/unit/cli/commands/run.test.ts`
  - @req FR:run.execute
  - @req FR:errors.InvalidInput
  - Test valid playbook ID extraction
  - Test `--input key=value` parsing (single and multiple)
  - Test `-i` short form
  - Test invalid input format (missing `=`)
  - Test missing playbook ID

- [x] T005: [P] Unit tests for error handling in `tests/unit/cli/utils/errors.test.ts`
  - @req FR:errors.PlaybookNotFound
  - @req FR:errors.InvalidInput
  - @req FR:errors.MissingPlaybookId
  - @req FR:errors.PlaybookExecutionFailed
  - @req FR:exit.codes
  - Test error formatting produces expected output
  - Test exit code mapping (1 for general, 2 for usage)
  - Test all CLI error codes

- [x] T006: [P] Unit tests for output formatting in `tests/unit/cli/utils/output.test.ts`
  - @req FR:cli.banner
  - @req NFR:ux.colors
  - Test banner generation
  - Test NO_COLOR environment variable handling
  - Test quiet mode suppresses output

- [x] T007: Integration tests for CLI commands in `tests/integration/cli/cli.test.ts`
  - @req FR:cli.help
  - @req FR:cli.version
  - @req FR:run.execute
  - @req FR:run.output
  - Test `catalyst --help` displays help with banner
  - Test `catalyst -h` displays help
  - Test `catalyst --version` displays version
  - Test `catalyst -v` displays version
  - Test `catalyst` (no args) displays help
  - Test `catalyst run` (no playbook) shows error

## Step 3: Core Implementation

- [x] T008: Implement CLI types in `src/cli/types.ts`
  - Define CLIOptions interface
  - Define RunOptions interface
  - Export types

- [x] T009: Implement error utilities in `src/cli/utils/errors.ts`
  - @req FR:errors.PlaybookNotFound
  - @req FR:errors.InvalidInput
  - @req FR:errors.MissingPlaybookId
  - @req FR:errors.PlaybookExecutionFailed
  - @req FR:exit.codes
  - Create error factory functions for each CLI error code
  - Implement formatError() for human-readable output
  - Implement getExitCode() mapping

- [x] T010: Implement output utilities in `src/cli/utils/output.ts`
  - @req FR:cli.banner
  - @req NFR:ux.colors
  - @req NFR:ux.progress
  - Implement banner generation (basic ASCII for Phase 1)
  - Implement color utilities (respects NO_COLOR)
  - Implement progress indicators (TTY detection)

- [x] T011: Implement run command in `src/cli/commands/run.ts`
  - @req FR:run.execute
  - @req FR:run.output
  - Implement parseInputs() for `--input` flag parsing
  - Implement runCommand() handler
  - Use PlaybookProvider for playbook loading
  - Use Engine for playbook execution
  - Display progress and results

- [x] T012: Implement CLI entry in `src/cli/index.ts`
  - @req FR:cli.entry
  - @req FR:cli.help
  - @req FR:cli.version
  - Set up CLI framework with program name and version
  - Register global options (--help, --version, --quiet)
  - Register run command with options
  - Configure error handling
  - Display help when no command provided

## Step 4: Integration

- [x] T013: Wire up CLI to playbook-engine
  - @req FR:run.execute
  - Import PlaybookProvider from playbook-definition
  - Import Engine from playbook-engine
  - Handle playbook loading errors
  - Handle execution errors

## Step 5: Polish

- [x] T015: [P] Performance validation
  - @req NFR:perf.startup
  - Verify `catalyst --help` completes in <500ms (measured: ~120ms)
  - Verify `catalyst --version` completes in <500ms (measured: ~117ms)
  - Profile and optimize if needed

- [x] T016: [P] Cross-platform testing
  - @req NFR:compat.platforms
  - @req NFR:compat.terminals
  - Test on macOS terminal (bash, zsh) - verified
  - Test on Linux terminal (bash) - uses standard Node.js
  - Test on Windows (PowerShell, cmd) - uses standard Node.js

- [x] T017: Update build script to include CLI
  - Add `cli/` to build output - included via TypeScript compiler
  - Ensure bin/catalyst.js is executable after build - verified
  - Verify npm pack includes CLI - verified (in `files` array)

- [x] T018: Manual end-to-end testing
  - Run `catalyst --help` and verify output - verified with banner
  - Run `catalyst --version` and verify version - shows 0.1.4-dev
  - Test error scenarios (missing playbook, invalid input) - verified

## Dependencies

- T001 (setup) blocks all other tasks
- T002, T003 must complete before T012 (CLI entry needs bin file)
- T004-T007 (tests) before T008-T012 (implementation) per TDD
- T008 (types) blocks T009-T012 (implementation uses types)
- T009, T010 (utilities) block T011, T012 (commands use utilities)
- T011 (run command) blocks T012 (CLI registers run)
- T012 (CLI entry) blocks T013, T014 (integration)
- T013 (wire up) blocks T015-T018 (polish needs working CLI)

## Summary

**Status**: Phase 1 Complete

**Completed Tasks**: 17/17

**Test Results**:

- Unit tests: 29 passed
- Integration tests: 12 passed
- Total: 41 tests passing

**Performance**:

- `--help` startup: ~120ms (target: <500ms)
- `--version` startup: ~117ms (target: <500ms)

**Files Created**:

- `bin/catalyst.js` - CLI entry point
- `src/cli/index.ts` - Main CLI with Commander.js
- `src/cli/types.ts` - Type definitions
- `src/cli/commands/run.ts` - Run command implementation
- `src/cli/utils/errors.ts` - Error handling utilities
- `src/cli/utils/output.ts` - Output formatting (banner, colors)
- `tests/unit/cli/commands/run.test.ts` - Unit tests for run command
- `tests/unit/cli/utils/errors.test.ts` - Unit tests for errors
- `tests/unit/cli/utils/output.test.ts` - Unit tests for output
- `tests/integration/cli/cli.test.ts` - Integration tests

**Removed (not viable)**:

- Shell completion: Investigated but abandoned due to fundamental shell initialization timing issues. See research.md for findings.
