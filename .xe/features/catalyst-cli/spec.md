---
id: catalyst-cli
title: Catalyst CLI
dependencies:
  - playbook-definition
  - playbook-engine
  - error-handling
  - req-traceability
---

<!-- markdownlint-disable single-title -->

# Feature: Catalyst CLI

## Purpose

Provide a minimal command-line interface for executing Catalyst playbooks directly, establishing the CLI framework for future command expansion, and enabling manual testing of the playbook engine without AI mediation.

## Scenarios

### FR:cli: CLI Framework

Developer needs to interact with Catalyst from the terminal so that playbooks can be executed, inspected, and debugged without AI mediation.

- **FR:cli.entry** (P1): System MUST provide single CLI entry point
  - Command: `npx catalyst` or `catalyst` (if globally installed)
  - Package: `@xerilium/catalyst` with `bin.catalyst` in package.json

- **FR:cli.help** (P2): System MUST provide help information
  - `catalyst --help` or `catalyst -h` lists available commands with descriptions
  - `catalyst run --help` shows run command options
  - Running `catalyst` with no arguments shows help

- **FR:cli.version** (P3): System MUST display version information
  - `catalyst --version` or `catalyst -v` shows package version

- **FR:cli.banner** (P3): System MUST display ASCII art banner on help
  - Banner shown with `catalyst --help` output
  - Banner NOT shown on `catalyst run` or error output
  - Banner respects `--quiet` flag (suppressed when quiet)

- **FR:cli.dynamic** (P2): System MUST expose playbooks as first-class commands
  - Playbooks in `src/resources/cli-commands/` directory become CLI commands
  - Command name derived from filename (e.g., `init.yaml` → `catalyst init`)
  - CLI discovers `.yaml` and `.yml` files in the directory
  - CLI passes full path to `PlaybookProvider.loadPlaybook()` for loading
  - CLI uses `Engine.run()` for execution (via existing `runCommand()`)
  - Commands appear in `catalyst --help` output

- **FR:cli.dynamic.what-if** (P3): Dynamic commands MUST accept `--what-if` flag
  - `catalyst <command> --what-if` passes `mode: 'what-if'` to `Engine.run()`
  - Behavior is identical to `catalyst run <playbook-id> --what-if`

- **FR:cli.global** (P2): System MUST provide global options inherited by all commands
  - `-q, --quiet`: Suppress all output except errors
  - `--json`: Output in compact JSON format (for piping to `jq`)
  - `-v, --verbose`: Enable verbose output (stackable: `-v`, `-vv`, `-vvv`, `-vvvv`)
  - `--debug`: Enable debug output (same as `-vvv`)

### FR:run: Run Command

Developer needs to execute playbooks by ID from the command line so that workflows can be tested and debugged.

- **FR:run.execute** (P1): System MUST execute playbooks by ID
  - Command: `catalyst run <playbook-id> [--input key=value...]`
  - Inputs passed as repeatable `--input` or `-i` flags
  - Uses `PlaybookProvider.loadPlaybook()` for discovery
  - Uses `Engine.run()` for execution

- **FR:run.output** (P2): System MUST display playbook execution output
  - Show playbook name and status on start
  - Stream step output as playbook executes
  - Show final status (success/failure) on completion
  - Display return outputs to stdout:
    - Primitives (string, number, boolean): print value directly
    - Objects/arrays: print as pretty-printed JSON (default) or compact JSON with `--json` flag
    - No outputs: show success message via logger
  - `--json` flag outputs compact JSON (single line, pipeable to `jq`)

- **FR:run.what-if** (P3): System MUST support what-if mode via `--what-if` flag
  - `catalyst run <playbook-id> --what-if` passes `mode: 'what-if'` to `Engine.run()`
  - What-if mode returns step metadata without executing actions
  - Output displays the what-if summary (step names, action types, variable references, protocol paths)
  - Escaped template references (`\{{var}}`, `\{{var\}}`) MUST be excluded — they are literal text, not data flow

### FR:traceability: Traceability Command

Developer needs to analyze requirements traceability from the CLI so that coverage gaps can be identified without manual inspection.

- **FR:traceability.execute** (P2): System MUST run traceability analysis from the CLI
  - Command: `catalyst traceability [feature] [--min-priority P1-P5]`
  - Calls `runTraceabilityAnalysis()` from `req-traceability` feature directly
  - Optional `[feature]` argument filters to a single feature by ID, path, or wildcard pattern
  - Feature argument accepts paths (e.g., `.xe/features/foo/spec.md`) and extracts the feature ID
  - Feature argument supports wildcard patterns (`*` and `?`) to match multiple features (e.g., `ai-provider*`)
  - Wildcard matches produce separate reports for each matching feature

- **FR:traceability.output** (P2): System MUST display traceability report
  - Default: terminal-formatted report via `generateTerminalReport()`
  - `--json`: JSON report via `generateJsonReport()`
  - `--quiet`: suppress all output except errors
  - Feature filter: prepend header with feature name

- **FR:traceability.priority** (P3): System MUST support priority filtering
  - `--min-priority <P1-P5>` filters requirements by priority level
  - Invalid priority values produce `InvalidPriority` error (exit code 2)

- **FR:traceability.thresholds** (P2): System MUST enforce coverage thresholds
  - Exit code 1 when `thresholdsMet` is false (from traceability analysis)
  - Exit code 0 on success

### FR:exit: Exit Codes

Developer needs predictable exit codes so that CLI operations can be automated in CI pipelines.

- **FR:exit.codes** (P1): System MUST use standard exit codes
  - `0`: Success
  - `1`: General error (playbook failure, runtime error)
  - `2`: Invalid usage/arguments (bad command, missing required input)

### FR:errors: CLI Error Codes

Developer needs clear, actionable error messages so that problems can be diagnosed and fixed quickly.

System MUST throw CatalystError with these codes for CLI-specific errors:

| Code                         | Message                                | Guidance                                                                                      | Exit Code |
| ---------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------- | --------- |
| `PlaybookNotFound`           | Playbook "{id}" not found              | Check playbook ID or specify the full path. Run `catalyst run --help` to see discovery paths. | 1         |
| `InvalidInput`               | Invalid input format: "{value}"        | Playbook inputs must be in key=value format. Example: `--input name=value`                    | 2         |
| `MissingPlaybookId`          | No playbook ID provided                | Usage: `catalyst run <playbook-id> [--input key=value...]`                                    | 2         |
| `PlaybookExecutionFailed`    | Playbook "{id}" failed: {reason}       | Check playbook output above for details.                                                      | 1         |
| `InvalidPriority`            | Invalid priority: "{value}"            | Priority must be one of: P1, P2, P3, P4, P5                                                   | 2         |
| `TraceabilityAnalysisFailed` | Traceability analysis failed: {reason} | Check output above for details.                                                               | 1         |

- **FR:errors.format** (P2): System MUST display errors in stack-trace style format
  - Each error shows: `{message} ({code})`
  - Nested errors display indented with `↳` prefix to show causation chain
  - Guidance text appears on a separate line below the error chain
  - Example output:

    ```text
    Playbook "hello" failed: The hello command failed (PlaybookExecutionFailed)
      ↳ The hello command failed (WrappedFailure)
        ↳ This is a test error message (TestError)

    Check playbook output above for details.
    ```

Note: These codes extend the error-handling feature. Other errors (e.g., `PlaybookNotFound` from PlaybookProvider) pass through unchanged.

### Non-functional Requirements

- **NFR:compat.node** (P1): CLI MUST work with Node.js >= 18
- **NFR:compat.platforms** (P2): CLI MUST work on macOS, Linux, and Windows
- **NFR:compat.terminals** (P3): CLI MUST work in common terminals (bash, zsh, fish, PowerShell, cmd)
- **NFR:perf.startup** (P3): CLI MUST start in under 500ms for `--help` and `--version`
- **NFR:ux.colors** (P4): CLI SHOULD use colors for emphasis (respects `NO_COLOR` env var)
- **NFR:ux.progress** (P4): CLI SHOULD show progress for long-running operations (spinner for TTY, logs for non-TTY)
- **NFR:test.unit** (P2): CLI module MUST have unit tests for argument parsing
- **NFR:test.integration** (P2): CLI module MUST have integration tests for playbook execution

## Architecture Constraints

- **Fail fast with guidance**: Commands MUST fail immediately when inputs are invalid, but error messages MUST explain what went wrong and how to fix it.
- **Human-first output**: Default output optimizes for human readability. Machine output (`--json`) available for piping.
- **Minimal surface area**: Start with the smallest useful CLI. Add commands only when underlying features are ready.

## Dependencies

**Internal:**

- **playbook-definition**: CLI uses PlaybookProvider for playbook discovery and loading
- **playbook-engine**: CLI uses Engine for playbook execution (including what-if mode)
- **error-handling**: CLI uses CatalystError for error reporting
- **req-traceability**: CLI uses runTraceabilityAnalysis() and report generators for traceability command

**External:**

None required.
