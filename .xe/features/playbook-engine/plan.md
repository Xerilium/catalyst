---
id: playbook-engine
title: Playbook Engine
author: "@flanakin"
description: "Implementation plan for TypeScript playbook execution engine with action-based orchestration"
dependencies:
  - playbook-definition
  - playbook-template-engine
  - error-handling
---

<!-- markdownlint-disable single-title -->

# Implementation Plan: Playbook Engine

**Spec**: [Feature spec](./spec.md)
**Research**: [Research findings](./research.md)

---

## Summary

The playbook engine orchestrates workflow execution by sequentially processing `PlaybookStep` instances, delegating template interpolation to the template engine, looking up and invoking registered actions, managing execution state for pause/resume capability, and validating outputs. The engine is format-agnostic (accepts `Playbook` interface instances), action-extensible (no engine modification needed for new actions), and composable (playbooks can invoke child playbooks).

**Design rationale**: See [research.md](./research.md) for separation of concerns (format vs execution vs templating), action-based extensibility, and state persistence strategy.

---

## Technical Context

This feature extends the technical architecture defined in `.xe/architecture.md`.

**Feature-specific technical details:**

- **Primary Components**: PlaybookEngine (orchestrator), PlaybookProvider, LockManager (resource locking), template integration, state persistence integration
- **Data Structures**: ExecutionContext (runtime state with playbook reference), ExecutionResult (run outcome), ExecutionOptions (run configuration)
- **Dependencies**:
  - **playbook-definition**: Provides `Playbook`, `PlaybookStep`, `PlaybookAction`, `PlaybookState`, `StatePersistence` interfaces
  - **playbook-template-engine**: Provides `TemplateEngine` for interpolation
  - **error-handling**: Provides `CatalystError`, `ErrorPolicy`, `ErrorAction` types
  - Node.js >= 18 (native TypeScript support)
- **Configuration**: None (engine is configured via `ExecutionOptions` parameter)
- **Performance Goals**: <5% engine overhead, <10ms action dispatch, <100ms checkpoint rendering, <200ms resume validation
- **Testing Framework**: Jest with ts-jest, 90% coverage target, 100% for critical paths (execution loop, resume, composition, error policies)
- **Key Constraints**: Format-agnostic (no YAML parsing), action-agnostic (no action implementations), state must be resumable, atomic lock acquisition

---

## Project Structure

```
src/playbooks/
  engine/                    # Core execution engine (this feature)
    engine.ts                # PlaybookEngine class (includes createAction() method)
    actions/                 # Built-in privileged actions
      var-action.ts          # Variable assignment (privileged access)
      return-action.ts       # Early return (privileged access)
    lock-manager.ts          # LockManager class
    execution-context.ts     # ExecutionContext and ExecutionResult types
    validators.ts            # Pre-flight validation logic
    index.ts                 # Public API exports

tests/playbooks/engine/
  engine.test.ts             # Core engine tests
  actions/                   # Built-in action tests
    var-action.test.ts       # VarAction tests
    return-action.test.ts    # ReturnAction tests
  lock-manager.test.ts       # Locking tests
  composition.test.ts        # Playbook composition tests
  resume.test.ts             # Resume capability tests
  integration.test.ts        # End-to-end tests
```

---

## Data Model

**Entities owned by this feature:**

- **PlaybookEngine**: Core orchestration class
  - Methods: `run(playbook, inputs?, options?)`, `resume(runId, options?)`
  - Implements: `StepExecutor` interface (provides `executeSteps()` and `getCallStack()`)
  - Responsibilities: Step sequencing, action instantiation, state persistence, error handling
  - Action instantiation: Uses `createAction()` private method to instantiate actions fresh per step
  - Privileged access: Grants context access via property injection only to `VarAction` and `ReturnAction`

- **LockManager**: Resource lock management
  - Methods: `acquire(runId, resources, owner, ttl?)`, `release(runId)`, `isLocked(resources)`, `cleanupStale()`
  - Lock files: `.xe/runs/locks/run-{runId}.lock`
  - TTL-based expiration for crash recovery

- **createAction() Method**: Private method for instantiating fresh actions via PlaybookProvider
  - Algorithm:
    1. Get PlaybookProvider singleton: `PlaybookProvider.getInstance()`
    2. Call `createAction(actionType, this.stepExecutorImpl)` to get fresh action instance
       - PlaybookProvider handles StepExecutor injection for control flow actions
    3. Grant privileged context access:
       - Use `instanceof` check against `PRIVILEGED_ACTION_CLASSES` allowlist
       - If match: `(action as any).__context = context` (property injection)
       - Only `VarAction` and `ReturnAction` receive context access
    4. Return fresh action instance
  - Security: Constructor-based validation prevents external actions from spoofing privileged access
  - Concurrency: Fresh instances per step ensure correct context and prevent race conditions

- **ExecutionOptions**: Configuration for playbook execution
  - `mode`: 'normal' | 'what-if' (dry-run simulation)
  - `autonomous`: boolean (auto-approve checkpoints)
  - `maxRecursionDepth`: number (composition safety limit)
  - `actor`: string (who is executing)
  - `workingDirectory`: string (base directory for execution)

- **ExecutionResult**: Outcome of playbook execution
  - `runId`: string (unique run identifier)
  - `status`: 'completed' | 'failed' | 'paused'
  - `outputs`: Record<string, unknown> (output values)
  - `error`: CatalystError | undefined
  - `duration`: number (milliseconds)
  - `stepsExecuted`: number
  - `startTime`: string (ISO 8601)
  - `endTime`: string (ISO 8601)

**Entities from other features:**

- **Playbook** (playbook-definition): Workflow definition interface
- **PlaybookStep** (playbook-definition): Step definition interface
- **PlaybookAction** (playbook-definition): Action implementation interface
- **PlaybookActionResult** (playbook-definition): Step execution result
- **PlaybookState** (playbook-definition): Persistent state snapshot
- **PlaybookContext** (playbook-definition): Runtime execution container
- **StatePersistence** (playbook-definition): State save/load operations
- **TemplateEngine** (playbook-template-engine): Expression interpolation
- **CatalystError**, **ErrorPolicy** (error-handling): Error handling framework

---

## Contracts

### PlaybookEngine.run()

**Signature:**

```typescript
async run(
  playbook: Playbook,
  inputs?: Record<string, unknown>,
  options?: ExecutionOptions
): Promise<ExecutionResult>
```

**Parameters:**
- `playbook`: Playbook definition to execute (from any source - YAML loader, TypeScript const, etc.)
- `inputs`: Input parameter values with kebab-case keys
- `options`: Execution configuration (mode, autonomous, etc.)

**Returns:** ExecutionResult with status, outputs, and metrics

**Behavior:**
1. Validate playbook structure (required fields present)
2. Validate inputs against playbook.inputs specification
3. Create PlaybookContext with initial state
4. Acquire resource locks if specified
5. For each step in playbook.steps:
   - Generate step name if not specified (action-type-{sequence})
   - Interpolate step.config via templateEngine
   - Get action via `createAction(step.action, context)` (lazy cached instance)
   - Invoke action.execute(config)
   - Store result in context.variables using step name as key
   - Apply error policy if step fails
   - Persist state via statePersistence
6. Validate outputs exist
7. Release resource locks
8. Archive completed run state
9. Return ExecutionResult

**Error Handling:**
- Throws `CatalystError` with code 'PlaybookNotValid' if structure invalid
- Throws `CatalystError` with code 'InputValidationFailed' if inputs invalid
- Throws `CatalystError` with code 'ActionNotFound' if action type unknown
- Throws `CatalystError` with code 'ResourceLocked' if resources locked
- Applies error policy for step execution failures (Continue, Stop, Retry)

### PlaybookEngine.resume()

**Signature:**

```typescript
async resume(
  runId: string,
  options?: ExecutionOptions
): Promise<ExecutionResult>
```

**Parameters:**
- `runId`: Run identifier to resume (e.g., 'run-20251127-143022-001')
- `options`: Execution configuration (can override original options)

**Returns:** ExecutionResult with continuation status

**Behavior:**
1. Load PlaybookState from `.xe/runs/run-{runId}.json` via statePersistence
2. Validate state structure is compatible
3. Reconstruct PlaybookContext from state
4. Resume execution from `currentStepName`
5. Skip already-completed steps (check context.completedSteps)
6. Continue normal execution from next uncompleted step
7. Preserve checkpoint approval state

**Error Handling:**
- Throws `CatalystError` with code 'StateNotFound' if runId not found
- Throws `CatalystError` with code 'StateCorrupted' if state structure invalid
- Throws `CatalystError` with code 'PlaybookIncompatible' if playbook definition changed incompatibly

### Engine.createAction() (private)

**Signature:**

```typescript
private createAction(actionType: string, context: PlaybookContext): PlaybookAction
```

**Parameters:**
- `actionType`: Action type identifier (e.g., 'var', 'if', 'playbook')
- `context`: Current execution context for privileged access

**Returns:** Action instance ready for execution (lazily cached)

**Behavior:**
1. Check actionCache for existing instance
2. If not cached:
   - Get PlaybookProvider singleton: `PlaybookProvider.getInstance()`
   - Call `createAction(actionType, this.stepExecutorImpl)` to get action instance
   - PlaybookProvider handles prototype chain inspection and StepExecutor injection
   - Cache instance in actionCache
3. Grant privileged context access (on every call, not just instantiation):
   - Check if action instance of `VarAction` or `ReturnAction` using `instanceof`
   - If match: `(action as any).__context = context` (property injection)
4. Return action instance

**Error Handling:**
- Throws `CatalystError` with code 'ActionNotFound' if actionType not registered in PlaybookProvider

**Security:**
- Uses `PRIVILEGED_ACTION_CLASSES = [VarAction, ReturnAction]` allowlist
- Constructor reference comparison prevents external actions from spoofing privileged access
- Property injection happens after instantiation, not in constructor

### LockManager.acquire()

**Signature:**

```typescript
async acquire(
  runId: string,
  resources: { paths?: string[]; branches?: string[] },
  lockOwner: string,
  ttl?: number
): Promise<void>
```

**Parameters:**
- `runId`: Run identifier requesting locks
- `resources`: Resources to lock (file paths, git branches)
- `lockOwner`: Actor owning the lock
- `ttl`: Time-to-live in seconds (default: 3600)

**Behavior:**
1. Check if any requested resources already locked via `isLocked()`
2. If locked, throw error with lock holder info
3. Create RunLock object
4. Write lock file to `.xe/runs/locks/run-{runId}.lock`
5. Use atomic write to prevent race conditions

**Error Handling:**
- Throws `CatalystError` with code 'ResourceLocked' if resources already locked

---

## Implementation Phases

### Phase 1: Core Engine (Priority: High)

**Deliverables:**
- PlaybookEngine class with run() method
- createAction() private method with lazy action caching via PlaybookProvider
- StepExecutorImpl class (wraps Engine without exposing internals)
- VarAction and ReturnAction with property injection pattern
- Basic step execution loop
- Template engine integration for config interpolation
- State persistence integration via StatePersistence
- Input validation against playbook.inputs

**Files:**
- `src/playbooks/engine/engine.ts` (uses PlaybookProvider.createAction(), actionCache, and PRIVILEGED_ACTION_CLASSES)
- `src/playbooks/engine/step-executor-impl.ts` (isolated StepExecutor wrapper)
- `src/playbooks/engine/actions/var-action.ts`
- `src/playbooks/engine/actions/return-action.ts`
- `src/playbooks/engine/execution-context.ts`
- `src/playbooks/engine/validators.ts`
- `src/playbooks/engine/index.ts`

**Tests:**
- `tests/playbooks/engine/engine.test.ts` (includes createAction() tests)
- `tests/playbooks/engine/actions/var-action.test.ts`
- `tests/playbooks/engine/actions/return-action.test.ts`

**Acceptance Criteria:**
- Can execute simple playbook with var and return actions
- Actions instantiated fresh for each step (not cached)
- VarAction mutates context.variables via privileged access
- ReturnAction sets context.earlyReturn via privileged access
- Step results stored in context.variables
- State persisted after each step
- Inputs validated before execution
- Template interpolation applied to step configs
- External actions cannot spoof privileged access

**Estimated Effort:** 3-4 days

### Phase 2: Resume & Error Handling (Priority: High)

**Deliverables:**
- PlaybookEngine.resume() method
- Error policy evaluation logic
- Catch/finally block execution
- Retry logic with exponential backoff
- State validation and migration

**Files:**
- Update `src/playbooks/engine/engine.ts`
- Add `src/playbooks/engine/error-handler.ts`

**Tests:**
- `tests/playbooks/engine/resume.test.ts`
- `tests/playbooks/engine/error-handling.test.ts`

**Acceptance Criteria:**
- Can resume from saved state
- Skips completed steps on resume
- Applies error policies (Continue, Stop, Retry)
- Executes catch blocks on error
- Executes finally blocks always
- Validates state compatibility

**Estimated Effort:** 2-3 days

### Phase 3: Composition (Priority: High)

**Deliverables:**
- Playbook registry for named lookups
- Child playbook execution isolation
- Input mapping from parent to child
- Output mapping from child to parent
- Circular reference detection
- Recursion depth limiting

**Files:**
- Update `src/playbooks/engine/engine.ts`
- Add `src/playbooks/engine/playbook-registry.ts`

**Tests:**
- `tests/playbooks/engine/composition.test.ts`

**Acceptance Criteria:**
- Can invoke child playbooks via playbook action
- Child outputs returned to parent
- Detects and prevents circular references
- Enforces recursion depth limit
- Isolates child execution context

**Estimated Effort:** 2 days

### Phase 4: Resource Locking (Priority: Medium)

**Deliverables:**
- LockManager class
- Lock acquisition and release
- Stale lock cleanup via TTL
- Lock conflict detection
- Lock file persistence

**Files:**
- `src/playbooks/engine/lock-manager.ts`

**Tests:**
- `tests/playbooks/engine/lock-manager.test.ts`

**Acceptance Criteria:**
- Prevents concurrent runs on same resources
- Releases locks on completion
- Cleans up stale locks
- Provides lock holder information in errors
- Atomic lock acquisition

**Estimated Effort:** 1-2 days

### Phase 4.5: Built-in Actions & StepExecutor (Priority: High)

**Deliverables:**
- Built-in VarAction for variable assignment
- Built-in ReturnAction for successful early termination
- StepExecutor interface implementation in Engine
- ActionRegistry detection of PlaybookActionWithSteps
- StepExecutor injection into actions needing nested execution
- Variable override support for scoped execution

**Note:** ThrowAction and PlaybookRunAction are part of the playbook-actions-controls feature.

**Files:**
- Add `src/playbooks/engine/actions/var-action.ts`
- Add `src/playbooks/engine/actions/return-action.ts`
- Update `src/playbooks/engine/engine.ts` (implement StepExecutor interface)
- Update `src/playbooks/engine/action-registry.ts` (detect PlaybookActionWithSteps)

**Tests:**
- `tests/playbooks/engine/built-in-actions.test.ts`
- `tests/playbooks/engine/step-executor.test.ts`
- Update `tests/playbooks/engine/integration.test.ts` (add scenarios with new actions)

**Implementation Details:**

**VarAction:**
- Implements PlaybookAction<VarConfig>
- Primary property: `name` (enables `var: variable-name` shorthand via `name: ${{primary}}`)
- Config validation: Name must be kebab-case, not reserved word
- Receives PlaybookContext as privileged parameter (injected by Engine)
- Directly mutates `context.variables[name] = interpolatedValue`
- Returns success result with no outputs
- Template interpolation: Apply to `config.value` before assignment

**ReturnAction:**
- Implements PlaybookAction<ReturnConfig>
- Primary property: `outputs` (enables `return: <any-value>` shorthand)
- Accepts any return type: object, array, string, number, boolean
- Non-object values (primitives, arrays) wrapped as `{ result: value }` internally
- Config validation: If playbook defines outputs, validate outputs match schema
- Receives PlaybookContext as privileged parameter
- Sets special flag in context to signal early termination: `context.earlyReturn = { code, message, outputs }`
- Engine detects earlyReturn flag and halts execution after step completes
- Triggers finally section execution before halting
- Returns success result with outputs

**Note:** ThrowAction is part of the playbook-actions-controls feature, not playbook-engine.

**StepExecutor Implementation:**
- Engine implements StepExecutor interface:
  ```typescript
  async executeSteps(
    steps: PlaybookStep[],
    variableOverrides?: Record<string, unknown>
  ): Promise<PlaybookActionResult[]>
  ```
- Creates temporary scoped context with overrides
- Executes steps with full engine semantics (templates, error policies, state persistence)
- Collects and returns all step results
- Variable overrides shadow parent variables during execution
- Parent context unchanged unless steps explicitly modify parent variables

**PlaybookProvider Integration:**
- Engine uses `PlaybookProvider.getInstance()` to get unified provider
- Use `provider.createAction(actionType, stepExecutorImpl)` for instantiation
- PlaybookProvider handles StepExecutor injection for PlaybookActionWithSteps subclasses
- For testing, use `provider.registerAction()` to register mock actions
- Use `PlaybookProvider.resetInstance()` and `clearAll()` for test isolation

**Variable Override Behavior:**
- Override variables are merged into context.variables before step execution
- Overrides take precedence over parent variables
- After nested execution completes, restore parent variables (scoped execution)
- Use cases: `item` and `index` in for-each loops, conditional isolation

**Integration with playbook-definition:**
- Import StepExecutor interface from playbook-definition
- Import PlaybookActionWithSteps base class from playbook-definition
- No circular dependency (playbook-definition defines types, playbook-engine implements)
- PlaybookAction (playbook action) will extend PlaybookActionWithSteps

**Acceptance Criteria:**
- VarAction sets variables accessible in subsequent steps ✓
- VarAction validates variable names (kebab-case, not reserved) ✓
- ReturnAction halts execution successfully with outputs ✓
- ReturnAction triggers finally section before halting ✓
- ReturnAction validates outputs match playbook schema ✓
- ThrowAction is in playbook-actions-controls (not playbook-engine)
- Engine implements StepExecutor interface ✓
- ActionRegistry detects PlaybookActionWithSteps and injects StepExecutor ✓
- Variable overrides scope correctly (shadow parent, restore after) ✓
- Nested step execution follows all engine rules (templates, errors, state) ✓
- Control flow actions (if, for-each) use StepExecutor for nested execution ✓

**Estimated Effort:** 2-3 days

### Phase 5: Advanced Features (Priority: Low)

**Deliverables:**
- What-if/dry-run mode
- Parallel execution support (optional)
- Authorization helper (executeIfAllowed)
- Pre-flight validation (RBAC, paths, locks)
- Output validation

**Files:**
- Update `src/playbooks/engine/engine.ts`
- Add `src/playbooks/engine/what-if.ts`
- Add `src/playbooks/engine/parallel.ts`
- Add `src/playbooks/engine/auth.ts`

**Tests:**
- `tests/playbooks/engine/what-if.test.ts`
- `tests/playbooks/engine/parallel.test.ts`

**Acceptance Criteria:**
- What-if mode simulates without side-effects
- Parallel execution respects lock constraints
- Authorization helper validates permissions
- Pre-flight validation catches issues early
- Output validation ensures deliverables exist

**Estimated Effort:** 3-4 days

### Phase 6: Testing & Polish (Priority: High)

**Deliverables:**
- Comprehensive unit tests (90% coverage)
- Integration tests with mock actions
- Performance benchmarks
- Error message improvements
- Documentation and examples

**Files:**
- `tests/playbooks/engine/integration.test.ts`
- `tests/playbooks/engine/performance.test.ts`
- Update README and API docs

**Acceptance Criteria:**
- 90% code coverage overall
- 100% coverage for critical paths
- Engine overhead <5% measured
- All error paths tested
- Examples in spec.md work

**Estimated Effort:** 2-3 days

---

## Testing Strategy

### Unit Tests

**Coverage targets:**
- PlaybookEngine class: 95%
- ActionRegistry: 100%
- LockManager: 100%
- Error handling: 100%
- Validators: 100%

**Key test scenarios:**
- Happy path execution
- Step failure with each error policy
- Resume from each possible state
- Circular reference detection
- Lock conflicts
- Input validation failures
- Template interpolation errors

### Integration Tests

**Test scenarios:**
- End-to-end playbook execution with mock actions
- Multi-step workflow with variables
- Playbook composition (parent + child)
- Resume after partial completion
- Concurrent execution with locking
- What-if mode simulation
- Checkpoint interaction (manual approval)

**Mock dependencies:**
- MockAction: Simple action for testing
- MockTemplateEngine: Returns input unchanged
- MockStatePersistence: In-memory state storage
- MockLockManager: In-memory lock tracking

### Performance Tests

**Benchmarks:**
- Action dispatch time (<10ms)
- State save time (<100ms)
- Resume validation time (<200ms)
- Engine overhead vs action execution (<5%)

---

## Migration Strategy

**No migration required** - This is a new feature with no existing implementation to replace.

**Integration points:**
- playbook-yaml feature will call `engine.run(playbook, inputs)`
- playbook-actions-* features will register actions via `engine.registerAction()`
- CLI commands will use engine API

---

## Risk Assessment

### Technical Risks

**Risk: State corruption during crash**
- Mitigation: Atomic writes via temp file + rename
- Mitigation: State validation on resume
- Fallback: Manual state repair instructions in error message

**Risk: Circular playbook references**
- Mitigation: Track call stack during composition
- Mitigation: Enforce recursion depth limit
- Fallback: Clear error message with cycle path

**Risk: Template interpolation failures**
- Mitigation: Delegate to battle-tested template engine
- Mitigation: Catch and wrap errors with context
- Fallback: Show step config causing error

**Risk: Lock deadlocks**
- Mitigation: TTL-based stale lock cleanup
- Mitigation: Pre-flight lock validation
- Fallback: Manual lock release via CLI

### Process Risks

**Risk: Scope creep (too many features)**
- Mitigation: Strict phase boundaries
- Mitigation: Optional features in later phases
- Monitoring: Weekly progress against plan

**Risk: Integration delays with dependent features**
- Mitigation: Define clear interfaces early
- Mitigation: Mock dependencies for testing
- Monitoring: Regular check-ins with other feature teams

---

## Success Criteria

This implementation is successful when:

- [ ] Can execute playbook with 3+ steps
- [ ] Step results accessible in subsequent steps via variables
- [ ] Can resume from saved state
- [ ] Error policies work (Continue, Stop, Retry)
- [ ] Can compose playbooks (parent calls child)
- [ ] Resource locking prevents conflicts
- [ ] 90% code coverage achieved
- [ ] All integration tests passing
- [ ] Engine overhead <5% measured
- [ ] Documentation complete with examples

---

## Dependencies

### Internal

- **playbook-definition** (implemented): Provides interfaces and state persistence
- **playbook-template-engine** (in progress): Provides template interpolation
- **error-handling** (implemented): Provides error framework

### External

- None (Node.js >= 18 only)

---

## Open Questions

### Resolved

1. ✅ **Action discovery**: Defer to Phase 5 (Advanced Features). Use manual registration initially for simplicity.

2. ✅ **Checkpoint UX in non-interactive environments**: Non-interactive runs (CI/CD) will use PRs for checkpoints. State will be saved in PRs to pause until merged. After merge, playbook continues manually. Autonomous continuation via GitHub action comes in later phase.

3. ✅ **Lock TTL default**: 1 hour (3600 seconds), configurable via ExecutionOptions.

4. ✅ **State schema versioning**: This is owned by playbook-definition feature, not playbook-engine. playbook-definition will include version field in PlaybookState and handle migration.

### Open

None

---

## References

- [Feature Spec](./spec.md)
- [Research](./research.md)
- [playbook-definition spec](../playbook-definition/spec.md)
- [playbook-template-engine spec](../playbook-template-engine/spec.md)
- [error-handling spec](../error-handling/spec.md)
