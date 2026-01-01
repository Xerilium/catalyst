---
id: playbook-engine
title: Playbook Engine
author: "@flanakin"
description: "Task breakdown for implementing action-based playbook execution engine"
dependencies:
  - playbook-definition
  - playbook-template-engine
  - error-handling
---

# Tasks: Playbook Engine

**Input**: Implementation plan from [plan.md](./plan.md)

**Prerequisites**: playbook-definition (implemented), playbook-template-engine (in progress), error-handling (implemented)

> **Implementation Note**: This feature implements the core execution engine that orchestrates playbook workflows. The engine is format-agnostic (accepts `Playbook` interface instances), action-based (delegates to registered actions), and supports pause/resume capability.

## Phase 1: Core Engine (Priority: High)

**Goal**: Basic playbook execution with action dispatch and state persistence

### Setup and Types

- [ ] **T1.1**: Create project structure
  - Create `src/playbooks/engine/` directory
  - Create `tests/playbooks/engine/` directory
  - Set up TypeScript configuration if needed

### Core Implementation

- [ ] **T1.2**: Implement ExecutionContext type in `src/playbooks/engine/execution-context.ts`
  - Define `ExecutionOptions` interface (mode, autonomous, maxRecursionDepth, actor, workingDirectory)
  - Define `ExecutionResult` interface (runId, status, outputs, error, duration, stepsExecuted, startTime, endTime)
  - Export types for use by engine

- [x] **T1.3**: Implement input validation in `src/playbooks/engine/validators.ts` ✓
  - Validate playbook structure (name, description, owner, steps present)
  - Validate inputs against playbook.inputs specification
    - Required parameters present
    - Type checking (string, number, boolean)
    - Validation rules applied (regex, length, range, custom)
  - Apply type-based defaults for optional inputs without explicit defaults (FR-1.4.1)
    - Boolean: false, Number: 0, String: '' (empty string)
  - Coerce string inputs to declared types before validation (FR-1.4.2)
    - Boolean: "true"/"false" (case insensitive), "1"/"0" → true/false
    - Number: numeric strings → numbers
    - String: no coercion
  - Use ValidatorFactory from playbook-definition for rule validation
  - Return clear validation error messages

- [x] **T1.4**: Implement VarAction with property injection in `src/playbooks/engine/actions/var-action.ts` ✓
  - Implemented with property injection pattern
  - Privileged context access via __context property
  - Constructor-based validation via Engine.PRIVILEGED_ACTION_CLASSES

- [x] **T1.4b**: Implement ReturnAction with property injection in `src/playbooks/engine/actions/return-action.ts` ✓
  - Implemented with property injection pattern
  - Privileged context access via __context property
  - Constructor-based validation via Engine.PRIVILEGED_ACTION_CLASSES

- [x] **T1.5**: Implement PlaybookEngine core in `src/playbooks/engine/engine.ts` (Part 1: run() and createAction()) ✓
  - Added PRIVILEGED_ACTION_CLASSES static constant
  - Implemented createAction() method with property injection for privileged actions
  - Updated all 4 step execution locations to use createAction()
  - ThrowAction and PlaybookRunAction are in playbook-actions-controls (not registered here)

- [ ] **T1.6**: Implement public API exports in `src/playbooks/engine/index.ts`
  - Export PlaybookEngine class
  - Export VarAction, ReturnAction classes
  - Export ExecutionOptions, ExecutionResult types
  - Export validators module

### Testing

- [x] **T1.7**: Unit tests for validators in `tests/playbooks/engine/validators.test.ts` ✓
  - Test playbook structure validation
  - Test input validation (required params, types, validation rules)
  - Test type coercion (boolean: true/false/1/0, number: numeric strings)
  - Test error messages are clear

- [x] **T1.8**: Unit tests for VarAction in `tests/playbooks/engine/built-in-actions.test.ts` ✓
  - All 10 VarAction tests passing
  - Tests cover property injection pattern

- [x] **T1.8b**: Unit tests for ReturnAction in `tests/playbooks/engine/built-in-actions.test.ts` ✓
  - All 9 ReturnAction tests passing
  - Tests cover property injection pattern

- [ ] **T1.9**: Unit tests for PlaybookEngine in `tests/playbooks/engine/engine.test.ts`
  - Test createAction() instantiates actions fresh per step
  - Test createAction() grants privileged access to VarAction and ReturnAction
  - Test createAction() does NOT grant privileged access to other actions
  - Test createAction() instantiates control flow actions with StepExecutor
  - Test simple playbook execution with var and return actions
  - Test step results stored in context.variables
  - Test state persisted after each step
  - Test inputs validated before execution
  - Test template interpolation applied to step configs
  - Test unknown action type fails with clear error
  - Test action instances lazily cached (created on first use, reused thereafter)

### Acceptance

- [x] **T1.10**: Verify Phase 1 acceptance criteria ✓
  - Can execute simple playbook with var and return actions ✓
  - Actions lazily cached (instantiated on first use, reused thereafter) ✓
  - VarAction mutates context.variables via privileged access ✓
  - ReturnAction sets context.earlyReturn via privileged access ✓
  - External actions cannot spoof privileged access ✓
  - Step results stored in context.variables ✓
  - State persisted after each step ✓
  - Inputs validated before execution ✓
  - Template interpolation applied to step configs ✓

---

## Phase 2: Resume & Error Handling (Priority: High)

**Goal**: Resume capability and error policy integration

### Resume Implementation

- [ ] **T2.1**: Implement PlaybookEngine resume in `src/playbooks/engine/engine.ts` (Part 2: resume())
  - Implement `resume(runId: string, options?: ExecutionOptions): Promise<ExecutionResult>`
  - Load PlaybookState from statePersistence.load(runId)
  - Validate state structure is compatible
  - Reconstruct PlaybookContext from state
  - Skip already-completed steps (check context.completedSteps)
  - Resume execution from currentStepName
  - Continue normal execution from next uncompleted step

### Error Handling

- [ ] **T2.2**: Implement error policy evaluation in `src/playbooks/engine/error-handler.ts`
  - Create ErrorHandler class
  - Implement `evaluate(error: CatalystError, policy: ErrorPolicy): ErrorAction`
    - Map error code to policy action (Continue, Stop, Retry, Ignore)
    - Apply default policy when error code not mapped
    - Return evaluated action
  - Implement retry logic with exponential backoff
    - Backoff calculation: attempt^2 * 1000ms
    - Max retries from policy.retryCount

- [ ] **T2.3**: Integrate error handling into PlaybookEngine
  - Update step execution loop to catch action failures
  - Evaluate error policy for failed steps
  - Execute retry logic when policy = Retry
  - Continue execution when policy = Continue
  - Stop execution when policy = Stop
  - Log errors when policy = Ignore

- [ ] **T2.4**: Implement catch/finally block execution
  - Execute catch steps when step fails
    - Map error code to catch block steps
    - Execute recovery steps before failing playbook
  - Execute finally steps always
    - Run finally steps regardless of success/failure
    - Log finally failures but don't fail playbook if main execution succeeded

### Testing

- [ ] **T2.5**: Unit tests for resume in `tests/playbooks/engine/resume.test.ts`
  - Test resume from saved state
  - Test skip completed steps
  - Test continue from next uncompleted step
  - Test state validation on resume
  - Test state corruption detection

- [ ] **T2.6**: Unit tests for error handling in `tests/playbooks/engine/error-handling.test.ts`
  - Test error policy evaluation (Continue, Stop, Retry, Ignore)
  - Test retry logic with exponential backoff
  - Test catch block execution
  - Test finally block execution
  - Test finally failures don't fail playbook

### State Lifecycle Management

- [ ] **T2.8**: Update state archiving behavior (ARCHITECTURAL CHANGE)
  - **Change**: Do NOT archive failed runs automatically
  - Keep failed runs in `.xe/runs/` to enable retry/debugging
  - Only archive `completed` runs automatically
  - Rationale: Failed runs should be resumable for retry workflows

- [ ] **T2.9**: Implement `Engine.abandon(runId)` method
  - Mark failed/paused run for archival
  - Update state status (not needed, just archive directly)
  - Archive state to history
  - Remove from active runs directory

- [ ] **T2.10**: Implement `Engine.cleanupStaleRuns(options)` method
  - Accept `{ olderThanDays?: number }` (default: 7 days)
  - Find failed/paused runs older than threshold
  - Archive each stale run
  - Return count of cleaned runs
  - Used for scheduled cleanup of abandoned runs

- [ ] **T2.11**: Update tests for new archiving behavior
  - Verify failed runs NOT archived automatically
  - Verify completed runs archived automatically
  - Test `abandon()` method
  - Test `cleanupStaleRuns()` method

### Acceptance

- [ ] **T2.7**: Verify Phase 2 acceptance criteria
  - Can resume from saved state ✓
  - Skips completed steps on resume ✓
  - Applies error policies (Continue, Stop, Retry) ✓
  - Executes catch blocks on error ✓
  - Executes finally blocks always ✓
  - Validates state compatibility ✓
  - **NEW**: Failed runs remain in `.xe/runs/` for retry ✓
  - **NEW**: Can abandon failed runs to archive them ✓
  - **NEW**: Can cleanup stale runs automatically ✓

---

## Phase 3: Composition (Priority: High)

**Goal**: Playbook composition with child playbook execution

### Composition Implementation

- [ ] **T3.1**: Implement playbook registry in `src/playbooks/engine/playbook-registry.ts`
  - Create PlaybookRegistry class
  - Implement `register(name: string, playbook: Playbook): void`
  - Implement `get(name: string): Playbook | undefined`
  - Implement `has(name: string): boolean`

- [ ] **T3.2**: Implement child playbook execution in `src/playbooks/engine/engine.ts` (Part 3: composition)
  - Add playbook registry to engine constructor
  - Implement child playbook lookup (when step.action === 'playbook')
  - Create isolated PlaybookContext for child execution
  - Map inputs from parent variables to child inputs
  - Execute child playbook via recursive engine.run() call
  - Extract outputs from child ExecutionResult
  - Return outputs to parent via step result
  - Propagate child failures to parent (honor error policy)

- [ ] **T3.3**: Implement circular reference detection
  - Track call stack during execution (parent playbook names)
  - Detect circular references (child name already in call stack)
  - Enforce recursion depth limit (default: 10 levels)
  - Fail with clear error showing call stack

### Testing

- [ ] **T3.4**: Unit tests for composition in `tests/playbooks/engine/composition.test.ts`
  - Test child playbook invocation
  - Test input mapping from parent to child
  - Test output mapping from child to parent
  - Test child failures propagate to parent
  - Test circular reference detection
  - Test recursion depth limit
  - Test execution context isolation

### Acceptance

- [ ] **T3.5**: Verify Phase 3 acceptance criteria
  - Can invoke child playbooks via playbook action ✓
  - Child outputs returned to parent ✓
  - Detects and prevents circular references ✓
  - Enforces recursion depth limit ✓
  - Isolates child execution context ✓

---

## Phase 4: Resource Locking (Priority: Medium)

**Goal**: Prevent concurrent execution conflicts

### Locking Implementation

- [ ] **T4.1**: Implement LockManager in `src/playbooks/engine/lock-manager.ts`
  - Implement `acquire(runId: string, resources: {paths?: string[], branches?: string[]}, owner: string, ttl?: number): Promise<void>`
    - Check if resources already locked via isLocked()
    - Create RunLock object
    - Write lock file to `.xe/runs/locks/run-{runId}.lock`
    - Use atomic write (temp file + rename)
  - Implement `release(runId: string): Promise<void>`
    - Delete lock file for runId
  - Implement `isLocked(resources: {paths?: string[], branches?: string[]}): Promise<boolean>`
    - Check if any requested resources are locked
    - Return true if locked, false otherwise
  - Implement `cleanupStale(): Promise<void>`
    - Scan lock files for expired TTL
    - Delete stale locks

- [ ] **T4.2**: Integrate locking into PlaybookEngine
  - Add resource lock acquisition at start of run()
    - Acquire locks if playbook specifies resources to lock
  - Add lock release at end of run() (success or failure)
  - Add conflict detection (throw error if resources locked)

### Testing

- [ ] **T4.3**: Unit tests for LockManager in `tests/playbooks/engine/lock-manager.test.ts`
  - Test lock acquisition
  - Test lock release
  - Test conflict detection
  - Test stale lock cleanup
  - Test atomic lock acquisition
  - Test lock holder information in errors

### Acceptance

- [ ] **T4.4**: Verify Phase 4 acceptance criteria
  - Prevents concurrent runs on same resources ✓
  - Releases locks on completion ✓
  - Cleans up stale locks ✓
  - Provides lock holder information in errors ✓
  - Atomic lock acquisition ✓

---

## Phase 4.5: Built-in Actions & StepExecutor (Priority: High)

**Goal**: Implement built-in actions for variable management and early termination, plus StepExecutor for nested step execution

### Built-in Actions Implementation

- [x] **T4.5.1**: Create actions directory structure
  - Create `src/playbooks/engine/actions/` directory
  - This directory will hold built-in actions that require privileged access to PlaybookContext

- [x] **T4.5.2**: Implement VarAction in `src/playbooks/engine/actions/var-action.ts`
  - Implement PlaybookAction<VarConfig> interface
  - Primary property: `name` (support `var: variable-name` shorthand)
  - Config validation:
    - Name must be kebab-case format
    - Name must not be reserved word (check reserved list: 'primary', 'step', 'action', 'config', etc.)
  - Privileged access: Accept PlaybookContext as constructor parameter (injected by Engine)
  - Execute logic:
    - Retrieve interpolated value from config.value (already interpolated by Engine before action.execute())
    - Directly mutate context.variables[name] = value
    - Return success result with no outputs
  - Error handling: Throw CatalystError with code 'InvalidVariableName' if validation fails

- [x] **T4.5.3**: Implement ReturnAction in `src/playbooks/engine/actions/return-action.ts`
  - Implement PlaybookAction<ReturnConfig> interface
  - Primary property: `outputs` (support `return: <any-value>` shorthand)
  - Accepts any return type: object, array, string, number, boolean
  - Non-object values (primitives, arrays) wrapped as `{ result: value }` internally
  - Config validation:
    - If playbook defines outputs schema, validate config.outputs match schema
    - Use ValidatorFactory from playbook-definition for schema validation
  - Privileged access: Accept PlaybookContext as constructor parameter
  - Execute logic:
    - Set special flag in context to signal early termination: `context.earlyReturn = { code, message, outputs }`
    - Return success result with outputs
  - Engine integration (implement in Engine):
    - After each step execution, check if context.earlyReturn is set
    - If set, halt execution loop
    - Trigger finally section execution before halting
    - Set final status to 'completed'
    - Return outputs from context.earlyReturn

- [x] **T4.5.4**: ThrowAction is in playbook-actions-controls feature (not here)

### StepExecutor Implementation

- [x] **T4.5.5**: Implement StepExecutor interface in Engine (`src/playbooks/engine/engine.ts`)
  - Add StepExecutor interface implementation to Engine class
  - Implement `executeSteps(steps: PlaybookStep[], variableOverrides?: Record<string, unknown>): Promise<PlaybookActionResult[]>`
  - Logic:
    - Save current context.variables as parentVariables
    - Merge variableOverrides into context.variables (overrides take precedence)
    - Execute each step with full engine semantics:
      - Template interpolation via templateEngine
      - Action lookup and execution
      - Error policy evaluation
      - State persistence (optional: may skip persistence for nested steps)
    - Collect all step results into array
    - Restore parent variables: context.variables = parentVariables (scoped execution)
    - Return collected results
  - Variable override behavior:
    - Overrides shadow parent variables during nested execution
    - Parent variables restored after nested execution completes
    - Nested steps can modify parent variables via VarAction (changes persist after scope)

- [x] **T4.5.6**: Update Engine to use PlaybookProvider.createAction() for action instantiation ✓
  - Engine uses `PlaybookProvider.getInstance()` to get unified provider ✓
  - Use `provider.createAction(actionType, stepExecutorImpl)` for instantiation ✓
  - PlaybookProvider handles StepExecutor injection for PlaybookActionWithSteps subclasses ✓
  - For testing, use `provider.registerAction()` to register mock actions ✓
  - Use `PlaybookProvider.resetInstance()` and `clearAll()` for test isolation ✓
  - Cache action instances in Engine.actionCache for reuse ✓
  - Grant privileged context access for built-in actions via Engine.PRIVILEGED_ACTION_CLASSES ✓

- [x] **T4.5.7**: Implement early return handling in Engine execution loop
  - After each step execution, check `if (context.earlyReturn)`
  - If earlyReturn is set:
    - Break out of main step execution loop
    - Execute finally steps (if present)
    - Set context.status = 'completed'
    - Set context.outputs = context.earlyReturn.outputs
    - Archive state (successful completion)
    - Return ExecutionResult with status='completed'

- [x] **T4.5.8**: Register built-in actions in Engine constructor
  - Import VarAction, ReturnAction
  - Auto-register built-in actions at engine initialization:
    - `actionRegistry.register('var', VarAction)`
    - `actionRegistry.register('return', ReturnAction)`
  - Pass PlaybookContext to built-in action constructors (privileged access)
  - Note: throw and playbook actions are now registered via playbook-actions-controls

### Testing

- [x] **T4.5.9**: Unit tests for VarAction in `tests/playbooks/engine/built-in-actions.test.ts`
  - Test variable assignment via VarAction ✓
  - Test variable accessible in subsequent steps ✓
  - Test kebab-case name validation ✓
  - Test reserved word rejection ✓
  - Test different value types (string, number, boolean, object, array, null, undefined) ✓
  - Test privileged context access (direct mutation) ✓
  - 10 test cases passing ✓

- [x] **T4.5.10**: Unit tests for ReturnAction in `tests/playbooks/engine/built-in-actions.test.ts`
  - Test early termination with return action ✓
  - Test outputs returned to ExecutionResult ✓
  - Test output validation against playbook schema ✓
  - Test default code and message ✓
  - Test custom code, message, and outputs ✓
  - Test earlyReturn flag set in context ✓
  - Test privileged context access for validation ✓
  - 9 test cases passing ✓

- [x] **T4.5.11**: ThrowAction tests are in playbook-actions-controls feature

- [ ] **T4.5.12**: Unit tests for StepExecutor in `tests/playbooks/engine/step-executor.test.ts`
  - Test Engine implements StepExecutor interface
  - Test nested step execution with variable overrides
  - Test overrides shadow parent variables
  - Test parent variables restored after nested execution
  - Test nested step results collected and returned
  - Test template interpolation applied to nested steps
  - Test error policies applied to nested steps
  - Test state persistence for nested steps (or skip persistence)

### Execution Isolation Implementation

- [ ] **T4.5.15**: Add `isolated` property to ActionMetadata type in `src/playbooks/types/action-metadata.ts`
  - Add `isolated?: boolean` optional property
  - Document: Default isolation mode for actions with nested steps

- [ ] **T4.5.16**: Add `isolated` property to PlaybookStep type in `src/playbooks/types/playbook.ts`
  - Add `isolated?: boolean` optional property
  - Document: Override action's default isolation mode for nested step execution

- [ ] **T4.5.17**: Add `isolated` property to control flow actions
  - `if-action.ts`: Add `readonly isolated = false` (shared scope by default)
  - `for-each-action.ts`: Add `readonly isolated = false` (shared scope by default)
  - `playbook-action.ts`: Add `readonly isolated = true` (isolated by default)

- [ ] **T4.5.18**: Update catalog generator to extract `isolated` property
  - In `scripts/generate-action-registry.ts`
  - Extract `isolated` from action instance if available
  - Add to ActionMetadata in generated catalog

- [ ] **T4.5.19**: Implement isolation enforcement in Engine StepExecutor
  - In `src/playbooks/engine/engine.ts`
  - Before executing nested steps:
    1. Get action's default isolation from ActionMetadata
    2. Check for user override in step config
    3. Determine effective isolation
  - When `isolated: false`:
    - Pass parent context variables directly
    - After nested execution, merge changed variables back to parent
  - When `isolated: true`:
    - Create copy of variables for nested execution
    - Discard changes after nested execution completes
  - Variable overrides always scoped regardless of isolation

- [ ] **T4.5.20**: Unit tests for isolation in `tests/playbooks/engine/isolation.test.ts`
  - Test action default isolation respected (if=false, playbook=true)
  - Test user override with `isolated: true` on shared-default action
  - Test user override with `isolated: false` on isolated-default action
  - Test variables propagate back when `isolated: false`
  - Test variables do NOT propagate back when `isolated: true`
  - Test variable overrides (item/index) always scoped regardless of isolation
  - Test engine controls isolation (actions cannot bypass)

- [ ] **T4.5.13**: Update integration tests in `tests/playbooks/engine/integration.test.ts`
  - Add scenario: Playbook with var action setting variable, subsequent step using variable
  - Add scenario: Playbook with return action halting execution early
  - Add scenario: Playbook with throw action triggering catch block
  - Add scenario: Control flow action using StepExecutor (mock action or future `if` action)
  - Add scenario: Variable overrides in nested execution (loop simulation)

### Integration with playbook-definition

- [x] **T4.5.14**: Verify playbook-definition types are available
  - Import StepExecutor interface from playbook-definition ✓
  - Import PlaybookActionWithSteps base class from playbook-definition ✓
  - Import VarConfig, ReturnConfig, ThrowConfig types (defined locally in action files) ✓
  - Verify no circular dependencies (playbook-definition defines types, playbook-engine implements) ✓

### Acceptance

- [x] **T4.5.16**: Verify Phase 4.5 acceptance criteria
  - VarAction sets variables accessible in subsequent steps ✓
  - VarAction validates variable names (kebab-case, not reserved) ✓
  - ReturnAction halts execution successfully with outputs ✓
  - ReturnAction triggers finally section before halting ✓
  - ReturnAction validates outputs match playbook schema (permissive warnings) ✓
  - ThrowAction is in playbook-actions-controls feature
  - Engine implements StepExecutor interface ✓
  - ActionRegistry detects PlaybookActionWithSteps and injects StepExecutor ✓
  - Variable overrides scope correctly (shadow parent, restore after) ✓
  - Nested step execution follows all engine rules (templates, errors, state) ✓
  - Control flow actions (if, for-each) use StepExecutor for nested execution ✓

---

## Phase 5: Advanced Features (Priority: Low)

**Goal**: Optional enhancements for specialized use cases

### What-If Mode

- [ ] **T5.1**: Implement what-if mode in `src/playbooks/engine/what-if.ts`
  - Create WhatIfExecutor that wraps actions
  - Simulate action execution without side effects
  - Log what would have been executed
  - Return simulated results

- [ ] **T5.2**: Integrate what-if mode into engine
  - Check options.mode === 'what-if'
  - Wrap actions with WhatIfExecutor when in what-if mode

### Pre-flight Validation

- [ ] **T5.3**: Implement authorization helper in `src/playbooks/engine/auth.ts`
  - Implement `executeIfAllowed(playbook: Playbook, actor: string): boolean`
  - Check RBAC permissions (if specified in playbook)
  - Validate actor against required permissions
  - Return true if allowed, false otherwise

- [ ] **T5.4**: Implement pre-flight validation
  - Validate paths exist (if specified)
  - Validate locks available (if specified)
  - Validate permissions (if specified)
  - Run before actual execution

### Output Validation

- [ ] **T5.5**: Implement output validation in validators.ts
  - Validate outputs exist after execution
  - Check output types match specification
  - Return clear validation errors

### Testing

- [ ] **T5.6**: Unit tests for advanced features in `tests/playbooks/engine/what-if.test.ts`, `tests/playbooks/engine/auth.test.ts`
  - Test what-if mode simulation
  - Test authorization helper
  - Test pre-flight validation
  - Test output validation

### Acceptance

- [ ] **T5.7**: Verify Phase 5 acceptance criteria
  - What-if mode simulates without side-effects ✓
  - Authorization helper validates permissions ✓
  - Pre-flight validation catches issues early ✓
  - Output validation ensures deliverables exist ✓

---

## Phase 6: Testing & Polish (Priority: High)

**Goal**: Comprehensive testing, documentation, and quality validation

### Testing

- [ ] **T6.1**: Integration tests in `tests/playbooks/engine/integration.test.ts`
  - End-to-end playbook execution with mock actions
  - Multi-step workflow with variables
  - Playbook composition (parent + child)
  - Resume after partial completion
  - What-if mode simulation
  - Error handling scenarios

- [ ] **T6.2**: Performance tests in `tests/playbooks/engine/performance.test.ts`
  - Measure action dispatch time (<10ms)
  - Measure state save time (<100ms)
  - Measure resume validation time (<200ms)
  - Measure engine overhead vs action execution (<5%)

- [ ] **T6.3**: Achieve target coverage
  - Run `npm run test:coverage`
  - Target: 90% overall coverage
  - Target: 100% coverage for critical paths (execution loop, resume, composition, error policies)
  - Fix any failing tests
  - Add tests for uncovered branches

### Documentation

- [ ] **T6.4**: API documentation
  - Add JSDoc comments to all public APIs
  - Document parameters and return types
  - Include usage examples
  - Document error conditions

- [ ] **T6.5**: Update README
  - Overview of playbook engine
  - Quick start guide
  - API reference
  - Example usage

### Error Messages

- [ ] **T6.6**: Review and improve error messages
  - Ensure all errors have clear messages
  - Include context (step name, action type, etc.)
  - Provide actionable guidance
  - Test all error paths

### Acceptance

- [ ] **T6.7**: Verify Phase 6 acceptance criteria
  - 90% code coverage overall ✓
  - 100% coverage for critical paths ✓
  - Engine overhead <5% measured ✓
  - All error paths tested ✓
  - Documentation complete ✓

---

## Final Validation

**Goal**: Verify all requirements met

- [ ] **T7.1**: Validate functional requirements from [spec.md](./spec.md)
  - FR-1: Sequential Step Execution ✓
  - FR-2: State Persistence and Resume ✓
  - FR-3: Playbook Composition ✓
  - FR-4: Human Checkpoints ✓
  - FR-5: Error Handling ✓
  - FR-6: Resource Locking ✓
  - FR-7: Action Instance Registry ✓

- [ ] **T7.2**: Validate non-functional requirements from [spec.md](./spec.md)
  - NFR-1: Performance (<5% overhead, <10ms dispatch, <100ms state save) ✓
  - NFR-2: Reliability (atomic writes, circular detection, lock cleanup) ✓
  - NFR-3: Testability (mockable actions, state, template engine) ✓
  - NFR-4: Extensibility (new actions without engine modification) ✓

- [ ] **T7.3**: Validate success criteria from [spec.md](./spec.md)
  - Zero skipped steps in production workflows ✓
  - Zero data loss on resume ✓
  - 3+ independent playbooks via composition ✓
  - Actionable error messages ✓

- [ ] **T7.4**: Engineering principles review per `.xe/engineering.md`
  - KISS: Simple solutions, no premature optimization ✓
  - YAGNI: Only implemented required features ✓
  - Separation of Concerns: Clear module boundaries ✓
  - Single Responsibility: Each class has one purpose ✓
  - Fail Fast: Clear error messages with immediate failure ✓
  - Design for Testability: Mockable dependencies, high coverage ✓

---

## Task Dependencies

- **Sequential Dependencies**: Phases must complete in order (1 → 2 → 3 → 4 → 4.5 → 5 → 6 → 7)
- **Within-Phase Dependencies**: Tasks within a phase can be done in parallel unless noted
- **Phase 4.5 Dependencies**: Requires Phase 1-4 completed (core engine, error handling, composition, locking)
- **External Dependencies**:
  - playbook-definition feature (provides interfaces and state persistence) - **implemented**
  - playbook-definition feature (provides StepExecutor interface, PlaybookActionWithSteps, VarConfig, ReturnConfig, ThrowConfig) - **in progress (parallel development)**
  - playbook-template-engine feature (provides template interpolation) - **implemented**
  - error-handling feature (provides error framework) - **implemented**

## Success Criteria

Feature is complete when:

- [ ] All 7 phases completed
- [ ] All unit tests passing (90%+ coverage)
- [ ] All integration tests passing
- [ ] Performance benchmarks met (<5% overhead, <10ms dispatch, <100ms state save)
- [ ] All functional requirements validated
- [ ] All non-functional requirements validated
- [ ] Engineering principles review passed
- [ ] Documentation complete (API docs, README, examples)
- [ ] No breaking changes to existing workflows

## Estimated Effort

- **Phase 1 (Core Engine)**: 3-4 days ✅ COMPLETED
- **Phase 2 (Resume & Error Handling)**: 2-3 days ✅ COMPLETED
- **Phase 3 (Composition)**: 2 days ✅ COMPLETED
- **Phase 4 (Resource Locking)**: 1-2 days ✅ COMPLETED
- **Phase 4.5 (Built-in Actions & StepExecutor)**: 2-3 days 🔄 IN PROGRESS
- **Phase 5 (Advanced Features)**: 3-4 days
- **Phase 6 (Testing & Polish)**: 2-3 days
- **Phase 7 (Final Validation)**: 1 day

**Total**: ~16-22 days
