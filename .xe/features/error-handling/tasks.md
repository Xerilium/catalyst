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

- [x] T001: Create `src/ts/errors/` directory
- [x] T002: Create `tests/ts/errors/` directory

## Step 2: Base Class Implementation

- [x] T003: Implement CatalystError in `src/ts/errors/base.ts`
  - Extend JavaScript Error ✓
  - Add code, guidance, cause properties ✓
  - Preserve stack trace ✓
  - Implement toJSON() method ✓
- [x] T004: Write unit tests in `tests/ts/errors/base.test.ts`
  - Test constructor ✓
  - Test instanceof checks ✓
  - Test toJSON() serialization ✓
  - Test cause chaining ✓
  - Test stack trace preservation ✓

## Step 3: Error Type Classes

- [x] T005: [P] Implement ValidationError in `src/ts/errors/validation.ts`
- [x] T006: [P] Implement NotFoundError in `src/ts/errors/not-found.ts`
- [x] T007: [P] Implement AuthError in `src/ts/errors/auth.ts`
- [x] T008: [P] Implement NetworkError in `src/ts/errors/network.ts`
- [x] T009: [P] Implement ConfigError in `src/ts/errors/config.ts`

## Step 4: Unit Tests

- [x] T010: [P] Write ValidationError tests in `tests/ts/errors/validation.test.ts`
- [x] T011: [P] Write NotFoundError tests in `tests/ts/errors/not-found.test.ts`
- [x] T012: [P] Write AuthError tests in `tests/ts/errors/auth.test.ts`
- [x] T013: [P] Write NetworkError tests in `tests/ts/errors/network.test.ts`
- [x] T014: [P] Write ConfigError tests in `tests/ts/errors/config.test.ts`

## Step 5: Export Organization

- [x] T015: Create `src/ts/errors/index.ts` to export all error classes

## Step 6: Validation

- [x] T016: Run tests and verify 100% coverage
  - Run `npm test` ✓ (22 tests passed)
  - Verify all tests pass ✓
  - Check coverage report (100% achieved)
- [x] T017: Validate file sizes <50 lines each
  - Check all error class files ✓
  - Ensure simplicity constraint met ✓ (all files <20 lines)
- [x] T018: Validate all requirements from spec.md
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

- [x] All 18 tasks completed ✓
- [x] All tests passing ✓ (22 tests)
- [x] 100% code coverage achieved ✓
- [x] All files <50 lines ✓ (all <20 lines)
- [x] All functional requirements validated ✓
- [x] All non-functional requirements validated ✓

## Implementation Notes

**Completed**: Feature successfully implemented by moving existing GitHub error code to shared location.

**Key Changes**:
- Created `src/ts/errors/` with CatalystError base class and 5 specialized error types
- Migrated GitHub error classes to extend Catalyst error classes
- Added backward-compatible `remediation` property (getter for `guidance`)
- Achieved 100% test coverage with 22 passing tests
- All error files <20 lines (well under 50-line constraint)

**Integration**:
- GitHub integration now imports errors from `src/ts/errors/` instead of defining its own
- Error classes maintain backward compatibility via wrapper classes
