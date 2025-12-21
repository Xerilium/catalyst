# Logging Feature Research

**Date**: 2025-12-21

## Design Decisions

### Decision: Singleton with Secure Initialization

**Rationale**: A singleton pattern allows any feature to access the logger without dependency injection complexity. Secure initialization (single `initialize()` call) ensures only the CLI entry point can configure the logger, preventing malicious logger injection.

**Alternatives Considered**:

1. **Dependency Injection** - Pass logger to every class/function
   - Pro: More testable, explicit dependencies
   - Con: Verbose, requires threading logger through entire call stack
   - Rejected: Too invasive for cross-cutting concern

2. **Global Variable** - Simple module-level logger
   - Pro: Simple
   - Con: No initialization control, hard to test
   - Rejected: Security concerns with uncontrolled registration

### Decision: Verbosity Levels (-v/-vv/-vvv/-vvvv)

**Rationale**: Following common CLI conventions (ssh, curl, ansible), incrementing `-v` flags increases verbosity. This is intuitive for users and allows fine-grained control without complex flag combinations.

**Level Mapping**:

- `-v` (level 1): info, warning, error - High-level flow information
- `-vv` (level 2): + verbose - Step execution, branch decisions
- `-vvv` (level 3): + debug - Template interpolation details
- `-vvvv` (level 4): + trace - Expression evaluation, all internal state

### Decision: Source Location in src/core/logging/

**Rationale**: Logging is foundational infrastructure alongside `src/core/errors/`. Both are Tier 1 features with no dependencies that other features build upon.

## Code Paths Analyzed

### Current Console Usage

- `src/cli/index.ts` - Uses `console.error()` for errors
- `src/cli/commands/run.ts` - Uses `console.log()` with formatInfo/formatSuccess
- `src/cli/utils/output.ts` - Provides color formatting utilities
- `src/playbooks/engine/engine.ts` - Uses `console.error()` in catch blocks

### Output Utilities Available

From `src/cli/utils/output.ts`:

- `formatSuccess()` - Green checkmark
- `formatInfo()` - Cyan arrow
- `formatWarning()` - Yellow warning
- `formatErrorMessage()` - Red X
- `formatDim()` - Dimmed text
- `shouldUseColors()` - TTY detection
