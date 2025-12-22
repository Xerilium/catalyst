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

- **FR:level**: LogLevel Enum requirements
  - **FR:level.values**: System MUST provide `LogLevel` enum with the following values and numeric levels:
    - `silent` = -1 (no output)
    - `error` = 0 (errors only)
    - `warning` = 1 (warnings and errors)
    - `info` = 1 (info, warnings, errors - same level as warning)
    - `verbose` = 2 (verbose output)
    - `debug` = 3 (debug output)
    - `trace` = 4 (trace output - maximum detail)
  - **FR:level.hierarchy**: Higher numeric levels MUST include all lower level output

- **FR:interface**: Logger Interface requirements
  - **FR:interface.methods**: System MUST provide `Logger` interface with log methods:

    ```typescript
    interface Logger {
      error(source: string, action: string, message: string, data?: Record<string, unknown>): void;
      warning(source: string, action: string, message: string, data?: Record<string, unknown>): void;
      info(source: string, action: string, message: string, data?: Record<string, unknown>): void;
      verbose(source: string, action: string, message: string, data?: Record<string, unknown>): void;
      debug(source: string, action: string, message: string, data?: Record<string, unknown>): void;
      trace(source: string, action: string, message: string, data?: Record<string, unknown>): void;
    }
    ```

  - **FR:interface.source**: The `source` parameter identifies the component doing the logging (e.g., "Engine", "GitHubAction")
  - **FR:interface.action**: The `action` parameter identifies the operation being performed (e.g., "execute", "validate")
  - **FR:interface.data**: The `data` parameter is a dictionary of action-specific data for measurement and analysis
  - **FR:interface.filtering**: Each method MUST only output if current level >= method's level
  - **FR:interface.format**: Output format MUST be: `{prefix}{source}.{action}: {message} {data}`
  - **FR:interface.serialization**: The `data` parameter MUST be JSON-serialized when provided
  - **FR:interface.masking**: All output MUST have secrets masked before display

- **FR:singleton**: Singleton Logger Access requirements
  - **FR:singleton.getInstance**: System MUST provide `Logger.getInstance()` static method returning current logger
  - **FR:singleton.initialize**: System MUST provide `Logger.initialize(impl: Logger)` static method for configuration
  - **FR:singleton.secure**: `initialize()` MUST throw if called more than once (secure registration)
  - **FR:singleton.noOp**: `getInstance()` MUST return a no-op logger if not initialized
  - **FR:singleton.reset**: System MUST provide `Logger.reset()` for testing purposes only

- **FR:config**: Log Configuration requirements
  - **FR:config.levels**: System MUST define a `LOG_LEVEL_CONFIG` dictionary with per-level format settings:
    - Each level MUST have: `icon` (emoji/unicode), `text` (label string), `color` (ANSI color name)
    - Defaults: error=❌/ERROR/red, warning=⚠️/WARN/yellow, info=ℹ️/INFO/blue, verbose=🔍/VERB/gray, debug=🐛/DEBUG/magenta, trace=🧵/TRACE/cyan
  - **FR:config.options**: System MUST define a `LOG_OUTPUT_CONFIG` object with display options:
    - `showIcon` (bool): Whether to output icon before text (default: true)
    - `showText` (bool): Whether to output text label after icon (default: true)
    - `useColor` (bool): Whether to apply ANSI colors (default: true, respects NO_COLOR and TTY)
    - `fullColorThreshold` (LogLevel | null): Log level at/above which full-line color applies (default: LogLevel.warning; null = prefix only)
    - `defaultColor` (ColorName | null): Color for message text when not using full-line color (default: 'gray'; null = no color)
    - `alignText` (bool): Whether to pad text labels for consistent alignment (default: true)
  - **FR:config.format**: Log prefix format MUST be: `{icon}{space}{text}{pad}{separator}` where:
    - `{icon}` is the level icon (if showIcon is true)
    - `{space}` is a single space (only if both showIcon and showText are true)
    - `{text}` is the level text label (if showText is true)
    - `{pad}` is padding spaces for alignment (if showText and alignText are true)
    - `{separator}` is colon-space (only if showText is true)

- **FR:console**: ConsoleLogger Implementation requirements
  - **FR:console.interface**: System MUST provide `ConsoleLogger` class implementing `Logger` interface
  - **FR:console.level**: Constructor MUST accept `level: LogLevel` parameter
  - **FR:console.config**: ConsoleLogger MUST use LOG_LEVEL_CONFIG and LOG_OUTPUT_CONFIG for formatting
  - **FR:console.colors**: Output MUST use ANSI colors when terminal supports it and useColor is true:
    - `error`: red
    - `warning`: yellow
    - `info`: blue
    - `verbose`: gray
    - `debug`: magenta
    - `trace`: cyan
  - **FR:console.streams**: Output MUST go to stderr for error/warning, stdout for others

- **FR:secrets**: Secret Masking Integration requirements
  - **FR:secrets.manager**: Logger MUST accept optional `SecretManager` for masking sensitive values
  - **FR:secrets.mask**: All log output (message and data) MUST be masked before display
  - **FR:secrets.fallback**: If no SecretManager provided, output MUST proceed unmasked

### Non-functional requirements

- **NFR:performance**: Performance requirements
  - **NFR:performance.filtered**: Log method calls MUST complete in <1ms when level filtering skips output
  - **NFR:performance.output**: Log method calls MUST complete in <5ms when outputting (including serialization)

- **NFR:testability**: Testability requirements
  - **NFR:testability.mock**: Logger MUST be mockable via interface
  - **NFR:testability.reset**: Reset capability MUST be available for test isolation

## Key Entities

Entities owned by this feature:

- **LogLevel**: Enum defining verbosity levels with numeric values for comparison
- **Logger**: Interface defining log methods for each level
- **LogLevelConfig**: Per-level configuration (icon, text, color) for formatting
- **LogOutputConfig**: Global output options (showIcon, showText, useColor, fullColorThreshold, defaultColor, alignText)
- **ConsoleLogger**: Default implementation outputting to console with configurable formatting

Entities from other features:

- **SecretManager** (playbook-template-engine): Optional integration for masking secrets in output

## Dependencies

**Feature Dependencies:**

None (Tier 1 foundational feature)

**External Dependencies:**

- **Node.js >= 18**: Console API and TTY detection
