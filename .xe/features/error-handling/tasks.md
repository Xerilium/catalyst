---
id: error-handling
title: Error Handling
author: "@flanakin"
description: "Task breakdown for implementing single CatalystError class"
---

# Tasks: Error Handling

**Input**: Design documents from `.xe/features/error-handling/`

**Prerequisites**: plan.md (required), spec.md

> **Living Specification Note**: Tasks assume from-scratch implementation.

## Step 1: Project Setup

- [ ] T001: Create `src/ts/errors/` directory
- [ ] T002: Create `tests/errors/` directory

## Step 2: CatalystError Implementation

- [ ] T003: Implement CatalystError in `src/ts/errors/base.ts`
  - Extend JavaScript Error
  - Add code, guidance, cause properties (code is PascalCased string)
  - Preserve stack trace
  - Implement toJSON() method
  - <30 lines total
- [ ] T004: Create ErrorPolicy type in `src/ts/errors/types.ts`
  - Export type: `string | Record<string, string>`
- [ ] T005: Create exports in `src/ts/errors/index.ts`
  - Export CatalystError
  - Export ErrorPolicy type

## Step 3: Unit Tests

- [ ] T006: Write CatalystError tests in `tests/errors/base.test.ts`
  - Test constructor sets all fields correctly
  - Test code is PascalCased
  - Test instanceof checks work
  - Test toJSON() serialization
  - Test cause chaining
  - Test stack trace preservation

## Step 4: Refactor Existing Code

- [ ] T007: Remove error subclasses from `src/ts/errors/`
  - Delete validation.ts, not-found.ts, auth.ts, network.ts, config.ts
- [ ] T008: Update GitHub integration to use CatalystError with explicit codes
  - Replace GitHubAuthError with CatalystError(message, 'GitHubAuthFailed', guidance)
  - Replace GitHubNotFoundError with CatalystError(message, 'GitHubNotFound', guidance)
  - Replace GitHubNetworkError with CatalystError(message, 'GitHubNetworkError', guidance)
  - Replace GitHubRateLimitError with CatalystError(message, 'GitHubRateLimitExceeded', guidance)
  - Replace GitHubPermissionError with CatalystError(message, 'GitHubPermissionDenied', guidance)
  - Replace GitHubError with CatalystError(message, 'GitHubUnknownError', guidance)
- [ ] T009: Update error detection to map to codes instead of classes
  - Modify detectErrorType() to return code strings
  - Modify mapCLIError() to return CatalystError with explicit code

## Step 5: Validation

- [ ] T010: Run tests and verify 100% coverage
  - Run `npm test`
  - Verify all tests pass
  - Check coverage report (100% target)
- [ ] T011: Validate file size <30 lines
  - Check CatalystError implementation
  - Ensure simplicity constraint met
- [ ] T012: Validate all requirements from spec.md
  - FR-1: CatalystError with code, message, guidance, cause
  - NFR-1: <30 lines, no subclasses
  - NFR-2: Performance targets met
  - NFR-3: 100% test coverage

## Dependencies

- **Sequential**: Steps must complete in order
- **No external dependencies**: Feature is foundational

## Success Criteria

Feature is complete when:

- [ ] All 12 tasks completed
- [ ] All tests passing
- [ ] 100% code coverage achieved
- [ ] CatalystError <30 lines
- [ ] No error subclasses exist
- [ ] All functional requirements validated
- [ ] All non-functional requirements validated
- [ ] GitHub integration uses explicit error codes
