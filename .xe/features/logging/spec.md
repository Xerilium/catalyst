---
id: logging
title: Logging
description: Leveled console logging infrastructure with verbosity flags, color output, and secret masking.
dependencies: []
---

<!-- markdownlint-disable single-title -->

# Feature: Logging

## Purpose

Provide consistent, leveled console logging infrastructure for all Catalyst features — including configurable verbosity, color-formatted output, and secret masking — so that users can debug playbook execution with incrementing `-v` flags and developers can instrument code with structured log calls without implementing ad-hoc console output.

## Scenarios

### FR:level: Log Verbosity Levels

User needs to control output detail when debugging playbook execution so that they can progressively increase verbosity without code changes.

- **FR:level.values** (P1): System MUST provide `LogLevel` enum with the following values and numeric levels:
  - `silent` = -1 (no output)
  - `error` = 0 (errors only)
  - `warning` = 1 (warnings and errors)
  - `info` = 1 (info, warnings, errors — same level as warning)
  - `verbose` = 2 (step flow details)
  - `debug` = 3 (interpolation details)
  - `trace` = 4 (maximum detail including expression evaluation)
- **FR:level.hierarchy** (P1): Higher numeric levels MUST include all lower level output

### FR:interface: Logger Interface

Developer needs a standard logging API so that all features produce consistent, filterable output without reimplementing formatting logic.

- **FR:interface.methods** (P1): System MUST provide `Logger` interface with log methods:

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

- **FR:interface.source** (P2): The `source` parameter identifies the component doing the logging (e.g., "Engine", "GitHubAction")
- **FR:interface.action** (P2): The `action` parameter identifies the operation being performed (e.g., "execute", "validate")
- **FR:interface.data** (P3): The `data` parameter is a dictionary of action-specific data for measurement and analysis
- **FR:interface.filtering** (P1): Each method MUST only output if current level >= method's level
- **FR:interface.format** (P2): Output format MUST be: `{prefix}{source}.{action}: {message} {data}`
- **FR:interface.serialization** (P3): The `data` parameter MUST be JSON-serialized when provided
- **FR:interface.masking** (P1): All output MUST have secrets masked before display

### FR:access: Contextual Logger Access

Any feature needs a way to obtain the logger appropriate for its execution context, so that the same code can produce output through different loggers depending on who invoked it (e.g., framework runtime vs. playbook execution).

- **FR:access.current** (P1): System MUST provide a single API for any code to obtain the logger that should receive its output for the current execution
- **FR:access.default** (P1): System MUST allow the application entry point to designate a default logger used when no other logger applies; configuration MUST be possible exactly once
- **FR:access.contextual** (P1): Higher-level code MUST be able to substitute the logger that downstream callees see, for the duration of an operation, in a way that propagates to all code it invokes (including async continuations) without modifying those callees
- **FR:access.bypass** (P2): System MUST provide a way to obtain the configured default logger regardless of any active substitution, so framework-internal instrumentation can keep its output separate from substituted (e.g., user-scoped) output
- **FR:access.isolation** (P2): Concurrent operations MUST resolve their loggers independently — substitutions made by one operation MUST NOT affect another
- **FR:access.fallback** (P2): If no default has been configured and no substitution is active, the system MUST return a no-op logger so calls remain safe
- **FR:access.reset** (P3): System MUST provide a reset capability for testing only

### FR:config: Log Output Configuration

Developer needs configurable output formatting so that log output adapts to different terminal environments and preferences.

- **FR:config.levels** (P2): System MUST define a `LOG_LEVEL_CONFIG` dictionary with per-level format settings:
  - Each level MUST have: `icon` (emoji/unicode), `text` (label string), `color` (ANSI color name)
  - Defaults: error=❌/ERROR/red, warning=⚠️/WARN/yellow, info=ℹ️/INFO/blue, verbose=🔍/VERB/gray, debug=🐛/DEBUG/magenta, trace=🧵/TRACE/cyan
  - Icons with ambiguous terminal width (e.g., ℹ️) MAY include trailing space compensation
- **FR:config.options** (P2): System MUST define a `LOG_OUTPUT_CONFIG` object with display options:
  - `showIcon` (bool): Whether to output icon before text (default: false)
  - `showText` (bool): Whether to output text label (default: true)
  - `useColor` (bool): Whether to apply ANSI colors (default: true, respects NO_COLOR and TTY)
  - `fullColorThreshold` (LogLevel | null): Log level at/above which full-line color applies (default: LogLevel.warning; null = prefix only)
  - `defaultColor` (ColorName | null): Color for message text when not using full-line color (default: 'gray'; null = no color)
  - `alignText` (bool): Whether to pad text labels for consistent alignment (default: true)
- **FR:config.format** (P2): Log prefix format MUST be: `{icon}{space}{text}{pad}{separator}` where:
  - `{icon}` is the level icon (if showIcon is true)
  - `{space}` is a single space (only if both showIcon and showText are true)
  - `{text}` is the level text label (if showText is true)
  - `{pad}` is padding spaces for alignment (if showText and alignText are true)
  - `{separator}` is colon-space (only if showText is true)

### FR:console: ConsoleLogger Implementation

User needs color-formatted log output routed to the correct output stream so that errors are visually distinct and can be separated from normal output.

- **FR:console.interface** (P1): System MUST provide `ConsoleLogger` class implementing `Logger` interface
- **FR:console.level** (P1): Constructor MUST accept `level: LogLevel` parameter
- **FR:console.config** (P3): ConsoleLogger MUST use LOG_LEVEL_CONFIG and LOG_OUTPUT_CONFIG for formatting
- **FR:console.colors** (P2): Output MUST use ANSI colors when terminal supports it and useColor is true:
  - `error`: red
  - `warning`: yellow
  - `info`: blue
  - `verbose`: gray
  - `debug`: magenta
  - `trace`: cyan
- **FR:console.streams** (P2): Output MUST go to stderr for error/warning, stdout for others

### FR:multiline: Multiline Message Alignment

Developer needs aligned multiline output so that continuation lines in error messages are visually associated with their log prefix.

- **FR:multiline.indent** (P3): Multiline error messages MUST indent continuation lines to align with message content
- **FR:multiline.width** (P3): System MUST provide `getLogPrefixWidth(sourceAction)` function to calculate indent width dynamically based on current configuration
- **FR:multiline.pointer** (P4): Parse errors SHOULD include the original error message, the expression that failed, and a caret (^) pointer indicating the error position

### FR:secrets: Secret Masking Integration

User needs sensitive values masked in log output so that API tokens and credentials are never displayed in verbose logs.

- **FR:secrets.manager** (P1): Logger MUST accept optional `SecretMasker` interface for masking sensitive values
- **FR:secrets.mask** (P1): All log output (message and data) MUST be masked before display
- **FR:secrets.fallback** (P2): If no SecretMasker provided, output MUST proceed unmasked

### Non-functional Requirements

**NFR:performance**: Performance

- **NFR:performance.filtered** (P4): Log method calls MUST complete in <1ms when level filtering skips output
- **NFR:performance.output** (P4): Log method calls MUST complete in <5ms when outputting (including serialization)

**NFR:testability**: Testability

- **NFR:testability.mock** (P3): Logger MUST be mockable via interface
- **NFR:testability.reset** (P3): Reset capability MUST be available for test isolation

## Architecture Constraints

**Contextual logger resolution**
> Any code can ask for the logger appropriate to its execution context without threading a logger parameter through every call. Higher-level code can substitute the logger seen by downstream callees for the duration of an operation, while the application entry point configures a default used when no substitution is active. This lets distinct execution contexts (e.g., framework runtime vs. playbook execution) receive output through separate loggers without changing any callsite.

**Level check as fast path**
> The first operation in every log method is a numeric level comparison. If the message is filtered out, no string formatting, serialization, or memory allocation occurs. This ensures filtered log calls have near-zero overhead.

**Console output only**
> Logging outputs to stdout/stderr only. File-based logging, log rotation, remote aggregation, telemetry, and structured formats (JSON) are explicitly out of scope for a CLI tool.

## External Dependencies

None
