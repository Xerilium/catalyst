---
id: error-handling
title: Error Handling
author: "@flanakin"
description: "Task breakdown for implementing base error classes"
---

# Tasks: Error Handling

**Input**: Design documents from `.xe/features/error-handling/`

**Prerequisites**: plan.md (required), spec.md

> **Living Specification Note**: Tasks assume from-scratch implementation.

## Step 1: Project Setup

- [ ] T001: Create `src/ts/errors/` directory
- [ ] T002: Create `tests/ts/errors/` directory

## Step 2: Base Class Implementation

- [ ] T003: Implement CatalystError in `src/ts/errors/base.ts`
  - Extend JavaScript Error
  - Add code, guidance, cause properties
  - Preserve stack trace
  - Implement toJSON() method
- [ ] T004: Write unit tests in `tests/ts/errors/base.test.ts`
  - Test constructor
  - Test instanceof checks
  - Test toJSON() serialization
  - Test cause chaining
  - Test stack trace preservation

## Step 3: Error Type Classes

- [ ] T005: [P] Implement ValidationError in `src/ts/errors/validation.ts`
- [ ] T006: [P] Implement NotFoundError in `src/ts/errors/not-found.ts`
- [ ] T007: [P] Implement AuthError in `src/ts/errors/auth.ts`
- [ ] T008: [P] Implement NetworkError in `src/ts/errors/network.ts`
- [ ] T009: [P] Implement ConfigError in `src/ts/errors/config.ts`

## Step 4: Unit Tests

- [ ] T010: [P] Write ValidationError tests in `tests/ts/errors/validation.test.ts`
- [ ] T011: [P] Write NotFoundError tests in `tests/ts/errors/not-found.test.ts`
- [ ] T012: [P] Write AuthError tests in `tests/ts/errors/auth.test.ts`
- [ ] T013: [P] Write NetworkError tests in `tests/ts/errors/network.test.ts`
- [ ] T014: [P] Write ConfigError tests in `tests/ts/errors/config.test.ts`

## Step 5: Export Organization

- [ ] T015: Create `src/ts/errors/index.ts` to export all error classes

## Step 6: Validation

- [ ] T016: Run tests and verify 100% coverage
  - Run `npm test`
  - Verify all tests pass
  - Check coverage report
- [ ] T017: Validate file sizes <50 lines each
  - Check all error class files
  - Ensure simplicity constraint met
- [ ] T018: Validate all requirements from spec.md
  - FR-1: Base error class with code, message, guidance, cause ✓
  - FR-2: 5 common error types ✓
  - NFR-1: <50 lines per file ✓
  - NFR-2: Performance targets met ✓
  - NFR-3: 100% test coverage ✓

## Dependencies

- **Sequential**: Steps must complete in order
- **Parallel**: Tasks marked [P] within same step run concurrently
- **No external dependencies**: Feature is foundational

## Success Criteria

Feature is complete when:

- [ ] All 18 tasks completed
- [ ] All tests passing
- [ ] 100% code coverage achieved
- [ ] All files <50 lines
- [ ] All functional requirements validated
- [ ] All non-functional requirements validated
