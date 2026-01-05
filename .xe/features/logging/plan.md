---
id: logging
title: Logging
author: "@flanakin"
description: "This document defines the implementation plan for the Logging feature for engineers."
dependencies: []
---

<!-- markdownlint-disable single-title -->

# Implementation Plan: Logging

**Spec**: [Feature spec](./spec.md)

---

## Summary

The logging feature provides a singleton Logger with configurable verbosity levels, enabling users to debug playbook execution with `-v` through `-vvvv` flags. A `ConsoleLogger` implementation outputs color-formatted messages to console, with secret masking integration. Features access the logger via `Logger.getInstance()` and log at appropriate levels (error, warning, info, verbose, debug, trace).

**Design rationale**: See `research.md` for singleton pattern justification and verbosity level mapping.

---

## Technical Context

- **Primary Components**: `Logger` (interface + singleton), `ConsoleLogger` (implementation), `LogLevel` (enum)
- **Data Structures**: LogLevel enum with numeric values for comparison
- **Dependencies**: None (Tier 1 feature)
- **Configuration**: Log level set at initialization via CLI flag parsing
- **Performance Goals**: <1ms for filtered (no-op) log calls, <5ms for output calls
- **Testing Framework**: Vitest with mocked console
- **Key Constraints**: Single initialization only, thread-safe getInstance()

---

## Project Structure

```text
src/core/logging/
  index.ts            # Public exports
  types.ts            # LogLevel enum, Logger interface
  logger.ts           # Singleton accessor and initialization
  console-logger.ts   # ConsoleLogger implementation
tests/unit/core/logging/
  logger.test.ts      # Singleton behavior tests
  console-logger.test.ts  # Output formatting tests
```

---

## Data Model

**Entities owned by this feature:**

- **LogLevel**: Enum with numeric values
  - `silent` = -1
  - `error` = 0
  - `warning` = 1
  - `info` = 1
  - `verbose` = 2
  - `debug` = 3
  - `trace` = 4

**Entities from other features:**

- **SecretManager** (playbook-template-engine): Optional masking integration

---

## Contracts

### LogLevel Enum

```typescript
export enum LogLevel {
  silent = -1,
  error = 0,
  warning = 1,
  info = 1,
  verbose = 2,
  debug = 3,
  trace = 4
}
```

### Logger Interface

```typescript
export interface Logger {
  error(message: string, data?: unknown): void;
  warning(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  verbose(message: string, data?: unknown): void;
  debug(message: string, data?: unknown): void;
  trace(message: string, data?: unknown): void;
}
```

### Logger Singleton

```typescript
export class LoggerSingleton {
  static getInstance(): Logger;
  static initialize(logger: Logger): void;
  static reset(): void;  // Testing only
}
```

**Purpose**: Provide global logger access with secure single initialization.

**Errors**:

- `initialize()` throws `CatalystError` with code `LoggerAlreadyInitialized` if called twice

### ConsoleLogger

```typescript
export class ConsoleLogger implements Logger {
  constructor(level: LogLevel, secretManager?: SecretManager);
}
```

**Purpose**: Console output with color formatting and level filtering.

**Parameters**:

- `level` (LogLevel): Maximum level to output
- `secretManager` (SecretManager, optional): For masking secrets in output

---

## Implementation Approach

### 1. Data Structures

**LogLevel enum** uses numeric values enabling simple comparison:

```typescript
if (this.level >= LogLevel.debug) {
  // Output debug message
}
```

### 2. Core Algorithms

**Log method execution flow:**

1. Check if current level >= method's level
2. If filtered out, return immediately (no-op)
3. Format message with level prefix (e.g., `[debug]`)
4. If data provided, JSON-serialize it
5. Apply secret masking to message and serialized data
6. Apply ANSI color codes based on level
7. Output to stderr (error/warning) or stdout (others)

**Singleton initialization flow:**

1. On `initialize(logger)`:
   - Check if already initialized
   - If yes, throw `LoggerAlreadyInitialized`
   - Store logger instance
2. On `getInstance()`:
   - If initialized, return stored instance
   - If not, return NoOpLogger (silent logger)

### 3. Integration Points

**Consumed by:**

- `error-handling`: Error output
- `catalyst-cli`: Initialization and verbosity flag parsing
- `playbook-engine`: Step execution logging
- `playbook-template-engine`: Expression evaluation logging
- `playbook-actions-controls`: Branch decision logging

**Depends on:**

- None (Tier 1)

### 4. Error Handling

- **LoggerAlreadyInitialized**: Thrown if `initialize()` called twice
- **Serialization failures**: Catch JSON.stringify errors, output `[unserializable]`
- **Console errors**: Let propagate (terminal issue)

### 5. Performance Considerations

- Level check is first operation (fast path for filtered logs)
- No string formatting if level is filtered
- Data serialization only when needed
- No memory allocation for filtered calls

### 6. Testing Strategy

**Unit tests:**

- Singleton initialization behavior
- Double-initialization error
- Reset for test isolation
- Level filtering (each level)
- Output formatting with colors
- Secret masking integration
- Data serialization

**Coverage target**: >90%

### 7. Documentation Plan

- **Target Audience**: Feature developers
- **Documentation Type**: API reference in code comments
- **Location**: Inline JSDoc, no separate docs needed for internal feature

---

## Usage Examples

### Basic Usage

```typescript
import { Logger } from '@core/logging';

// In any feature code
const logger = Logger.getInstance();
logger.info('Processing playbook', { name: 'hello' });
logger.debug('Template interpolation', { before: template, after: result });
```

### CLI Initialization

```typescript
import { Logger, ConsoleLogger, LogLevel } from '@core/logging';

// In CLI entry point
const level = countVerboseFlags(args);  // -v=1, -vv=2, etc.
Logger.initialize(new ConsoleLogger(level));
```
