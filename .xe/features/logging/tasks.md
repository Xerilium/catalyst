---
id: logging
title: Logging
author: "@flanakin"
description: "This document defines the tasks required to fully implement the Logging feature from scratch."
---

# Tasks: Logging

**Input**: Design documents from `.xe/features/logging/`
**Prerequisites**: plan.md (required), research.md

## Step 1: Setup

- [ ] T001: Create project structure for logging feature
  - Create `src/core/logging/` directory
  - Create `tests/unit/core/logging/` directory
  - Create `src/core/logging/index.ts` with placeholder exports

## Step 2: Tests First (TDD)

- [ ] T002: [P] Unit tests for LogLevel enum in `tests/unit/core/logging/types.test.ts`
  - @req FR:level.values
  - @req FR:level.hierarchy
  - Test numeric values for each level
  - Test level comparison works correctly

- [ ] T003: [P] Unit tests for Logger singleton in `tests/unit/core/logging/logger.test.ts`
  - @req FR:singleton.getInstance
  - @req FR:singleton.initialize
  - @req FR:singleton.secure
  - @req FR:singleton.noOp
  - @req FR:singleton.reset
  - Test getInstance returns NoOpLogger when not initialized
  - Test initialize sets the logger
  - Test double-initialize throws LoggerAlreadyInitialized
  - Test reset allows re-initialization (for testing)

- [ ] T004: [P] Unit tests for ConsoleLogger in `tests/unit/core/logging/console-logger.test.ts`
  - @req FR:interface.methods
  - @req FR:interface.filtering
  - @req FR:interface.prefix
  - @req FR:interface.serialization
  - @req FR:console.interface
  - @req FR:console.level
  - @req FR:console.colors
  - @req FR:console.streams
  - Test level filtering (messages below level are not output)
  - Test output formatting with level prefix
  - Test color application based on level
  - Test data serialization
  - Test stderr vs stdout routing

- [ ] T005: [P] Unit tests for secret masking in `tests/unit/core/logging/console-logger.test.ts`
  - @req FR:secrets.manager
  - @req FR:secrets.mask
  - @req FR:secrets.fallback
  - Test secrets are masked in message
  - Test secrets are masked in data
  - Test unmasked output when no SecretManager

## Step 3: Core Implementation

- [ ] T006: Implement LogLevel enum in `src/core/logging/types.ts`
  - @req FR:level.values
  - @req FR:level.hierarchy
  - Define enum with numeric values per plan.md

- [ ] T007: Implement Logger interface in `src/core/logging/types.ts`
  - @req FR:interface.methods
  - Define interface with all log methods

- [ ] T008: Implement Logger singleton in `src/core/logging/logger.ts`
  - @req FR:singleton.getInstance
  - @req FR:singleton.initialize
  - @req FR:singleton.secure
  - @req FR:singleton.noOp
  - @req FR:singleton.reset
  - Implement getInstance() returning stored or NoOpLogger
  - Implement initialize() with single-init guard
  - Implement reset() for testing

- [ ] T009: Implement NoOpLogger in `src/core/logging/logger.ts`
  - Create silent logger that does nothing
  - Used when Logger not initialized

- [ ] T010: Implement ConsoleLogger in `src/core/logging/console-logger.ts`
  - @req FR:console.interface
  - @req FR:console.level
  - @req FR:console.colors
  - @req FR:console.streams
  - @req FR:interface.filtering
  - @req FR:interface.prefix
  - @req FR:interface.serialization
  - Implement level filtering
  - Implement output formatting with prefixes
  - Implement color application
  - Implement stderr/stdout routing

- [ ] T011: Implement secret masking integration in ConsoleLogger
  - @req FR:secrets.manager
  - @req FR:secrets.mask
  - @req FR:secrets.fallback
  - Accept optional SecretManager in constructor
  - Apply masking to message and data before output

## Step 4: Integration

- [ ] T012: Export public API from `src/core/logging/index.ts`
  - Export LogLevel, Logger interface
  - Export Logger singleton (getInstance, initialize, reset)
  - Export ConsoleLogger

## Step 5: Polish

- [ ] T013: Verify all tests pass
  - Run test suite
  - Verify >90% coverage

- [ ] T014: Add JSDoc documentation to all public exports
  - Document LogLevel enum values
  - Document Logger interface methods
  - Document ConsoleLogger constructor

## Dependencies

- T001 before all other tasks
- T002-T005 (tests) before T006-T011 (implementation)
- T006-T011 before T012 (export)
- T012 before T013-T014 (polish)
