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
  - Create `src/playbooks/scripts/engine/` directory
  - Create `tests/playbooks/engine/` directory
  - Set up TypeScript configuration if needed

### Core Implementation

- [ ] **T1.2**: Implement ExecutionContext type in `src/playbooks/scripts/engine/execution-context.ts`
  - Define `ExecutionOptions` interface (mode, autonomous, maxRecursionDepth, actor, workingDirectory)
  - Define `ExecutionResult` interface (runId, status, outputs, error, duration, stepsExecuted, startTime, endTime)
  - Export types for use by engine

- [ ] **T1.3**: Implement input validation in `src/playbooks/scripts/engine/validators.ts`
  - Validate playbook structure (name, description, owner, steps present)
  - Validate inputs against playbook.inputs specification
    - Required parameters present
    - Type checking (string, number, boolean)
    - Validation rules applied (regex, length, range, custom)
  - Use ValidatorFactory from playbook-definition for rule validation
  - Return clear validation error messages

- [ ] **T1.4**: Implement ActionRegistry in `src/playbooks/scripts/engine/action-registry.ts`
  - Create singleton registry class
  - Implement `register(name: string, action: PlaybookAction): void`
  - Implement `get(name: string): PlaybookAction | undefined`
  - Implement `has(name: string): boolean`
  - Implement `getAll(): Record<string, PlaybookAction>`
  - Validate action names are kebab-case
  - Prevent duplicate registrations

- [ ] **T1.5**: Implement PlaybookEngine core in `src/playbooks/scripts/engine/engine.ts` (Part 1: run())
  - Implement constructor accepting TemplateEngine, StatePersistence, ActionRegistry
  - Implement `run(playbook: Playbook, inputs?: Record<string, unknown>, options?: ExecutionOptions): Promise<ExecutionResult>`
  - Validate playbook structure (call validators.ts)
  - Validate inputs (call validators.ts)
  - Create PlaybookContext with initial state (use playbook-definition types)
  - Generate unique runId (format: YYYYMMDD-HHMMSS-nnn)
  - Implement step execution loop:
    - For each step in playbook.steps:
      - Generate step name if not specified (`{action-type}-{sequence}`)
      - Interpolate step.config via templateEngine.interpolateObject()
      - Lookup action from actionRegistry
      - Invoke action.execute(config)
      - Store result in context.variables using step name as key
      - Persist state via statePersistence.save()
  - Return ExecutionResult with success status

- [ ] **T1.6**: Implement public API exports in `src/playbooks/scripts/engine/index.ts`
  - Export PlaybookEngine class
  - Export ActionRegistry class
  - Export ExecutionOptions, ExecutionResult types
  - Export validators module

### Testing

- [ ] **T1.7**: Unit tests for validators in `tests/playbooks/engine/validators.test.ts`
  - Test playbook structure validation
  - Test input validation (required params, types, validation rules)
  - Test error messages are clear

- [ ] **T1.8**: Unit tests for ActionRegistry in `tests/playbooks/engine/action-registry.test.ts`
  - Test action registration
  - Test action lookup
  - Test duplicate registration prevention
  - Test kebab-case name validation

- [ ] **T1.9**: Unit tests for PlaybookEngine in `tests/playbooks/engine/engine.test.ts`
  - Test simple playbook execution with mock action
  - Test step results stored in context.variables
  - Test state persisted after each step
  - Test inputs validated before execution
  - Test template interpolation applied to step configs
  - Test unknown action type fails with clear error

### Acceptance

- [ ] **T1.10**: Verify Phase 1 acceptance criteria
  - Can execute simple playbook with mock action ✓
  - Step results stored in context.variables ✓
  - State persisted after each step ✓
  - Inputs validated before execution ✓
  - Template interpolation applied to step configs ✓

---

## Phase 2: Resume & Error Handling (Priority: High)

**Goal**: Resume capability and error policy integration

### Resume Implementation

- [ ] **T2.1**: Implement PlaybookEngine resume in `src/playbooks/scripts/engine/engine.ts` (Part 2: resume())
  - Implement `resume(runId: string, options?: ExecutionOptions): Promise<ExecutionResult>`
  - Load PlaybookState from statePersistence.load(runId)
  - Validate state structure is compatible
  - Reconstruct PlaybookContext from state
  - Skip already-completed steps (check context.completedSteps)
  - Resume execution from currentStepName
  - Continue normal execution from next uncompleted step

### Error Handling

- [ ] **T2.2**: Implement error policy evaluation in `src/playbooks/scripts/engine/error-handler.ts`
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

### Acceptance

- [ ] **T2.7**: Verify Phase 2 acceptance criteria
  - Can resume from saved state ✓
  - Skips completed steps on resume ✓
  - Applies error policies (Continue, Stop, Retry) ✓
  - Executes catch blocks on error ✓
  - Executes finally blocks always ✓
  - Validates state compatibility ✓

---

## Phase 3: Composition (Priority: High)

**Goal**: Playbook composition with child playbook execution

### Composition Implementation

- [ ] **T3.1**: Implement playbook registry in `src/playbooks/scripts/engine/playbook-registry.ts`
  - Create PlaybookRegistry class
  - Implement `register(name: string, playbook: Playbook): void`
  - Implement `get(name: string): Playbook | undefined`
  - Implement `has(name: string): boolean`

- [ ] **T3.2**: Implement child playbook execution in `src/playbooks/scripts/engine/engine.ts` (Part 3: composition)
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

- [ ] **T4.1**: Implement LockManager in `src/playbooks/scripts/engine/lock-manager.ts`
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

## Phase 5: Advanced Features (Priority: Low)

**Goal**: Optional enhancements for specialized use cases

### What-If Mode

- [ ] **T5.1**: Implement what-if mode in `src/playbooks/scripts/engine/what-if.ts`
  - Create WhatIfExecutor that wraps actions
  - Simulate action execution without side effects
  - Log what would have been executed
  - Return simulated results

- [ ] **T5.2**: Integrate what-if mode into engine
  - Check options.mode === 'what-if'
  - Wrap actions with WhatIfExecutor when in what-if mode

### Pre-flight Validation

- [ ] **T5.3**: Implement authorization helper in `src/playbooks/scripts/engine/auth.ts`
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

- **Sequential Dependencies**: Phases must complete in order (1 → 2 → 3 → 4 → 5 → 6 → 7)
- **Within-Phase Dependencies**: Tasks within a phase can be done in parallel unless noted
- **External Dependencies**:
  - playbook-definition feature (provides interfaces and state persistence) - **implemented**
  - playbook-template-engine feature (provides template interpolation) - **in progress**
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

- **Phase 1 (Core Engine)**: 3-4 days
- **Phase 2 (Resume & Error Handling)**: 2-3 days
- **Phase 3 (Composition)**: 2 days
- **Phase 4 (Resource Locking)**: 1-2 days
- **Phase 5 (Advanced Features)**: 3-4 days
- **Phase 6 (Testing & Polish)**: 2-3 days
- **Phase 7 (Final Validation)**: 1 day

**Total**: ~14-19 days
