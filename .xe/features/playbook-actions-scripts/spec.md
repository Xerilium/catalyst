---
id: playbook-actions-scripts
title: Playbook Actions - Scripts
description: Script action primitives — JavaScript and cross-platform shell execution with timeouts and resource controls.
dependencies:
  - playbook-definition
  - error-handling
---

<!-- markdownlint-disable single-title -->

# Feature: Playbook Actions - Scripts

## Purpose

Playbooks need to execute scripts and commands in various languages and environments. This feature enables playbook developers to execute JavaScript logic for data manipulation, run shell commands for system operations and tool integration, and provides safe execution environments with timeout and resource controls. Cross-platform shell scripting is supported via Bash on Unix/Linux and PowerShell on Windows.

## Scenarios

### FR:common: Common Requirements for All Script Actions

Playbook author needs consistent validation, working directory resolution, timeout enforcement, and result structure across all script actions so that script execution is predictable and reliable.

- **FR:common.validation** (P2): All actions MUST validate configuration before execution
  - Missing required `code` property MUST throw CatalystError with code '{Action}ConfigInvalid'
  - Invalid timeout values (<0) MUST throw CatalystError with code '{Action}ConfigInvalid'

- **FR:common.working-directory** (P2): All actions MUST validate and resolve working directory
  - Non-existent `cwd` MUST throw CatalystError with code '{Action}InvalidCwd'
  - Relative paths MUST be resolved against repository root

  - **FR:common.working-directory.default** (P2): All actions MUST default `cwd` to repository root when not specified

- **FR:common.timeout** (P2): All actions MUST enforce timeout limits
  - Execution MUST terminate if timeout is exceeded
  - Timeout errors MUST throw CatalystError with code '{Action}Timeout'

- **FR:common.result-structure** (P1): All actions MUST return PlaybookActionResult with the following:
  > - @req FR:playbook-definition/types.action.interface
  - `code`: 'Success' if execution succeeded, error code otherwise
  - `message`: Human-readable execution status
  - `value`: Action-specific output (script return value or shell result)
  - `error`: CatalystError if execution failed, null otherwise

- **FR:common.template-interpolation** (P1): All actions MUST support `{{variable-name}}` template interpolation
  - Template engine performs interpolation BEFORE action execution
  - Actions receive config with variables already replaced

### FR:script: Script-Run Action (JavaScript Execution)

Playbook author needs to execute JavaScript logic for complex data processing so that workflows can perform data manipulation with file system access and playbook variable access.

- **FR:script.interface** (P1): System MUST provide `script` action implementing `PlaybookAction<ScriptConfig>`
  - Config interface: `ScriptConfig`
    - `code` (string, required): JavaScript code to execute
    - `cwd` (string, optional): Working directory (default: repository root)
    - `timeout` (number, optional): Max execution time in ms (default: 30000)

- **FR:script.vm-execution** (P1): Action MUST execute JavaScript code using Node.js VM module
  - Isolated context with no access to global scope
  - Support async/await for asynchronous operations
  - Wrap code in async function: `(async () => { ${code} })()`

- **FR:script.context-injection** (P1): Action MUST inject controlled capabilities into VM context
  - `console` for logging output
  - `get(key)` function for accessing playbook variables and nested properties
  - `set(key, value)` function for writing playbook variables back to context
  - `fs` module for file operations (Node.js fs module)
  - `path` module for path manipulation (Node.js path module)
  - `URL` and `URLSearchParams` for URL parsing
  - `Buffer` for encoding/decoding operations
  - No access to `require()` or `import` (prevents arbitrary module loading)
  - No access to `process` or other dangerous globals

- **FR:script.error-handling** (P2): Action MUST handle JavaScript errors
  > - @req FR:error-handling/catalyst-error
  - Syntax errors → CatalystError with code 'ScriptSyntaxError'
  - Runtime errors → CatalystError with code 'ScriptRuntimeError'
  - Error messages MUST include original error details and location if available

- **FR:script.return-value** (P1): Action MUST return script return value as result
  - Capture value from last expression or explicit return statement
  - Return value becomes `value` property in PlaybookActionResult

### FR:shell: Shell Script Actions (Bash and PowerShell)

Playbook author needs to run Bash and PowerShell commands so that workflows can perform system operations and tool integration with proper environment and working directory management.

- **FR:shell.bash** (P1): System MUST provide `bash` action implementing `PlaybookAction<BashConfig>`
  - Config interface: `BashConfig`
    - `code` (string, required): Bash script to execute
    - `cwd` (string, optional): Working directory (default: repository root)
    - `env` (Record<string, string>, optional): Environment variables (merged with process.env)
    - `timeout` (number, optional): Max execution time in ms (default: 60000)

- **FR:shell.powershell** (P1): System MUST provide `powershell` action implementing `PlaybookAction<PowerShellConfig>`
  - Config interface: `PowerShellConfig`
    - `code` (string, required): PowerShell script to execute
    - `cwd` (string, optional): Working directory (default: repository root)
    - `env` (Record<string, string>, optional): Environment variables (merged with process.env)
    - `timeout` (number, optional): Max execution time in ms (default: 60000)

- **FR:shell.execution** (P1): Shell actions MUST execute via Node.js child_process module
  - Use `child_process.exec()` with appropriate shell
  - `bash` uses shell: 'bash'
  - `powershell` uses shell: 'pwsh'
  - Environment variables merged with process.env (config values override)

- **FR:shell.base-class** (P1): Shell actions MUST implement shared base class
  - Abstract `ShellActionBase` class provides common functionality
  - Subclasses override `getShellExecutable()` and `getActionName()` methods
  - Base class handles config validation, cwd resolution, execution, error mapping

- **FR:shell.output-capture** (P1): Shell actions MUST capture execution output
  - Result value contains: `stdout` (string), `stderr` (string), `exitCode` (number)
  - Exit code 0 indicates success
  - Non-zero exit codes indicate failure

- **FR:shell.error-mapping** (P2): Shell actions MUST map shell errors to CatalystError codes
  - Non-zero exit → '{Action}CommandFailed'
  - ENOENT error → '{Action}CommandNotFound'
  - EACCES error → '{Action}PermissionDenied'
  - ETIMEDOUT → '{Action}Timeout'
  - All errors MUST include stdout/stderr in error guidance

### FR:security: Security and Safety

Playbook author needs safe execution constraints so that script and shell actions run within appropriate security boundaries.

- **FR:security.script** (P2): `script` action security constraints
  - No access to `require()` or `import` (prevents arbitrary module loading)
  - No access to `process.exit()` or process control functions
  - File system access via injected `fs` module (scoped to repository)

- **FR:security.shell** (P2): Shell action security considerations
  - Full shell access (equivalent capability to script)
  - Template interpolation prevents injection (values are strings, not code)
  - Working directory validation prevents operations outside repository by default

### Non-functional Requirements

**NFR:performance**: Performance

- **NFR:performance.script-overhead**: Script action execution overhead (excluding script runtime) MUST be <50ms
- **NFR:performance.shell-overhead**: Shell action execution overhead (excluding command runtime) MUST be <100ms
- **NFR:performance.timeout-activation**: Timeout enforcement MUST activate within 100ms of limit

**NFR:reliability**: Reliability

- **NFR:reliability.memory-leaks**: Script execution MUST not leak memory between invocations
- **NFR:reliability.process-cleanup**: Shell execution MUST properly clean up child processes on timeout
- **NFR:reliability.error-messages**: Error messages MUST include actionable guidance for all error scenarios

**NFR:testability**: Testability

- **NFR:testability.isolation**: All actions MUST be testable in isolation without external dependencies
- **NFR:testability.timeout-testing**: Timeout behavior MUST be verifiable with test doubles
- **NFR:testability.error-coverage**: 100% code coverage for error handling paths
- **NFR:testability.success-coverage**: 90% code coverage for success paths

**NFR:maintainability**: Maintainability

- **NFR:maintainability.single-responsibility**: Action implementations MUST follow single responsibility principle with shared base class
- **NFR:maintainability.error-codes**: Error codes MUST be well-documented and consistent across all actions
- **NFR:maintainability.typescript**: Configuration interfaces MUST use TypeScript for type safety
- **NFR:maintainability.shared-base**: Shell actions (bash, pwsh) MUST share common implementation via base class to reduce duplication

## Architecture Constraints

None

## External Dependencies

- **Node.js >= 18**: VM module for script execution, child_process for shell execution, fs module for file operations
- **bash**: Required for bash action (standard on Unix/Linux/macOS)
- **pwsh**: Required for pwsh action (PowerShell 7+, cross-platform)
