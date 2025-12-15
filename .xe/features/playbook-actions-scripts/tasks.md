---
id: playbook-actions-scripts
title: Playbook Actions - Scripts
author: "@flanakin"
description: "This document defines the tasks required to fully implement the Playbook Actions - Scripts feature from scratch."
---

# Tasks: Playbook Actions - Scripts

**Input**: Design documents from `.xe/features/playbook-actions-scripts/`
**Prerequisites**: plan.md (required), research.md, spec.md

## Step 1: Setup

- [x] T001: Create directory structure `src/playbooks/actions/scripts/`
  - @req FR:playbook-actions-scripts/common.validation
  - @req NFR:playbook-actions-scripts/maintainability.typescript

- [x] T002: Create type definitions in `types.ts` (ScriptConfig, BashConfig, PowerShellConfig, ShellResult)
  - @req FR:playbook-actions-scripts/script.interface
  - @req FR:playbook-actions-scripts/shell.bash
  - @req FR:playbook-actions-scripts/shell.powershell
  - @req FR:playbook-actions-scripts/shell.output-capture
  - @req NFR:playbook-actions-scripts/maintainability.typescript

- [x] T003: Create error utilities in `errors.ts` (error codes and helper functions)
  - @req FR:playbook-actions-scripts/common.validation
  - @req FR:playbook-actions-scripts/script.error-handling
  - @req FR:playbook-actions-scripts/shell.error-mapping
  - @req NFR:playbook-actions-scripts/maintainability.error-codes
  - @req NFR:playbook-actions-scripts/reliability.error-messages

## Step 2: Tests First (TDD)

> **CRITICAL**: Tests MUST be written and MUST FAIL before ANY implementation

- [x] T004: [P] Unit test suite for ScriptAction in `tests/unit/playbooks/actions/scripts/script-action.test.ts`
  - @req FR:playbook-actions-scripts/script.interface
  - @req FR:playbook-actions-scripts/script.vm-execution
  - @req FR:playbook-actions-scripts/script.context-injection
  - @req FR:playbook-actions-scripts/script.error-handling
  - @req FR:playbook-actions-scripts/script.return-value
  - @req FR:playbook-actions-scripts/common.validation
  - @req FR:playbook-actions-scripts/common.working-directory
  - @req FR:playbook-actions-scripts/common.timeout
  - @req NFR:playbook-actions-scripts/testability.isolation
  - @req NFR:playbook-actions-scripts/testability.error-coverage
  - @req NFR:playbook-actions-scripts/testability.success-coverage

- [x] T005: [P] Unit test suite for ShellActionBase in `tests/unit/playbooks/actions/scripts/shell-action-base.test.ts`
  - @req FR:playbook-actions-scripts/shell.base-class
  - @req FR:playbook-actions-scripts/shell.execution
  - @req FR:playbook-actions-scripts/shell.output-capture
  - @req FR:playbook-actions-scripts/shell.error-mapping
  - @req FR:playbook-actions-scripts/common.validation
  - @req FR:playbook-actions-scripts/common.working-directory
  - @req FR:playbook-actions-scripts/common.timeout
  - @req NFR:playbook-actions-scripts/testability.isolation
  - @req NFR:playbook-actions-scripts/testability.error-coverage

- [x] T006: [P] Unit test suite for BashAction in `tests/unit/playbooks/actions/scripts/bash-action.test.ts`
  - @req FR:playbook-actions-scripts/shell.bash
  - @req FR:playbook-actions-scripts/shell.execution
  - @req FR:playbook-actions-scripts/common.template-interpolation
  - @req NFR:playbook-actions-scripts/testability.isolation
  - @req NFR:playbook-actions-scripts/testability.success-coverage

- [x] T007: [P] Unit test suite for PowerShellAction in `tests/unit/playbooks/actions/scripts/powershell-action.test.ts`
  - @req FR:playbook-actions-scripts/shell.powershell
  - @req FR:playbook-actions-scripts/shell.execution
  - @req FR:playbook-actions-scripts/common.template-interpolation
  - @req NFR:playbook-actions-scripts/testability.isolation
  - @req NFR:playbook-actions-scripts/testability.success-coverage

- [x] T008: [P] Security test suite in `tests/unit/playbooks/actions/scripts/security.test.ts`
  - @req FR:playbook-actions-scripts/security.script
  - @req FR:playbook-actions-scripts/security.shell
  - @req FR:playbook-actions-scripts/script.context-injection
  - @req NFR:playbook-actions-scripts/testability.isolation

## Step 3: Core Implementation

- [x] T009: Implement ScriptAction class in `script-action.ts` (JavaScript execution with VM isolation)
  - @req FR:playbook-actions-scripts/script.interface
  - @req FR:playbook-actions-scripts/script.vm-execution
  - @req FR:playbook-actions-scripts/script.context-injection
  - @req FR:playbook-actions-scripts/script.error-handling
  - @req FR:playbook-actions-scripts/script.return-value
  - @req FR:playbook-actions-scripts/common.validation
  - @req FR:playbook-actions-scripts/common.working-directory
  - @req FR:playbook-actions-scripts/common.timeout
  - @req FR:playbook-actions-scripts/common.result-structure
  - @req FR:playbook-actions-scripts/security.script
  - @req NFR:playbook-actions-scripts/maintainability.single-responsibility
  - @req NFR:playbook-actions-scripts/performance.script-overhead
  - @req NFR:playbook-actions-scripts/reliability.memory-leaks

- [x] T010: Implement ShellActionBase abstract class in `shell-action-base.ts` (common shell execution logic)
  - @req FR:playbook-actions-scripts/shell.base-class
  - @req FR:playbook-actions-scripts/shell.execution
  - @req FR:playbook-actions-scripts/shell.output-capture
  - @req FR:playbook-actions-scripts/shell.error-mapping
  - @req FR:playbook-actions-scripts/common.validation
  - @req FR:playbook-actions-scripts/common.working-directory
  - @req FR:playbook-actions-scripts/common.timeout
  - @req FR:playbook-actions-scripts/common.result-structure
  - @req NFR:playbook-actions-scripts/maintainability.single-responsibility
  - @req NFR:playbook-actions-scripts/maintainability.shared-base
  - @req NFR:playbook-actions-scripts/performance.shell-overhead
  - @req NFR:playbook-actions-scripts/reliability.process-cleanup

- [x] T011: [P] Implement BashAction in `bash-action.ts` (extends ShellActionBase)
  - @req FR:playbook-actions-scripts/shell.bash
  - @req FR:playbook-actions-scripts/shell.base-class
  - @req FR:playbook-actions-scripts/security.shell
  - @req NFR:playbook-actions-scripts/maintainability.shared-base

- [x] T012: [P] Implement PowerShellAction in `powershell-action.ts` (extends ShellActionBase)
  - @req FR:playbook-actions-scripts/shell.powershell
  - @req FR:playbook-actions-scripts/shell.base-class
  - @req FR:playbook-actions-scripts/security.shell
  - @req NFR:playbook-actions-scripts/maintainability.shared-base

## Step 4: Integration

- [x] T013: Create exports in `index.ts` (export all actions, types, and error codes)
  - @req FR:playbook-actions-scripts/script.interface
  - @req FR:playbook-actions-scripts/shell.bash
  - @req FR:playbook-actions-scripts/shell.powershell
  - @req NFR:playbook-actions-scripts/maintainability.typescript

- [x] T014: Register actions with playbook engine (dependency declarations added)
  - @req FR:playbook-actions-scripts/script.interface
  - @req FR:playbook-actions-scripts/shell.bash
  - @req FR:playbook-actions-scripts/shell.powershell

## Step 5: Polish

- [x] T015: [P] Verify 100% test coverage for error paths
  - @req NFR:playbook-actions-scripts/testability.error-coverage

- [x] T016: [P] Verify 90% test coverage for success paths
  - @req NFR:playbook-actions-scripts/testability.success-coverage

- [x] T017: Run linter and fix any issues
  - @req NFR:playbook-actions-scripts/maintainability.typescript

- [x] T018: Verify TypeScript compilation without errors
  - @req NFR:playbook-actions-scripts/maintainability.typescript

- [x] T019: Create internal architecture documentation (removed - redundant with spec/research/plan)
  - @req NFR:playbook-actions-scripts/maintainability.single-responsibility

## Dependencies

- Tests (T004-T008) must be written before implementation (T009-T012)
- T009 (ScriptAction) can run in parallel with T010 (ShellActionBase)
- T011-T012 (BashAction, PowerShellAction) depend on T010 (ShellActionBase)
- T013 (exports) depends on T009-T012 (all implementations complete)
- T014 (registration) depends on T013 (exports)
- Polish tasks (T015-T019) depend on all implementation tasks
