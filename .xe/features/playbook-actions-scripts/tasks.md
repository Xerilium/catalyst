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
- [x] T002: Create type definitions in `types.ts` (ScriptConfig, BashConfig, PowerShellConfig, ShellResult)
- [x] T003: Create error utilities in `errors.ts` (error codes and helper functions)

## Step 2: Tests First (TDD)

**CRITICAL: Tests MUST be written and MUST FAIL before ANY implementation**

- [x] T004: [P] Unit test suite for ScriptAction in `tests/unit/playbooks/actions/scripts/script-action.test.ts`
- [x] T005: [P] Unit test suite for ShellActionBase in `tests/unit/playbooks/actions/scripts/shell-action-base.test.ts`
- [x] T006: [P] Unit test suite for BashAction in `tests/unit/playbooks/actions/scripts/bash-action.test.ts`
- [x] T007: [P] Unit test suite for PowerShellAction in `tests/unit/playbooks/actions/scripts/powershell-action.test.ts`
- [x] T008: [P] Security test suite in `tests/unit/playbooks/actions/scripts/security.test.ts`

## Step 3: Core Implementation

- [x] T009: Implement ScriptAction class in `script-action.ts` (JavaScript execution with VM isolation)
- [x] T010: Implement ShellActionBase abstract class in `shell-action-base.ts` (common shell execution logic)
- [x] T011: [P] Implement BashAction in `bash-action.ts` (extends ShellActionBase)
- [x] T012: [P] Implement PowerShellAction in `powershell-action.ts` (extends ShellActionBase)

## Step 4: Integration

- [x] T013: Create exports in `index.ts` (export all actions, types, and error codes)
- [x] T014: Register actions with playbook engine (dependency declarations added)

## Step 5: Polish

- [x] T015: [P] Verify 100% test coverage for error paths
- [x] T016: [P] Verify 90% test coverage for success paths
- [x] T017: Run linter and fix any issues
- [x] T018: Verify TypeScript compilation without errors
- [x] T019: Create internal architecture documentation (removed - redundant with spec/research/plan)

## Dependencies

- Tests (T004-T008) must be written before implementation (T009-T012)
- T009 (ScriptAction) can run in parallel with T010 (ShellActionBase)
- T011-T012 (BashAction, PowerShellAction) depend on T010 (ShellActionBase)
- T013 (exports) depends on T009-T012 (all implementations complete)
- T014 (registration) depends on T013 (exports)
- Polish tasks (T015-T019) depend on all implementation tasks
