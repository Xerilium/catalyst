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

- **Primary Components**: PlaybookEngine (orchestrator), ActionRegistry (action discovery and lookup), LockManager (resource locking), template integration, state persistence integration
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
src/playbooks/scripts/
  engine/                    # Core execution engine (this feature)
    engine.ts                # PlaybookEngine class
    action-registry.ts       # ActionRegistry class
    lock-manager.ts          # LockManager class
    execution-context.ts     # ExecutionContext and ExecutionResult types
    validators.ts            # Pre-flight validation logic
    index.ts                 # Public API exports

tests/playbooks/engine/
  engine.test.ts             # Core engine tests
  action-registry.test.ts    # Registry tests
  lock-manager.test.ts       # Locking tests
  composition.test.ts        # Playbook composition tests
  resume.test.ts             # Resume capability tests
  integration.test.ts        # End-to-end tests
```

---

## Data Model

**Entities owned by this feature:**

- **PlaybookEngine**: Core orchestration class
  - Methods: `run(playbook, inputs?, options?)`, `resume(runId, options?)`, `registerAction(name, action)`, `registerPlaybook(playbook)`
  - Responsibilities: Step sequencing, action dispatch, state persistence, error handling

- **ActionRegistry**: Runtime action instance registry (different from ACTION_REGISTRY)
  - ACTION_REGISTRY (playbook-definition): Build-time metadata mapping action types → ActionMetadata
  - ActionRegistry (playbook-engine): Runtime mapping action types → PlaybookAction instances
  - Methods: `register(name, action)`, `get(name)`, `has(name)`, `getAll()`
  - Singleton instance created at engine initialization
  - Convention-based discovery from `src/playbooks/scripts/playbooks/actions/` directory (Phase 5)

- **LockManager**: Resource lock management
  - Methods: `acquire(runId, resources, owner, ttl?)`, `release(runId)`, `isLocked(resources)`, `cleanupStale()`
  - Lock files: `.xe/runs/locks/run-{runId}.lock`
  - TTL-based expiration for crash recovery

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
   - Lookup action from actionRegistry
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

### ActionRegistry.register()

**Signature:**

```typescript
register(actionName: string, action: PlaybookAction<unknown>): void
```

**Parameters:**
- `actionName`: Action type identifier in kebab-case (e.g., 'file-write', 'github-issue-create')
- `action`: Action implementation instance implementing PlaybookAction interface

**Behavior:**
- Store mapping from actionName to action instance
- Validate actionName is kebab-case
- Check for duplicate registration

**Error Handling:**
- Throws `CatalystError` with code 'DuplicateAction' if actionName already registered

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
- ActionRegistry with register() and get() methods
- Basic step execution loop
- Template engine integration for config interpolation
- State persistence integration via StatePersistence
- Input validation against playbook.inputs

**Files:**
- `src/playbooks/scripts/engine/engine.ts`
- `src/playbooks/scripts/engine/action-registry.ts`
- `src/playbooks/scripts/engine/execution-context.ts`
- `src/playbooks/scripts/engine/validators.ts`
- `src/playbooks/scripts/engine/index.ts`

**Tests:**
- `tests/playbooks/engine/engine.test.ts`
- `tests/playbooks/engine/action-registry.test.ts`

**Acceptance Criteria:**
- Can execute simple playbook with mock action
- Step results stored in context.variables
- State persisted after each step
- Inputs validated before execution
- Template interpolation applied to step configs

**Estimated Effort:** 3-4 days

### Phase 2: Resume & Error Handling (Priority: High)

**Deliverables:**
- PlaybookEngine.resume() method
- Error policy evaluation logic
- Catch/finally block execution
- Retry logic with exponential backoff
- State validation and migration

**Files:**
- Update `src/playbooks/scripts/engine/engine.ts`
- Add `src/playbooks/scripts/engine/error-handler.ts`

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
- Update `src/playbooks/scripts/engine/engine.ts`
- Add `src/playbooks/scripts/engine/playbook-registry.ts`

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
- `src/playbooks/scripts/engine/lock-manager.ts`

**Tests:**
- `tests/playbooks/engine/lock-manager.test.ts`

**Acceptance Criteria:**
- Prevents concurrent runs on same resources
- Releases locks on completion
- Cleans up stale locks
- Provides lock holder information in errors
- Atomic lock acquisition

**Estimated Effort:** 1-2 days

### Phase 5: Advanced Features (Priority: Low)

**Deliverables:**
- What-if/dry-run mode
- Parallel execution support (optional)
- Authorization helper (executeIfAllowed)
- Pre-flight validation (RBAC, paths, locks)
- Output validation

**Files:**
- Update `src/playbooks/scripts/engine/engine.ts`
- Add `src/playbooks/scripts/engine/what-if.ts`
- Add `src/playbooks/scripts/engine/parallel.ts`
- Add `src/playbooks/scripts/engine/auth.ts`

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
