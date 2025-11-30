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

- [ ] T001: Create directory structure `src/playbooks/scripts/playbooks/actions/scripts/`
- [ ] T002: Create type definitions in `types.ts` (ScriptConfig, BashConfig, PowerShellConfig, ShellResult)
- [ ] T003: Create error utilities in `errors.ts` (error codes and helper functions)

## Step 2: Tests First (TDD)

**CRITICAL: Tests MUST be written and MUST FAIL before ANY implementation**

- [ ] T004: [P] Unit test suite for ScriptAction in `tests/unit/playbooks/actions/scripts/script-action.test.ts`
- [ ] T005: [P] Unit test suite for ShellActionBase in `tests/unit/playbooks/actions/scripts/shell-action-base.test.ts`
- [ ] T006: [P] Unit test suite for BashAction in `tests/unit/playbooks/actions/scripts/bash-action.test.ts`
- [ ] T007: [P] Unit test suite for PowerShellAction in `tests/unit/playbooks/actions/scripts/powershell-action.test.ts`
- [ ] T008: [P] Security test suite in `tests/unit/playbooks/actions/scripts/security.test.ts`

## Step 3: Core Implementation

- [ ] T009: Implement ScriptAction class in `script-action.ts` (JavaScript execution with VM isolation)
- [ ] T010: Implement ShellActionBase abstract class in `shell-action-base.ts` (common shell execution logic)
- [ ] T011: [P] Implement BashAction in `bash-action.ts` (extends ShellActionBase)
- [ ] T012: [P] Implement PowerShellAction in `powershell-action.ts` (extends ShellActionBase)

## Step 4: Integration

- [ ] T013: Create exports in `index.ts` (export all actions, types, and error codes)
- [ ] T014: Register actions with playbook engine (if registration mechanism exists)

## Step 5: Polish

- [ ] T015: [P] Verify 100% test coverage for error paths
- [ ] T016: [P] Verify 90% test coverage for success paths
- [ ] T017: Run linter and fix any issues
- [ ] T018: Verify TypeScript compilation without errors
- [ ] T019: Create internal architecture documentation in `architecture.md`

## Dependencies

- Tests (T004-T008) must be written before implementation (T009-T012)
- T009 (ScriptAction) can run in parallel with T010 (ShellActionBase)
- T011-T012 (BashAction, PowerShellAction) depend on T010 (ShellActionBase)
- T013 (exports) depends on T009-T012 (all implementations complete)
- T014 (registration) depends on T013 (exports)
- Polish tasks (T015-T019) depend on all implementation tasks
