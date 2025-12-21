---
id: logging
title: Logging
author: "@flanakin"
description: "Logging infrastructure for consistent, leveled output across all Catalyst features"
dependencies: []
---

<!-- markdownlint-disable single-title -->

# Feature: Logging

## Problem

Features need consistent logging with configurable verbosity levels to help users debug issues and understand execution flow. Without a shared logging foundation, each feature implements its own console output, leading to inconsistent formatting, no verbosity control, and difficulty diagnosing issues like incorrect template interpolation.

## Goals

- Provide standard logging interface with configurable verbosity levels
- Enable users to increase output detail for debugging without code changes
- Ensure consistent log formatting and output across all features

Explicit non-goals:

- File-based logging or log rotation (CLI outputs to console only)
- Remote log aggregation or telemetry
- Structured logging formats (JSON, etc.) for machine consumption

## Scenario

- As a **User**, I need to see what's happening during playbook execution when debugging issues
  - Outcome: Running with `-v` or higher shows progressively more execution detail

- As a **Developer**, I need to log messages at appropriate verbosity levels
  - Outcome: Logger interface provides level-specific methods (info, debug, trace, etc.)

- As a **Framework Developer**, I need to initialize logging at application startup
  - Outcome: Secure singleton pattern ensures only CLI entry point can configure the logger

## Success Criteria

- All log output uses consistent formatting with level prefixes
- Verbosity levels filter output correctly (higher levels include lower level messages)
- Logger initialization is secure (single initialization at startup)
- Secret values are masked in all log output

## Requirements

### Functional Requirements

**FR-1**: LogLevel Enum

- **FR-1.1**: System MUST provide `LogLevel` enum with the following values and numeric levels:
  - `silent` = -1 (no output)
  - `error` = 0 (errors only)
  - `warning` = 1 (warnings and errors)
  - `info` = 1 (info, warnings, errors - same level as warning)
  - `verbose` = 2 (verbose output)
  - `debug` = 3 (debug output)
  - `trace` = 4 (trace output - maximum detail)
- **FR-1.2**: Higher numeric levels MUST include all lower level output

**FR-2**: Logger Interface

- **FR-2.1**: System MUST provide `Logger` interface with log methods:

  ```typescript
  interface Logger {
    error(message: string, data?: unknown): void;
    warning(message: string, data?: unknown): void;
    info(message: string, data?: unknown): void;
    verbose(message: string, data?: unknown): void;
    debug(message: string, data?: unknown): void;
    trace(message: string, data?: unknown): void;
  }
  ```

- **FR-2.2**: Each method MUST only output if current level >= method's level
- **FR-2.3**: Each method MUST format output with level prefix (e.g., `[debug]`)
- **FR-2.4**: The `data` parameter MUST be JSON-serialized when provided
- **FR-2.5**: All output MUST have secrets masked before display

**FR-3**: Singleton Logger Access

- **FR-3.1**: System MUST provide `Logger.getInstance()` static method returning current logger
- **FR-3.2**: System MUST provide `Logger.initialize(impl: Logger)` static method for configuration
- **FR-3.3**: `initialize()` MUST throw if called more than once (secure registration)
- **FR-3.4**: `getInstance()` MUST return a no-op logger if not initialized
- **FR-3.5**: System MUST provide `Logger.reset()` for testing purposes only

**FR-4**: ConsoleLogger Implementation

- **FR-4.1**: System MUST provide `ConsoleLogger` class implementing `Logger` interface
- **FR-4.2**: Constructor MUST accept `level: LogLevel` parameter
- **FR-4.3**: Output MUST use ANSI colors when terminal supports it:
  - `error`: red
  - `warning`: yellow
  - `info`: cyan
  - `verbose`: dim/gray
  - `debug`: dim/gray
  - `trace`: dim/gray
- **FR-4.4**: Output MUST go to stderr for error/warning, stdout for others

**FR-5**: Secret Masking Integration

- **FR-5.1**: Logger MUST accept optional `SecretManager` for masking sensitive values
- **FR-5.2**: All log output (message and data) MUST be masked before display
- **FR-5.3**: If no SecretManager provided, output MUST proceed unmasked

### Non-functional requirements

- **NFR-1**: Performance
  - Log method calls <1ms when level filtering skips output
  - Log method calls <5ms when outputting (including serialization)

- **NFR-2**: Testability
  - Logger must be mockable via interface
  - Reset capability for test isolation

## Key Entities

Entities owned by this feature:

- **LogLevel**: Enum defining verbosity levels with numeric values for comparison
- **Logger**: Interface defining log methods for each level
- **ConsoleLogger**: Default implementation outputting to console with colors

Entities from other features:

- **SecretManager** (playbook-template-engine): Optional integration for masking secrets in output

## Dependencies

**Feature Dependencies:**

None (Tier 1 foundational feature)

**External Dependencies:**

- **Node.js >= 18**: Console API and TTY detection
