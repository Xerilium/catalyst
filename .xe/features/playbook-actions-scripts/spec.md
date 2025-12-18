---
id: playbook-actions-scripts
title: Playbook Actions - Scripts
author: "@flanakin"
description: "Script execution actions for playbook workflows supporting multiple languages and environments"
dependencies:
  - playbook-definition
  - error-handling
---

# Feature: Playbook Actions - Scripts

## Problem

Playbooks need to execute scripts and commands in various languages and environments. Without script execution capabilities, playbooks cannot perform complex logic, file operations, system commands, or integrate with external tools effectively.

## Goals

- Enable playbook developers to execute JavaScript logic for data manipulation and file operations
- Enable playbook developers to run shell commands for system operations and tool integration
- Provide safe execution environments with timeout and resource controls
- Support cross-platform shell scripting (Bash on Unix/Linux, PowerShell on Windows)

## Scenario

- As a **playbook author**, I need to execute JavaScript logic for complex data processing
  - Outcome: `script` action provides JavaScript execution with file system access and playbook variable access

- As a **playbook author**, I need to run Bash commands for Unix/Linux system operations
  - Outcome: `bash` action executes Bash scripts with proper environment and working directory management

- As a **playbook author**, I need to run PowerShell commands for Windows automation or cross-platform scenarios
  - Outcome: `powershell` action executes PowerShell scripts with proper environment and working directory management

- As a **playbook author**, I need safe execution with resource limits and timeouts
  - Outcome: All script actions include timeout limits and comprehensive error handling

## Success Criteria

- 95% of script executions complete successfully within configured timeout limits
- JavaScript execution provides access to playbook variables via `{{}}` replacement and `get()` function
- Shell script execution maintains proper environment isolation and working directory control
- Execution failures are captured with exit codes and reported within 2 seconds of completion

## Requirements

### Functional Requirements

**FR:common**: Common Requirements for All Script Actions

- **FR:common.validation**: All actions MUST validate configuration before execution
  - Missing required `code` property MUST throw CatalystError with code '{Action}ConfigInvalid'
  - Invalid timeout values (<0) MUST throw CatalystError with code '{Action}ConfigInvalid'

- **FR:common.working-directory**: All actions MUST validate and resolve working directory
  - Non-existent `cwd` MUST throw CatalystError with code '{Action}InvalidCwd'
  - Relative paths MUST be resolved against repository root
  - Default `cwd` MUST be repository root

- **FR:common.timeout**: All actions MUST enforce timeout limits
  - Execution MUST terminate if timeout is exceeded
  - Timeout errors MUST throw CatalystError with code '{Action}Timeout'

- **FR:common.result-structure**: All actions MUST return PlaybookActionResult with the following:
  - `code`: 'Success' if execution succeeded, error code otherwise
  - `message`: Human-readable execution status
  - `value`: Action-specific output (script return value or shell result)
  - `error`: CatalystError if execution failed, null otherwise

- **FR:common.template-interpolation**: All actions MUST support `{{variable-name}}` template interpolation
  - Template engine performs interpolation BEFORE action execution
  - Actions receive config with variables already replaced

**FR:script**: Script-Run Action (JavaScript Execution)

- **FR:script.interface**: System MUST provide `script` action implementing `PlaybookAction<ScriptConfig>`
  - Config interface: `ScriptConfig`
    - `code` (string, required): JavaScript code to execute
    - `cwd` (string, optional): Working directory (default: repository root)
    - `timeout` (number, optional): Max execution time in ms (default: 30000)

- **FR:script.vm-execution**: Action MUST execute JavaScript code using Node.js VM module
  - Isolated context with no access to global scope
  - Support async/await for asynchronous operations
  - Wrap code in async function: `(async () => { ${code} })()`

- **FR:script.context-injection**: Action MUST inject controlled capabilities into VM context
  - `console` for logging output
  - `get(key)` function for accessing playbook variables and nested properties
  - `fs` module for file operations (Node.js fs module)
  - `path` module for path manipulation (Node.js path module)
  - No access to `require()` or `import` (prevents arbitrary module loading)
  - No access to `process` or other dangerous globals

- **FR:script.error-handling**: Action MUST handle JavaScript errors
  - Syntax errors → CatalystError with code 'ScriptSyntaxError'
  - Runtime errors → CatalystError with code 'ScriptRuntimeError'
  - Error messages MUST include original error details and location if available

- **FR:script.return-value**: Action MUST return script return value as result
  - Capture value from last expression or explicit return statement
  - Return value becomes `value` property in PlaybookActionResult

**FR:shell**: Shell Script Actions (Bash and PowerShell)

- **FR:shell.bash**: System MUST provide `bash` action implementing `PlaybookAction<BashConfig>`
  - Config interface: `BashConfig`
    - `code` (string, required): Bash script to execute
    - `cwd` (string, optional): Working directory (default: repository root)
    - `env` (Record<string, string>, optional): Environment variables (merged with process.env)
    - `timeout` (number, optional): Max execution time in ms (default: 60000)

- **FR:shell.powershell**: System MUST provide `powershell` action implementing `PlaybookAction<PowerShellConfig>`
  - Config interface: `PowerShellConfig`
    - `code` (string, required): PowerShell script to execute
    - `cwd` (string, optional): Working directory (default: repository root)
    - `env` (Record<string, string>, optional): Environment variables (merged with process.env)
    - `timeout` (number, optional): Max execution time in ms (default: 60000)

- **FR:shell.execution**: Shell actions MUST execute via Node.js child_process module
  - Use `child_process.exec()` with appropriate shell
  - `bash` uses shell: 'bash'
  - `powershell` uses shell: 'pwsh'
  - Environment variables merged with process.env (config values override)

- **FR:shell.base-class**: Shell actions MUST implement shared base class
  - Abstract `ShellActionBase` class provides common functionality
  - Subclasses override `getShellExecutable()` and `getActionName()` methods
  - Base class handles config validation, cwd resolution, execution, error mapping

- **FR:shell.output-capture**: Shell actions MUST capture execution output
  - Result value contains: `stdout` (string), `stderr` (string), `exitCode` (number)
  - Exit code 0 indicates success
  - Non-zero exit codes indicate failure

- **FR:shell.error-mapping**: Shell actions MUST map shell errors to CatalystError codes
  - Non-zero exit → '{Action}CommandFailed'
  - ENOENT error → '{Action}CommandNotFound'
  - EACCES error → '{Action}PermissionDenied'
  - ETIMEDOUT → '{Action}Timeout'
  - All errors MUST include stdout/stderr in error guidance

**FR:security**: Security and Safety

- **FR:security.script**: `script` action security constraints
  - No access to `require()` or `import` (prevents arbitrary module loading)
  - No access to `process.exit()` or process control functions
  - File system access via injected `fs` module (scoped to repository)

- **FR:security.shell**: Shell action security considerations
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

## Key Entities

**Entities owned by this feature:**

- **ScriptConfig**: Configuration interface for `script` action
  - Properties: code, cwd, timeout
  - Used to configure JavaScript execution within playbooks

- **BashConfig**: Configuration interface for `bash` action
  - Properties: code, cwd, env, timeout
  - Used to configure Bash script execution within playbooks

- **PowerShellConfig**: Configuration interface for `powershell` action
  - Properties: code, cwd, env, timeout
  - Used to configure PowerShell script execution within playbooks

- **ShellResult**: Result structure for shell actions
  - Properties: stdout, stderr, exitCode
  - Returned as `value` in PlaybookActionResult for shell actions

- **ScriptAction**: Implementation of `PlaybookAction<ScriptConfig>`
  - Executes JavaScript code in isolated VM context with fs module access
  - Provides `get()` function for variable access
  - Returns structured results with script output value

- **BashAction**: Implementation of `PlaybookAction<BashConfig>`
  - Executes Bash scripts using child_process with bash shell
  - Extends ShellActionBase
  - Returns structured results with stdout, stderr, and exit code

- **PowerShellAction**: Implementation of `PlaybookAction<PowerShellConfig>`
  - Executes PowerShell scripts using child_process with pwsh shell
  - Extends ShellActionBase
  - Returns structured results with stdout, stderr, and exit code

- **ShellActionBase**: Abstract base class for shell actions
  - Provides common functionality for bash and powershell actions
  - Implements config validation, cwd resolution, timeout enforcement, error mapping
  - Reduces code duplication between shell action implementations

**Entities from other features:**

- **PlaybookAction** (playbook-definition): Base interface all actions implement
- **PlaybookActionResult** (playbook-definition): Standard result structure
- **CatalystError** (error-handling): Standard error class with code and guidance
- **ErrorPolicy** (error-handling): Error handling configuration

## TypeScript Examples

### Script-Run Action Usage

```typescript
import type { PlaybookStep } from '@xerilium/catalyst/playbooks';

// JavaScript execution with get() function and {{}} replacement
const validationStep: PlaybookStep = {
  name: 'run-validation',
  action: 'script',
  config: {
    code: `
      // Access variables via get() function for complex/nested access
      const prNumber = get('pr-number');
      const files = get('changed-files');

      // Simple variable replacement via {{}} (replaced before execution)
      const author = '{{author}}';

      if (!prNumber || prNumber <= 0) {
        throw new Error('Invalid PR number');
      }

      // File operations using injected fs module
      const content = fs.readFileSync('{{repo-root}}/package.json', 'utf8');
      const pkg = JSON.parse(content);

      // Return value becomes the step output
      return {
        isValid: true,
        validatedAt: new Date().toISOString(),
        prNumber,
        filesCount: files.length,
        author,
        packageName: pkg.name
      };
    `,
    cwd: '{{repo-root}}',
    timeout: 30000
  }
};
```

### Bash-Run Action Usage

```typescript
import type { PlaybookStep } from '@xerilium/catalyst/playbooks';

// Bash script execution with {{}} template interpolation
const buildStep: PlaybookStep = {
  name: 'run-build',
  action: 'bash',
  config: {
    code: `
      set -e  # Exit on error
      echo "Building project {{project-name}}"
      npm run build
      echo "Build completed for PR #$PR_NUMBER"
    `,
    cwd: '{{repo-root}}',
    env: {
      NODE_ENV: 'production',
      PR_NUMBER: '{{pr-number}}'
    },
    timeout: 120000
  }
};
```

### PowerShell-Run Action Usage

```typescript
import type { PlaybookStep } from '@xerilium/catalyst/playbooks';

// PowerShell script execution with {{}} template interpolation
const testStep: PlaybookStep = {
  name: 'run-tests',
  action: 'powershell',
  config: {
    code: `
      $ErrorActionPreference = 'Stop'
      Write-Host "Running tests for PR #$env:PR_NUMBER"
      npm test -- --testNamePattern="{{test-pattern}}"
      Write-Host "Tests completed"
    `,
    cwd: '{{repo-root}}',
    env: {
      PR_NUMBER: '{{pr-number}}'
    },
    timeout: 60000
  }
};
```

## Dependencies

**Internal Dependencies:**

- **playbook-definition** (Tier 1.2): Provides `PlaybookAction`, `PlaybookActionResult` interfaces
- **error-handling** (Tier 1.1): Provides `CatalystError` and `ErrorPolicy` framework

**External Dependencies:**

- **Node.js >= 18**: VM module for script execution, child_process for shell execution, fs module for file operations
- **bash**: Required for bash action (standard on Unix/Linux/macOS)
- **pwsh**: Required for pwsh action (PowerShell 7+, cross-platform)
