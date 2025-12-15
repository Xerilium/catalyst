# Research: Playbook Actions - Scripts

## Overview

This document captures research findings for implementing script execution actions within the Catalyst playbook framework. The feature provides three core actions: `script` for JavaScript execution, `bash` for Bash scripts, and `powershell` for PowerShell scripts.

## Design Decisions

### Separate Actions vs Single Action with Language Parameter

**Decision: Use separate actions (`script`, `bash`, `powershell`) instead of single action with language parameter**

**Rationale:**
- **Different execution models**: VM context (script) vs child_process (bash/powershell)
- **Different capabilities**: JavaScript manipulates objects directly; shells execute system commands
- **Different error handling**: Script errors are JS runtime errors; shell errors are exit codes
- **Different security models**: VM isolation vs process isolation
- **Clearer intent**: `action: 'script'` vs `action: 'bash'` is more explicit than `action: 'script', lang: 'bash'`
- **Better type safety**: Each action has its own strongly-typed config interface
- **Simpler implementation**: No branching logic based on language parameter

### Action Naming Conventions

**Decisions:**
- `script` for JavaScript (follows object-verb pattern, "script" is object, "run" is verb)
- `bash` for Bash scripts (follows object-verb pattern, consistent with framework conventions)
- `powershell` for PowerShell (follows object-verb pattern, uses full "PowerShell" name for readability)
- Internal shell executable can still be 'pwsh' for PowerShell 7+

**Rationale:**
- Aligns with existing action naming pattern (e.g., `file-write`, `http-get`, `github-issue-create`)
- More human-readable than abbreviated names
- Consistent object-verb structure across all actions

### Success Codes

**Decision: Use 'Success' for all successful operations**

**Rationale:**
- Consistency across all playbook actions
- Action-specific success codes (`ScriptSuccess`, `BashSuccess`, etc.) add no value
- Simpler error code mapping in error policies
- Reduces unnecessary variation in the codebase

### Environment Variables

**Decision: Remove `env` from `script` action, keep it for `bash` and `powershell` actions**

**Rationale:**
- Shell scripts expect environment variables (standard pattern in bash/pwsh)
- JavaScript can access variables via `get()` function and `{{}}` replacement
- `get()` function doesn't work in bash/pwsh (that's JavaScript syntax)
- `{{}}` replacement works but environment variables are more idiomatic for shells
- Reduces API surface for script action

### Template Interpolation Strategy

**Decision: Template interpolation happens BEFORE action execution**

Template engine (playbook-template-engine) interpolates `{{variable-name}}` in config before passing to action.execute().

**For `script` action:**
- `{{}}` replacement for simple variables (replaced before VM execution)
- `get('variable-name')` function for complex/nested access (function injected into VM context)
- No `${{}}` expression evaluation (the script code itself IS the expression)

**For `bash` and `powershell` actions:**
- `{{}}` replacement for variables in code and env (replaced before shell execution)
- No `get()` function (that's JavaScript-specific)
- Environment variables provide shell-idiomatic variable access

**Rationale:**
- Separation of concerns: Template engine handles all interpolation logic
- Actions receive plain strings after replacement, reducing complexity
- Consistent behavior across all playbook actions
- `get()` provides natural JavaScript object access: `get('my-object').nested.property`

### File System Access for JavaScript

**Decision: Allow file system access via injected `fs` module in `script` action**

**Rationale:**
- Playbooks need file operations for reading configs, writing outputs, etc.
- Controlled injection is safer than allowing arbitrary `require()`
- Scoping to repository directory provides security boundary
- Aligns with Catalyst principle of enabling "controlled system access within the bounds of the current repo for any non-damaging, reversible action"
- Alternative (playbook-actions-io) is too limited for complex file operations

**Security Approach:**
- Inject `fs` and `path` modules into VM context
- Do NOT allow `require()` or `import` (prevents arbitrary module loading)
- Recommend scoping operations to repository directory (not enforced, trusted code)

### Working Directory

**Decision: Add `cwd` property to all actions, default to repository root**

**Rationale:**
- Consistent across all three actions
- Repository root is logical default for playbook operations
- Allows playbooks to work in subdirectories when needed
- Must validate cwd exists before execution

### Base Class for Shell Actions

**Decision: Create `ShellActionBase` abstract base class for `bash` and `powershell`**

**Rationale:**
- Bash and PowerShell actions are nearly identical (only differ in shell executable)
- Shared functionality: config validation, cwd resolution, env merging, timeout enforcement, error mapping
- Reduces code duplication
- Easier to maintain and test
- Single Responsibility Principle: base class handles common shell execution logic
- Simplifies spec: common requirements defined once in FR:common, action-specific details in FR:shell

## Technical Approach

### JavaScript Execution (`script` action)

**Approach: Node.js VM Module with Controlled Injection**

**Implementation:**
- Use `vm.createContext()` to create isolated sandbox
- Inject controlled globals: `console`, `get()` function, `fs`, `path`
- Template engine performs `{{}}` replacement BEFORE VM execution
- Wrap code in async function to support await: `(async () => { ${code} })()`
- Use `timeout` option on `script.runInContext()` to enforce time limits
- Capture return value from async function execution

**get() Function Implementation:**
- Injected as closure with access to variables map
- Returns value from variables map by key
- Supports nested access via JavaScript property access on returned object
- Example: `get('my-object').nested.property`

**Security:**
- VM contexts in Node.js are NOT security boundaries for untrusted code
- For Catalyst's use case (trusted playbook authors), VM provides sufficient isolation
- No access to `require()` or `import` - prevents arbitrary module loading
- No access to `process`, `global`, or other dangerous Node.js globals
- File system operations available via injected `fs` module

**Alternative Considered: vm2 package**
- Rejected: No longer maintained, security vulnerabilities
- vm2 was archived by maintainers in 2023

**Alternative Considered: isolated-vm package**
- Rejected: Adds C++ dependency, complex setup, overkill for trusted code
- Better suited for executing untrusted user code

### Shell Script Execution (`bash` and `powershell` actions)

**Approach: child_process.exec with Promise wrapper and shared base class**

**Implementation:**
- Create `ShellActionBase` abstract base class with common logic
- Bash and PowerShell actions extend base, providing shell executable name
- Wrap `exec()` in Promise using `util.promisify()` or manual wrapper
- Set `shell` option based on action: 'bash' or 'pwsh'
- Validate `cwd` exists before execution using `fs.existsSync()`
- Merge `env` config with `process.env` to inherit system environment
- Template engine performs `{{}}` replacement BEFORE exec
- Capture `stdout`, `stderr`, `exitCode` for return value
- Treat non-zero exit codes as errors (configurable via error policy)

**Timeout Enforcement:**
- Use `timeout` option in `exec()` options
- When timeout is exceeded, child process is killed with SIGTERM
- Error code: 'ETIMEDOUT' from Node.js

**Error Mapping:**
- Exit code 0 → Success ('Success')
- Exit code non-zero → Error ('{Action}CommandFailed')
- ENOENT error → '{Action}CommandNotFound'
- EACCES error → '{Action}PermissionDenied'
- ETIMEDOUT → '{Action}Timeout'

**Alternative Considered: child_process.spawn**
- Rejected for this use case: More complex, requires argument parsing
- `spawn()` better for streaming large output; `exec()` sufficient for playbooks
- Could be added later as separate action if streaming needed

**Alternative Considered: child_process.execSync**
- Rejected: Synchronous, blocks event loop
- Playbook actions should be async for consistency

## Error Handling Strategy

All errors are wrapped in `CatalystError` with structured codes for error policy matching.

### Script Action Error Codes

| Error Code | Condition | Example Guidance |
|------------|-----------|------------------|
| ScriptConfigInvalid | Missing required config or invalid values | "Ensure 'code' property is provided and timeout is >= 0" |
| ScriptInvalidCwd | Working directory does not exist | "Directory '{cwd}' not found. Check path or create directory first." |
| ScriptSyntaxError | JavaScript syntax error in code | "Fix syntax error at line X: {syntaxError.message}" |
| ScriptRuntimeError | Runtime error during execution | "Script failed: {error.message}. Check variable values and logic." |
| ScriptTimeout | Execution exceeded timeout limit | "Script exceeded {timeout}ms limit. Optimize code or increase timeout." |

### Bash Action Error Codes

| Error Code | Condition | Example Guidance |
|------------|-----------|------------------|
| BashConfigInvalid | Missing required config or invalid values | "Ensure 'code' property is provided and timeout is >= 0" |
| BashInvalidCwd | Working directory does not exist | "Directory '{cwd}' not found. Check path or create directory first." |
| BashCommandNotFound | Command not found in PATH | "Command not found. Install required tool or check PATH. stderr: {stderr}" |
| BashPermissionDenied | Permission denied executing command | "Permission denied. Check file permissions or run as appropriate user." |
| BashCommandFailed | Command exited with non-zero code | "Command failed with exit code {exitCode}. stderr: {stderr}" |
| BashTimeout | Command exceeded timeout limit | "Command exceeded {timeout}ms limit. Optimize command or increase timeout." |

### Pwsh Action Error Codes

| Error Code | Condition | Example Guidance |
|------------|-----------|------------------|
| PwshConfigInvalid | Missing required config or invalid values | "Ensure 'code' property is provided and timeout is >= 0" |
| PwshInvalidCwd | Working directory does not exist | "Directory '{cwd}' not found. Check path or create directory first." |
| PwshCommandNotFound | PowerShell not found | "PowerShell 7+ (pwsh) not found. Install from https://aka.ms/powershell" |
| PwshPermissionDenied | Permission denied executing command | "Permission denied. Check execution policy or run as appropriate user." |
| PwshCommandFailed | Command exited with non-zero code | "Command failed with exit code {exitCode}. stderr: {stderr}" |
| PwshTimeout | Command exceeded timeout limit | "Command exceeded {timeout}ms limit. Optimize command or increase timeout." |

## Testing Strategy

### Unit Tests

**Script Action:**
- ✓ Execute simple JavaScript expression, return value
- ✓ Execute async JavaScript with await
- ✓ Access variables via get() function
- ✓ Access nested properties via get('obj').nested.property
- ✓ Handle {{}} replacement (verify template engine integration)
- ✓ File operations with injected fs module
- ✓ Handle syntax errors, wrap in CatalystError
- ✓ Handle runtime errors, wrap in CatalystError
- ✓ Enforce timeout, throw ScriptTimeout error
- ✓ Validate config, reject missing code
- ✓ Validate config, reject negative timeout
- ✓ Validate cwd, reject non-existent directory
- ✓ Provide console access for logging
- ✓ Prevent access to require() - should be undefined
- ✓ Prevent access to import - should throw error
- ✓ Prevent access to process.exit() - should be undefined

**Bash Action:**
- ✓ Execute simple bash command, capture stdout
- ✓ Execute multi-line bash script
- ✓ Set working directory, verify execution in cwd
- ✓ Merge environment variables with process.env
- ✓ Handle {{}} template interpolation in code
- ✓ Handle {{}} template interpolation in env
- ✓ Handle command not found, throw BashCommandNotFound
- ✓ Handle permission denied, throw BashPermissionDenied
- ✓ Handle non-zero exit code, throw BashCommandFailed
- ✓ Enforce timeout, throw BashTimeout
- ✓ Validate config, reject missing code
- ✓ Validate cwd, reject non-existent directory
- ✓ Verify bash shell used

**Pwsh Action:**
- ✓ Execute simple PowerShell command, capture stdout
- ✓ Execute multi-line PowerShell script
- ✓ Set working directory, verify execution in cwd
- ✓ Merge environment variables with process.env
- ✓ Handle {{}} template interpolation in code
- ✓ Handle {{}} template interpolation in env
- ✓ Handle pwsh not found, throw PwshCommandNotFound
- ✓ Handle permission denied, throw PwshPermissionDenied
- ✓ Handle non-zero exit code, throw PwshCommandFailed
- ✓ Enforce timeout, throw PwshTimeout
- ✓ Validate config, reject missing code
- ✓ Validate cwd, reject non-existent directory
- ✓ Verify pwsh shell used

**ShellActionBase:**
- ✓ Config validation (code required, timeout >= 0)
- ✓ Cwd resolution (relative to repo root)
- ✓ Cwd validation (directory exists)
- ✓ Environment variable merging
- ✓ Timeout enforcement
- ✓ Error code mapping from ENOENT, EACCES, ETIMEDOUT
- ✓ Exit code capture and error on non-zero

### Integration Tests

- ✓ Script action in playbook workflow with get() and {{}}
- ✓ Bash action in playbook workflow with {{}} interpolation
- ✓ Pwsh action in playbook workflow with {{}} interpolation
- ✓ Error policy handling for script timeout
- ✓ Error policy handling for bash non-zero exit
- ✓ Chaining script and shell actions with step outputs
- ✓ File operations in script action

### Performance Tests

- ✓ Script execution overhead < 50ms (excluding script runtime)
- ✓ Bash execution overhead < 100ms (excluding command runtime)
- ✓ Pwsh execution overhead < 100ms (excluding command runtime)
- ✓ Timeout enforcement activates within 100ms of limit
- ✓ No memory leaks after 1000 script executions

## Implementation File Structure

```
src/playbooks/actions/scripts/
├── index.ts                # Exports all actions
├── types.ts                # Config interfaces (ScriptConfig, BashConfig, PwshConfig, ShellResult)
├── errors.ts               # Error codes and helper functions
├── script-action.ts        # ScriptAction implementation
├── shell-action-base.ts    # ShellActionBase abstract base class
├── bash-action.ts          # BashAction extends ShellActionBase
└── pwsh-action.ts          # PwshAction extends ShellActionBase

tests/unit/playbooks/actions/scripts/
├── script-action.test.ts
├── bash-action.test.ts
├── pwsh-action.test.ts
├── shell-action-base.test.ts
└── integration.test.ts
```

## Dependencies

### Runtime Dependencies
- Node.js >= 18 (vm, child_process, fs, path modules)
- bash (for bash action, standard on Unix/Linux/macOS)
- pwsh (for pwsh action, PowerShell 7+, cross-platform)

### Development Dependencies
- Jest for testing
- TypeScript for type checking

### Internal Dependencies
- playbook-definition: PlaybookAction, PlaybookActionResult interfaces
- error-handling: CatalystError class
- playbook-template-engine: Template interpolation (used by engine before action execution)

## Open Questions

None. All design decisions have been resolved.

## References

- [Node.js VM Module Documentation](https://nodejs.org/api/vm.html)
- [Node.js child_process Module Documentation](https://nodejs.org/api/child_process.html)
- [Playbook Definition Spec](../ playbook-definition/spec.md)
- [Error Handling Spec](../error-handling/spec.md)
