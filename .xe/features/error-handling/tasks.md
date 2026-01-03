---
id: error-handling
title: Error Handling
author: "@flanakin"
description: "This document defines the tasks required to fully implement the Error Handling feature from scratch."
---

# Tasks: Error Handling

**Input**: Design documents from `.xe/features/error-handling/`

**Prerequisites**: plan.md (required), spec.md

> **Living Specification**: Tasks asume from-scratch implementation.

## Step 1: Setup

- [ ] T001: [P] Create `src/playbooks/errors.ts` file
  - @req FR:catalyst-error
  - @req FR:error-action
  - @req FR:error-policy-action
  - @req FR:error-policy
- [ ] T002: [P] Create `tests/errors.test.ts` file
  - @req FR:catalyst-error
  - @req FR:error-action
  - @req FR:error-policy-action
  - @req FR:error-policy

## Step 2: Tests First (TDD)

**CRITICAL: Tests MUST be written and MUST FAIL before ANY implementation**

- [ ] T003: [P] Unit test for CatalystError constructor in tests/errors.test.ts
  - @req FR:catalyst-error.constructor
  - @req FR:catalyst-error.extends-error
- [ ] T004: [P] Unit test for CatalystError toJSON() serialization in tests/errors.test.ts
  - @req FR:catalyst-error.serialization
- [ ] T005: [P] Unit test for CatalystError cause chaining in tests/errors.test.ts
  - @req FR:catalyst-error.constructor
- [ ] T006: [P] Unit test for CatalystError stack trace preservation in tests/errors.test.ts
  - @req FR:catalyst-error.stack-traces
- [ ] T007: [P] Unit test for ErrorAction enum values in tests/errors.test.ts
  - @req FR:error-action.values
- [ ] T008: [P] Unit test for ErrorPolicyAction with and without retryCount in tests/errors.test.ts
  - @req FR:error-policy-action.interface
- [ ] T009: [P] Unit test for ErrorPolicy dictionary structure in tests/errors.test.ts
  - @req FR:error-policy.interface
  - @req FR:error-policy.pascal-cased
  - @req FR:error-policy.valid-codes
- [ ] T010: [P] Performance test for CatalystError instantiation and serialization in tests/errors.test.ts
  - @req NFR:performance.instantiation
  - @req NFR:performance.serialization

## Step 3: Core Implementation

- [ ] T011: Implement CatalystError class in src/playbooks/errors.ts
  - Extend Error with code, guidance, cause properties
  - Preserve stack trace using Error.captureStackTrace
  - Implement toJSON() method
  - @req FR:catalyst-error
  - @req FR:catalyst-error.extends-error
  - @req FR:catalyst-error.constructor
  - @req FR:catalyst-error.stack-traces
  - @req FR:catalyst-error.serialization
- [ ] T012: Define ErrorAction string enum in src/playbooks/errors.ts
  - Stop, Suspend, Break, Inquire, Continue, SilentlyContinue, Ignore
  - @req FR:error-action
  - @req FR:error-action.values
- [ ] T013: Define ErrorPolicyAction interface in src/playbooks/errors.ts
  - action: ErrorAction (required)
  - retryCount?: number (optional, defaults to 0)
  - @req FR:error-policy-action
  - @req FR:error-policy-action.interface
- [ ] T014: Define ErrorPolicy interface in src/playbooks/errors.ts
  - default: ErrorPolicyAction (required)
  - [errorCode: string]: ErrorPolicyAction (optional per-code overrides)
  - @req FR:error-policy
  - @req FR:error-policy.interface
  - @req FR:error-policy.pascal-cased
  - @req FR:error-policy.valid-codes

## Step 4: Integration

None

## Step 5: Polish

- [ ] T015: Verify all tests pass with 100% coverage
  - @req FR:catalyst-error
  - @req FR:catalyst-error.extends-error
  - @req FR:catalyst-error.constructor
  - @req FR:catalyst-error.stack-traces
  - @req FR:catalyst-error.serialization
  - @req FR:error-action
  - @req FR:error-action.values
  - @req FR:error-policy-action
  - @req FR:error-policy-action.interface
  - @req FR:error-policy
  - @req FR:error-policy.interface
  - @req FR:error-policy.pascal-cased
  - @req FR:error-policy.valid-codes
- [ ] T016: Validate performance requirements (<1ms instantiation, <5ms serialization)
  - @req NFR:performance.instantiation
  - @req NFR:performance.serialization
- [ ] T017: Validate all spec requirements (FR:catalyst-error through FR:error-policy, NFR:performance)
  - @req FR:catalyst-error
  - @req FR:catalyst-error.extends-error
  - @req FR:catalyst-error.constructor
  - @req FR:catalyst-error.stack-traces
  - @req FR:catalyst-error.serialization
  - @req FR:error-action
  - @req FR:error-action.values
  - @req FR:error-policy-action
  - @req FR:error-policy-action.interface
  - @req FR:error-policy
  - @req FR:error-policy.interface
  - @req FR:error-policy.pascal-cased
  - @req FR:error-policy.valid-codes
  - @req NFR:performance
  - @req NFR:performance.instantiation
  - @req NFR:performance.serialization

## Dependencies

- T003-T010 must complete before T011-T014 (TDD)
- T011-T014 must complete before T015-T017 (Implementation before validation)
