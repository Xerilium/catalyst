# Implementation Plan: Playbook Actions - Scripts

## Overview

Implement script execution actions for Catalyst playbooks, providing JavaScript execution (`script` action), Bash script execution (`bash` action), and PowerShell script execution (`powershell` action) with proper isolation, timeout enforcement, and error handling.

**Key decisions from design review:**

- Actions named `script`, `bash`, `powershell` (verb optional when only one action per object)
- Standardized success code: 'Success' (not action-specific codes)
- Common requirements factored into FR:common (base class handles shared logic)
- Spec simplified from ~300 lines to ~150 lines by reducing duplication
- **Native playbooks use `script` only** for cross-platform compatibility
- **Custom playbooks may use bash/powershell** but declare platform dependencies
- Platform compatibility strategy documented at product level, not in feature spec

## Prerequisites

**Required Features (Must be completed):**
- ✅ error-handling: CatalystError and error policy framework
- ✅ playbook-definition: PlaybookAction interface and type definitions

**Dependencies:**
- Node.js >= 18 with vm, child_process, fs, and path modules
- bash (for bash action, standard on Unix/Linux/macOS)
- pwsh (for pwsh action, PowerShell 7+, optional for cross-platform)

## Implementation Phases

### Phase 1: Core Infrastructure

**Goal:** Establish type definitions and base error handling

**Tasks:**

1. **Create type definitions** (`src/playbooks/actions/scripts/types.ts`)
   - Define `ScriptConfig` interface (code, cwd?, timeout?)
   - Define `BashConfig` interface (code, cwd?, env?, timeout?)
   - Define `PwshConfig` interface (code, cwd?, env?, timeout?)
   - Define `ShellResult` interface (stdout, stderr, exitCode)
   - Export all types from index

2. **Create error utilities** (`src/playbooks/actions/scripts/errors.ts`)
   - Define error code constants for script action (ScriptConfigInvalid, ScriptInvalidCwd, ScriptSyntaxError, ScriptRuntimeError, ScriptTimeout)
   - Define error code constants for bash action (BashConfigInvalid, BashInvalidCwd, BashCommandNotFound, BashPermissionDenied, BashCommandFailed, BashTimeout)
   - Define error code constants for pwsh action (PwshConfigInvalid, PwshInvalidCwd, PwshCommandNotFound, PwshPermissionDenied, PwshCommandFailed, PwshTimeout)
   - Create helper functions for common error scenarios
   - Export error utilities

**Validation Criteria:**
- [ ] All types compile without errors
- [ ] Types align with playbook-definition interfaces
- [ ] Error codes follow naming conventions from error-handling spec

**Estimated Effort:** 2 hours

---

### Phase 2: Script Action Implementation

**Goal:** Implement JavaScript execution action with VM isolation and controlled injection

**Tasks:**

1. **Implement ScriptAction class** (`src/playbooks/actions/scripts/script-action.ts`)
   - Extend `PlaybookActionWithSteps<ScriptConfig>` to access `StepExecutor`
   - Create `execute(config: ScriptConfig)` method
   - Validate config (required code, timeout >= 0, cwd exists)
   - Resolve cwd to absolute path (relative to repo root)
   - Create VM context with controlled injection:
     - `console` for logging
     - `get(key)` function for variable access (delegates to `this.stepExecutor.getVariable(key)`)
     - `fs` module for file operations
     - `path` module for path manipulation
   - Template engine already handled `{{}}` replacement before execute()
   - Wrap code in async function for await support: `(async () => { ${config.code} })()`
   - Execute script with timeout enforcement
   - Capture return value from script
   - Handle syntax errors → ScriptSyntaxError
   - Handle runtime errors → ScriptRuntimeError
   - Handle timeout → ScriptTimeout
   - Return PlaybookActionResult with value/error

2. **Add comprehensive JSDoc comments**
   - Document class purpose and behavior
   - Document execute method parameters and return value
   - Document get() function behavior
   - Document injected modules (fs, path)
   - Document error scenarios and codes
   - Add usage examples in comments

**Implementation Notes:**
- Template interpolation (`{{}}`) is handled by engine BEFORE execute() is called
- ScriptAction extends `PlaybookActionWithSteps` to receive `StepExecutor` injection
- `get()` function delegates to `this.stepExecutor.getVariable(key)` for secure by-name variable access
- Use `vm.createContext({ console, get, fs, path })` for safe globals
- Wrap code: `(async () => { ${config.code} })()`
- Use `script.runInContext(context, { timeout })` for enforcement
- Default timeout: 30000ms (30 seconds)
- Default cwd: repository root

**Validation Criteria:**
- [ ] Script action implements PlaybookAction interface correctly
- [ ] Config validation rejects missing/invalid properties
- [ ] Cwd validation rejects non-existent directories
- [ ] Timeout enforcement works correctly
- [ ] Error wrapping preserves original error details
- [ ] Return values are captured correctly
- [ ] Async/await works in script code
- [ ] get() function accesses variables correctly
- [ ] fs and path modules available
- [ ] require() and import blocked
- [ ] Console access works

**Estimated Effort:** 5 hours

---

### Phase 3: Shell Action Base Class

**Goal:** Create shared base class for bash and pwsh actions

**Tasks:**

1. **Implement ShellActionBase abstract class** (`src/playbooks/actions/scripts/shell-action-base.ts`)
   - Create abstract class with template method pattern
   - Abstract method: `getShellExecutable(): string` (returns 'bash' or 'pwsh')
   - Abstract method: `getActionName(): string` (returns 'Bash' or 'Pwsh' for error codes)
   - Implement shared `execute(config: BashConfig | PwshConfig)` method:
     - Validate config (required code, timeout >= 0)
     - Validate cwd exists if provided
     - Resolve cwd to absolute path (relative to repo root)
     - Merge env config with process.env
     - Template engine already handled `{{}}` replacement before execute()
     - Execute command with child_process.exec
     - Use shell from `getShellExecutable()`
     - Enforce timeout via exec options
     - Capture stdout, stderr, exitCode
     - Map errors to appropriate error codes using `getActionName()`:
       - ENOENT → {Action}CommandNotFound
       - EACCES → {Action}PermissionDenied
       - ETIMEDOUT → {Action}Timeout
       - Non-zero exit → {Action}CommandFailed
     - Return PlaybookActionResult with ShellResult value

2. **Add comprehensive JSDoc comments**
   - Document abstract class purpose
   - Document template method pattern
   - Document execute method flow
   - Document error mapping logic
   - Add usage examples for subclasses

**Implementation Notes:**
- Use `util.promisify(exec)` for Promise-based API
- Default timeout: 60000ms (60 seconds)
- Default cwd: repository root
- Include stdout/stderr in error guidance for debugging

**Validation Criteria:**
- [ ] Abstract class compiles without errors
- [ ] Template method pattern is clear
- [ ] Config validation rejects missing/invalid properties
- [ ] Cwd validation rejects non-existent directories
- [ ] Environment variable merging preserves process.env
- [ ] Timeout enforcement works correctly
- [ ] Error mapping covers all scenarios
- [ ] Stdout/stderr captured in results

**Estimated Effort:** 4 hours

---

### Phase 4: Bash and Pwsh Actions

**Goal:** Implement concrete shell actions extending base class

**Tasks:**

1. **Implement BashAction** (`src/playbooks/actions/scripts/bash-action.ts`)
   - Extend ShellActionBase
   - Implement `getShellExecutable()` returning 'bash'
   - Implement `getActionName()` returning 'Bash'
   - Add JSDoc with bash-specific examples

2. **Implement PwshAction** (`src/playbooks/actions/scripts/pwsh-action.ts`)
   - Extend ShellActionBase
   - Implement `getShellExecutable()` returning 'pwsh'
   - Implement `getActionName()` returning 'Pwsh'
   - Add JSDoc with PowerShell-specific examples

**Implementation Notes:**
- Both classes are very simple thanks to base class
- Main purpose is to provide shell-specific configuration

**Validation Criteria:**
- [ ] Both actions extend ShellActionBase correctly
- [ ] Shell executable names are correct
- [ ] Action names match error code patterns
- [ ] JSDoc examples are clear and accurate

**Estimated Effort:** 2 hours

---

### Phase 5: Action Registration and Exports

**Goal:** Make actions available to playbook engine

**Tasks:**

1. **Create barrel export** (`src/playbooks/actions/scripts/index.ts`)
   - Export ScriptAction class
   - Export BashAction class
   - Export PwshAction class
   - Export ShellActionBase (for testing)
   - Export all type definitions
   - Export error utilities

2. **Update playbook scripts index** (`src/playbooks/actions/index.ts` or create if needed)
   - Export script actions from scripts/ subdirectory
   - Follow existing action export patterns

**Implementation Notes:**
- Action registration with engine may be handled by playbook-engine feature
- Ensure exports follow existing patterns in codebase
- Use named exports for clarity

**Validation Criteria:**
- [ ] All exports are accessible from expected paths
- [ ] No circular dependencies
- [ ] TypeScript compilation succeeds

**Estimated Effort:** 1 hour

---

### Phase 6: Unit Tests - Script Action

**Goal:** Achieve 100% coverage for script action

**Tasks:**

1. **Create test suite** (`tests/unit/playbooks/actions/scripts/script-action.test.ts`)
   - Test: Execute simple expression, return value
   - Test: Execute multi-line code
   - Test: Execute async code with await
   - Test: Access variables via get() function
   - Test: Access nested properties via get('obj').nested.property
   - Test: get() returns undefined for missing variables
   - Test: File operations with fs module
   - Test: Path operations with path module
   - Test: Console logging works
   - Test: {{}} replacement (mock template engine behavior)
   - Test: Handle syntax error → ScriptSyntaxError
   - Test: Handle runtime error → ScriptRuntimeError
   - Test: Enforce timeout → ScriptTimeout
   - Test: Validate missing code → ScriptConfigInvalid
   - Test: Validate negative timeout → ScriptConfigInvalid
   - Test: Validate non-existent cwd → ScriptInvalidCwd
   - Test: Validate relative cwd resolved to absolute
   - Test: Default cwd is repo root
   - Test: require() blocked (undefined)
   - Test: import blocked (syntax error)
   - Test: process.exit() blocked (undefined)
   - Test: Error messages include original error details

**Test Patterns:**
- Use Jest for test framework
- Mock/spy on vm module functions where needed
- Mock fs.existsSync for cwd validation tests
- Test both success and error paths
- Verify error codes match spec

**Validation Criteria:**
- [ ] All tests pass
- [ ] Code coverage >= 100% for error paths
- [ ] Code coverage >= 90% for success paths
- [ ] Edge cases covered (empty code, very long timeout, etc.)

**Estimated Effort:** 5 hours

---

### Phase 7: Unit Tests - Shell Actions

**Goal:** Achieve 100% coverage for shell actions and base class

**Tasks:**

1. **Create base class test suite** (`tests/unit/playbooks/actions/scripts/shell-action-base.test.ts`)
   - Test: Config validation (code required, timeout >= 0)
   - Test: Cwd validation (directory exists)
   - Test: Cwd resolution (relative to repo root)
   - Test: Default cwd is repo root
   - Test: Environment variable merging
   - Test: Execute command, capture stdout
   - Test: Execute command, capture stderr
   - Test: Execute command, capture exit code
   - Test: Non-zero exit → error with action-specific code
   - Test: ENOENT error → CommandNotFound with action-specific code
   - Test: EACCES error → PermissionDenied with action-specific code
   - Test: ETIMEDOUT → Timeout with action-specific code
   - Test: Timeout enforcement
   - Test: Error messages include stdout/stderr

2. **Create bash action test suite** (`tests/unit/playbooks/actions/scripts/bash-action.test.ts`)
   - Test: getShellExecutable returns 'bash'
   - Test: getActionName returns 'Bash'
   - Test: Execute simple bash command
   - Test: Execute multi-line bash script
   - Test: Bash-specific error codes (BashCommandFailed, etc.)
   - Test: {{}} template interpolation in code
   - Test: {{}} template interpolation in env

3. **Create pwsh action test suite** (`tests/unit/playbooks/actions/scripts/pwsh-action.test.ts`)
   - Test: getShellExecutable returns 'pwsh'
   - Test: getActionName returns 'Pwsh'
   - Test: Execute simple PowerShell command
   - Test: Execute multi-line PowerShell script
   - Test: Pwsh-specific error codes (PwshCommandFailed, etc.)
   - Test: {{}} template interpolation in code
   - Test: {{}} template interpolation in env

**Test Patterns:**
- Mock child_process.exec for controlled testing
- Use Jest's mock implementation to simulate shell execution
- Test timeout handling with fake timers or controlled delays
- Verify environment variable merging
- Test action-specific error code generation

**Validation Criteria:**
- [ ] All tests pass
- [ ] Code coverage >= 100% for error paths
- [ ] Code coverage >= 90% for success paths
- [ ] Shell-specific behavior tested
- [ ] Edge cases covered

**Estimated Effort:** 6 hours

---

### Phase 8: Integration Tests

**Goal:** Validate actions work in playbook context

**Tasks:**

1. **Create integration test suite** (`tests/unit/playbooks/actions/scripts/integration.test.ts`)
   - Test: Script action with get() and {{}} in playbook workflow
   - Test: Script action file operations
   - Test: Bash action with {{}} interpolation in playbook workflow
   - Test: Pwsh action with {{}} interpolation in playbook workflow
   - Test: Script action error policy handling (timeout, runtime error)
   - Test: Bash action error policy handling (non-zero exit)
   - Test: Pwsh action error policy handling (non-zero exit)
   - Test: Chaining script and bash actions with step outputs
   - Test: Chaining script and pwsh actions with step outputs
   - Test: Variable access across actions

**Test Patterns:**
- May need to mock playbook engine or use minimal engine implementation
- Focus on integration points: template interpolation, error policies, step outputs
- Verify actions work with PlaybookContext

**Note:** Integration tests may depend on playbook-engine feature. If engine not ready, defer these tests or create minimal mock engine for testing.

**Validation Criteria:**
- [ ] All integration scenarios pass
- [ ] Template interpolation works correctly
- [ ] Error policies applied correctly
- [ ] Step outputs accessible in subsequent steps
- [ ] get() function accesses variables correctly

**Estimated Effort:** 4 hours (or defer if engine not ready)

---

### Phase 9: Internal Documentation and Review

**Goal:** Complete internal documentation and prepare for review

**Tasks:**

1. **Architecture Documentation**
   - Create diagram showing VM context injection flow
   - Create diagram showing shell execution flow via ShellActionBase
   - Document base class pattern and inheritance structure

2. **Implementation Notes**
   - Document timeout enforcement mechanisms
   - Document error mapping strategies
   - Note any deviations from spec (if any)

3. **Update feature documentation**
   - Mark spec as implemented
   - Update research.md with implementation learnings
   - Create tasks.md with completed work summary

4. **Code review preparation**
   - Run linter and fix any issues
   - Run all tests and verify 100% pass
   - Check TypeScript compilation
   - Verify no TODO comments left in code
   - Verify all error codes documented

**Validation Criteria:**

- [ ] Architecture diagrams complete
- [ ] All documentation complete
- [ ] No linter errors
- [ ] All tests passing
- [ ] TypeScript compiles without errors
- [ ] Code ready for review

**Estimated Effort:** 2 hours

---

## Success Criteria

**Functionality:**
- [ ] Script action executes JavaScript code with get() and fs access
- [ ] Bash action executes Bash scripts with env variables
- [ ] Pwsh action executes PowerShell scripts with env variables
- [ ] All actions implement PlaybookAction interface correctly
- [ ] All error scenarios handled with appropriate error codes
- [ ] Template interpolation integration works ({{}} replacement)
- [ ] Working directory validation and resolution works

**Quality:**
- [ ] 100% test coverage for error handling paths
- [ ] 90% test coverage for success paths
- [ ] All tests passing
- [ ] No TypeScript compilation errors
- [ ] No linter errors

**Documentation:**
- [ ] Comprehensive JSDoc comments on all public APIs
- [ ] Usage examples in code comments for all three actions
- [ ] Implementation tasks documented
- [ ] Research document reflects final design decisions

## Total Estimated Effort

- Phase 1: 2 hours (Core Infrastructure)
- Phase 2: 5 hours (Script Action)
- Phase 3: 4 hours (Shell Base Class)
- Phase 4: 2 hours (Bash & PowerShell)
- Phase 5: 1 hour (Exports & Registration)
- Phase 6: 5 hours (Script Tests)
- Phase 7: 6 hours (Shell Tests)
- Phase 8: 4 hours (Integration Tests - may defer)
- Phase 9: 2 hours (Internal Documentation)

**Total: 31 hours** (approximately 4 days of focused work)

**Note:** Integration tests (Phase 8) may be deferred if playbook-engine feature is not yet complete. This would reduce effort to ~27 hours. Public API documentation will be created by the playbook-documentation feature to avoid duplication across action features.

## Risk Assessment

**Low Risk:**
- VM module API is stable and well-documented
- child_process module API is stable and well-documented
- Clear spec with well-defined requirements
- Base class pattern reduces duplication for shell actions

**Medium Risk:**
- Integration tests may be blocked by playbook-engine dependency
  - Mitigation: Create minimal mock engine or defer integration tests
- get() function implementation needs careful design for nested access
  - Mitigation: Simple closure returning object from variables map

**Negligible Risk:**
- Template interpolation is engine's responsibility, not action's
- Error handling framework already implemented
- Separate actions simplify implementation (no language branching)

## Next Steps

1. Review this plan for accuracy and completeness
2. Confirm playbook-definition and error-handling features are complete
3. Begin Phase 1 implementation
4. Proceed sequentially through phases
5. Run tests continuously during implementation
6. Request code review after Phase 9 completion
7. Public documentation will be created in playbook-documentation feature after implementation
