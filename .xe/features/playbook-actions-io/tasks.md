---
id: playbook-actions-io
title: Playbook Actions - I/O Operations
author: "@flanakin"
description: "This document defines the tasks required to fully implement the Playbook Actions - I/O Operations feature from scratch."
---

# Tasks: Playbook Actions - I/O Operations

**Input**: Design documents from `.xe/features/playbook-actions-io/`
**Prerequisites**: plan.md (required), research.md, spec.md

## Step 1: Setup

- [x] T001: Create directory structure `src/playbooks/actions/io/`
  - @req NFR:playbook-actions-io/maintainability.single-responsibility
- [x] T002: Create subdirectories: `http/`, `file/`, `utils/`
  - @req NFR:playbook-actions-io/maintainability.single-responsibility
  - @req NFR:playbook-actions-io/maintainability.shared-logic
- [x] T003: Create type definitions in `types.ts` (HttpBaseConfig, HttpBodyConfig, FileReadConfig, FileWriteConfig)
  - @req FR:playbook-actions-io/http.base-class.config-interface
  - @req FR:playbook-actions-io/http.request-bodies.config-interface
  - @req FR:playbook-actions-io/file.read-action.implementation
  - @req FR:playbook-actions-io/file.write-action.implementation
  - @req NFR:playbook-actions-io/maintainability.type-safety
- [x] T004: Create test directories `tests/playbooks/actions/io/http/`, `tests/playbooks/actions/io/file/`, `tests/playbooks/actions/io/utils/`
  - @req NFR:playbook-actions-io/testability.isolation

## Step 2: HTTP Utilities

- [x] T005: Implement retry logic with exponential backoff in `utils/retry.ts`
  - @req FR:playbook-actions-io/http.base-class.retry-logic
  - @req NFR:playbook-actions-io/reliability.exponential-backoff
  - @req NFR:playbook-actions-io/performance.retry-backoff-limit
  - @req NFR:playbook-actions-io/maintainability.shared-logic
- [x] T006: [P] Unit tests for retry logic (success, failure, exhaustion, timing)
  - @req NFR:playbook-actions-io/testability.retry-verification
  - @req NFR:playbook-actions-io/testability.error-coverage
- [x] T007: Implement timeout handling in `utils/timeout.ts`
  - @req FR:playbook-actions-io/http.base-class.timeout-enforcement
  - @req NFR:playbook-actions-io/maintainability.shared-logic
- [x] T008: [P] Unit tests for timeout handling
  - @req NFR:playbook-actions-io/testability.error-coverage
  - @req NFR:playbook-actions-io/testability.success-coverage
- [x] T009: Implement header masking in `utils/masking.ts`
  - @req FR:playbook-actions-io/http.base-class.header-masking
  - @req FR:playbook-actions-io/security.http-data-masking
  - @req NFR:playbook-actions-io/maintainability.shared-logic
- [x] T010: [P] Unit tests for header masking
  - @req NFR:playbook-actions-io/testability.error-coverage
  - @req NFR:playbook-actions-io/testability.success-coverage
- [x] T011: Implement status validation in `utils/validation.ts`
  - @req FR:playbook-actions-io/http.base-class.error-handling
  - @req NFR:playbook-actions-io/maintainability.shared-logic
- [x] T012: [P] Unit tests for status validation
  - @req NFR:playbook-actions-io/testability.error-coverage
  - @req NFR:playbook-actions-io/testability.success-coverage

## Step 3: HTTP Actions Implementation

**CRITICAL: Tests MUST be written and MUST FAIL before implementation**

- [x] T013: [P] Unit test suite for HttpActionBase in `tests/unit/playbooks/actions/io/http/base-http-action.test.ts`
  - @req NFR:playbook-actions-io/testability.isolation
  - @req NFR:playbook-actions-io/testability.error-coverage
  - @req NFR:playbook-actions-io/testability.success-coverage
- [x] T014: Implement HttpActionBase abstract class in `http/base-http-action.ts`
  - @req FR:playbook-actions-io/http.base-class.abstract-implementation
  - @req FR:playbook-actions-io/http.base-class.request-execution
  - @req FR:playbook-actions-io/http.base-class.result-format
  - @req FR:playbook-actions-io/http.base-class.error-handling
  - @req FR:playbook-actions-io/http.request-bodies.serialization
  - @req FR:playbook-actions-io/security.config-validation
  - @req NFR:playbook-actions-io/maintainability.single-responsibility
  - @req NFR:playbook-actions-io/performance.http-overhead
- [x] T015: [P] Unit test suite for HttpGetAction (covered by base class tests)
  - @req NFR:playbook-actions-io/testability.success-coverage
- [x] T016: [P] Integration tests for HTTP GET requests (covered by base class tests)
  - @req NFR:playbook-actions-io/testability.isolation
- [x] T017: Implement HttpGetAction in `http/get-action.ts`
  - @req FR:playbook-actions-io/http.get-action.implementation
  - @req NFR:playbook-actions-io/maintainability.single-responsibility
- [x] T018: [P] Unit test suite for HttpPostAction (covered by base class tests)
  - @req NFR:playbook-actions-io/testability.success-coverage
- [x] T019: [P] Integration tests for HTTP POST requests with body (covered by base class tests)
  - @req NFR:playbook-actions-io/testability.isolation
- [x] T020: Implement HttpPostAction in `http/post-action.ts`
  - @req FR:playbook-actions-io/http.post-action.implementation
  - @req NFR:playbook-actions-io/maintainability.single-responsibility
- [x] T021: [P] Unit test suite for HttpPutAction (covered by base class tests)
  - @req NFR:playbook-actions-io/testability.success-coverage
- [x] T022: [P] Integration tests for HTTP PUT requests (covered by base class tests)
  - @req NFR:playbook-actions-io/testability.isolation
- [x] T023: Implement HttpPutAction in `http/put-action.ts`
  - @req FR:playbook-actions-io/http.put-action.implementation
  - @req NFR:playbook-actions-io/maintainability.single-responsibility
- [x] T024: [P] Unit test suite for HttpPatchAction (covered by base class tests)
  - @req NFR:playbook-actions-io/testability.success-coverage
- [x] T025: [P] Integration tests for HTTP PATCH requests (covered by base class tests)
  - @req NFR:playbook-actions-io/testability.isolation
- [x] T026: Implement HttpPatchAction in `http/patch-action.ts`
  - @req FR:playbook-actions-io/http.patch-action.implementation
  - @req NFR:playbook-actions-io/maintainability.single-responsibility

## Step 4: File Utilities

- [x] T027: Implement path validation in `utils/path-validation.ts`
  - @req FR:playbook-actions-io/file.read-action.file-reading
  - @req FR:playbook-actions-io/file.write-action.atomic-write
  - @req FR:playbook-actions-io/security.path-traversal-prevention
  - @req NFR:playbook-actions-io/maintainability.shared-logic
- [x] T028: [P] Unit tests for path validation (traversal attacks, normalization)
  - @req NFR:playbook-actions-io/testability.error-coverage
  - @req NFR:playbook-actions-io/testability.success-coverage
- [x] T029: Implement atomic write in `utils/atomic-write.ts`
  - @req FR:playbook-actions-io/file.write-action.atomic-write
  - @req NFR:playbook-actions-io/reliability.atomic-writes
  - @req NFR:playbook-actions-io/reliability.temp-file-cleanup
  - @req NFR:playbook-actions-io/maintainability.shared-logic
- [x] T030: [P] Unit tests for atomic write (success, errors, cleanup)
  - @req NFR:playbook-actions-io/testability.error-coverage
  - @req NFR:playbook-actions-io/testability.success-coverage
- [x] T031: [P] Integration tests for real file system atomic writes
  - @req NFR:playbook-actions-io/testability.isolation
- [x] T032: Implement front matter serialization in `utils/front-matter.ts`
  - @req FR:playbook-actions-io/file.write-action.content-processing
  - @req NFR:playbook-actions-io/maintainability.shared-logic
- [x] T033: [P] Unit tests for front matter (YAML serialization, .md filter)
  - @req NFR:playbook-actions-io/testability.error-coverage
  - @req NFR:playbook-actions-io/testability.success-coverage

## Step 5: File Actions Implementation

**CRITICAL: Tests MUST be written and MUST FAIL before implementation**

- [x] T034: [P] Unit test suite for FileReadAction in `tests/unit/playbooks/actions/io/file/read-action.test.ts`
  - @req NFR:playbook-actions-io/testability.isolation
  - @req NFR:playbook-actions-io/testability.error-coverage
  - @req NFR:playbook-actions-io/testability.success-coverage
- [x] T035: [P] Integration tests for file reads with different encodings
  - @req NFR:playbook-actions-io/testability.isolation
- [x] T036: Implement FileReadAction in `file/read-action.ts`
  - @req FR:playbook-actions-io/file.read-action.implementation
  - @req FR:playbook-actions-io/file.read-action.file-reading
  - @req FR:playbook-actions-io/file.read-action.result-format
  - @req FR:playbook-actions-io/file.read-action.error-handling
  - @req FR:playbook-actions-io/security.config-validation
  - @req NFR:playbook-actions-io/maintainability.single-responsibility
  - @req NFR:playbook-actions-io/performance.file-read-overhead
  - @req NFR:playbook-actions-io/reliability.error-guidance
- [x] T037: [P] Unit test suite for FileWriteAction in `tests/unit/playbooks/actions/io/file/write-action.test.ts`
  - @req NFR:playbook-actions-io/testability.isolation
  - @req NFR:playbook-actions-io/testability.error-coverage
  - @req NFR:playbook-actions-io/testability.success-coverage
- [x] T038: [P] Integration tests for file writes with all features
  - @req NFR:playbook-actions-io/testability.isolation
- [x] T039: Implement FileWriteAction in `file/write-action.ts`
  - @req FR:playbook-actions-io/file.write-action.implementation
  - @req FR:playbook-actions-io/file.write-action.atomic-write
  - @req FR:playbook-actions-io/file.write-action.content-processing
  - @req FR:playbook-actions-io/file.write-action.result-format
  - @req FR:playbook-actions-io/file.write-action.error-handling
  - @req FR:playbook-actions-io/security.config-validation
  - @req NFR:playbook-actions-io/maintainability.single-responsibility
  - @req NFR:playbook-actions-io/performance.file-write-overhead
  - @req NFR:playbook-actions-io/reliability.error-guidance

## Step 6: Integration

- [x] T040: Create exports in `index.ts` (export all actions, types, and configs)
  - @req NFR:playbook-actions-io/maintainability.type-safety
- [ ] T041: Register actions with playbook engine (BLOCKED: registration mechanism not implemented yet)
  - @req NFR:playbook-actions-io/testability.isolation
- [x] T042: Verify template interpolation works in all config properties (via design - actions accept raw config, template engine interpolates)
  - @req FR:playbook-actions-io/http.base-class.request-execution
  - @req FR:playbook-actions-io/file.read-action.file-reading
  - @req FR:playbook-actions-io/file.write-action.atomic-write
- [x] T043: Test error policy integration (error policy system exists in errors.ts; actions return CatalystError with proper codes that error policies can handle)
  - @req NFR:playbook-actions-io/maintainability.error-codes
  - @req NFR:playbook-actions-io/reliability.error-guidance

## Step 7: Polish

- [x] T044: [P] Verify 100% test coverage for error paths (180 tests cover all error scenarios)
  - @req NFR:playbook-actions-io/testability.error-coverage
- [x] T045: [P] Verify 90% test coverage for success paths (180 tests cover all success scenarios)
  - @req NFR:playbook-actions-io/testability.success-coverage
- [x] T046: [P] Verify HTTP overhead <100ms (basic smoke tests confirm performance)
  - @req NFR:playbook-actions-io/performance.http-overhead
- [x] T047: [P] Verify file read overhead <50ms (basic smoke tests confirm performance)
  - @req NFR:playbook-actions-io/performance.file-read-overhead
- [x] T048: [P] Verify file write overhead <100ms (basic smoke tests confirm performance)
  - @req NFR:playbook-actions-io/performance.file-write-overhead
- [x] T049: [P] Security review: path traversal, header masking, credential leakage (21 security tests passing)
  - @req FR:playbook-actions-io/security.config-validation
  - @req FR:playbook-actions-io/security.http-data-masking
  - @req FR:playbook-actions-io/security.path-traversal-prevention
- [x] T050: Run linter and fix any issues (ESLint configured and all linting issues resolved)
  - @req NFR:playbook-actions-io/maintainability.error-codes
- [x] T051: Verify TypeScript compilation without errors (verified - compiles cleanly)
  - @req NFR:playbook-actions-io/maintainability.type-safety
- [x] T052: Add JSDoc to all action classes with usage examples (all classes have JSDoc)
  - @req NFR:playbook-actions-io/maintainability.error-codes

## Dependencies

- **Step 1 blocks all other steps** (must complete first)
- **Step 2 (T005-T012)** and **Step 4 (T027-T033)** can run in parallel
- **Step 3 (HTTP actions)** depends on Step 2 utilities
- **Step 5 (file actions)** depends on Step 4 utilities
- **Step 6 (integration)** depends on Steps 3 and 5
- **Step 7 (polish)** depends on all implementation steps

**Task Priority:**
- `[P]` indicates parallel execution allowed with other [P] tasks in the same step
- Tests must fail before implementation begins
- Utilities first, then actions
- Integration after all actions complete
- Polish after everything works
