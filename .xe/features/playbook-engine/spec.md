---
id: playbook-engine
title: Playbook Engine
author: "@flanakin"
description: "Workflow execution orchestration engine providing step sequencing, composition, checkpoints, and resume capabilities"
dependencies:
  - playbook-definition
  - playbook-template-engine
  - error-handling
---

# Feature: Playbook Engine

## Problem

Workflows need reliable execution orchestration to ensure steps are followed sequentially, support pause/resume for long-running operations, and enable composition into smaller, independently executable units. Without execution orchestration, achieving consistent, high-quality outcomes at scale is difficult, and complex workflows cannot be broken into manageable chunks.

## Goals

- Execute workflow steps sequentially with guaranteed step-by-step progression
- Enable workflow composition by breaking large playbooks into smaller, independently executable units
- Provide resume capability from saved execution state
- Support human checkpoints at critical decision points

## Scenario

- As a **playbook author**, I need to define multi-step workflows that execute reliably
  - Outcome: Engine executes steps sequentially, never skips steps, persists state after each step

- As a **playbook author**, I need workflows to resume after interruption without losing progress
  - Outcome: Engine saves execution state, can resume from last completed step

- As a **playbook author**, I need to compose large workflows from smaller, reusable units
  - Outcome: Playbooks can invoke child playbooks, isolating execution context and enabling modular workflow design

## Success Criteria

- Playbook execution enforces sequential step progression (zero skipped steps in production workflows)
- Resume capability enables continuation from interruption with zero data loss
- Composition enables breaking multi-phase workflows into 3+ independent playbooks
- Failed playbooks provide actionable error messages indicating which step failed and why

## Design Principles

**Extensibility through composition, not modification**
> New capabilities are added via new action types, not by changing the engine. Actions are discovered and registered automatically. This ensures the engine remains stable while workflow capabilities expand.

**Explicit over implicit**
> Workflow behavior must be explicitly defined in playbook definitions. No hidden defaults, no magic behavior. Every step, input, output, and checkpoint is visible in the definition. This makes workflows auditable and debuggable.

**Fail fast with clear guidance**
> Validation errors stop execution immediately with specific, actionable error messages. Never silently continue or guess intent. Messages include the exact requirement violated and how to fix it.

## Requirements

### Functional Requirements

**FR-1**: Sequential Step Execution

- **FR-1.1**: System MUST execute playbook steps sequentially in definition order
- **FR-1.2**: System MUST NOT allow steps to be skipped or reordered during execution
- **FR-1.3**: System MUST validate playbook structure before execution begins
  - Required properties: `name`, `description`, `owner`, `steps`
  - Invalid playbooks MUST fail fast with actionable error messages
- **FR-1.4**: System MUST validate inputs against playbook input specifications
  - Required parameters MUST be provided
  - Type checking MUST be enforced (string, number, boolean)
  - Validation rules MUST be applied (regex, length, range, custom)
- **FR-1.5**: System MUST interpolate step configuration before action execution
  - Delegates to playbook-template-engine for template resolution
  - Supports `{{variable}}` and `${{ expression }}` syntax
- **FR-1.6**: System MUST invoke appropriate action for each step's action type
  - Actions registered via ActionRegistry (runtime registry defined in FR-7)
  - Action lookup uses PlaybookAction interface from playbook-definition feature
  - Unknown action types MUST fail with clear error
- **FR-1.7**: System MUST store step results in execution context
  - Named steps: result stored with step name as key
  - Unnamed steps: auto-generate name as `{action-type}-{sequence}`
  - Results accessible to subsequent steps via template expressions
  - Uses PlaybookContext from playbook-definition feature

**FR-2**: State Persistence and Resume

- **FR-2.1**: System MUST persist execution state after each step completes
  - State saved to `.xe/runs/run-{runId}.json`
  - State includes: playbook name, run ID, inputs, variables, completed steps, current step, status
  - Uses atomic writes to prevent corruption
- **FR-2.2**: System MUST provide resume capability
  - Load state from `.xe/runs/run-{runId}.json`
  - Skip already-completed steps
  - Continue from next uncompleted step
  - Validate state compatibility with playbook definition
- **FR-2.3**: System MUST archive completed runs
  - Move to `.xe/runs/history/{YYYY}/{MM}/{DD}/run-{runId}.json`
  - Active runs remain in `.xe/runs/` for resume capability

**FR-3**: Playbook Composition

- **FR-3.1**: System MUST support `playbook` action type for invoking child playbooks
  - Child playbook MUST conform to Playbook interface from playbook-definition feature
- **FR-3.2**: Child playbook execution MUST be isolated
  - Child MUST NOT modify parent execution context
  - Child inputs MUST be explicitly mapped from parent variables
  - Child outputs MUST be returned to parent via step result (PlaybookActionResult)
- **FR-3.3**: Child playbook failures MUST propagate to parent by default
  - Parent MAY override with explicit error policy on playbook step
- **FR-3.4**: System MUST detect circular playbook references
  - Prevent infinite recursion
  - Enforce recursion depth limit (default: 10 levels)
  - Fail with clear error showing call stack

**FR-4**: Human Checkpoints

- **FR-4.1**: System MUST support checkpoint steps that pause execution
- **FR-4.2**: In manual mode (default), checkpoints MUST pause execution until user input
- **FR-4.3**: In autonomous mode, checkpoints MUST be automatically approved
- **FR-4.4**: Checkpoint approval state MUST be persisted in execution state
- **FR-4.5**: Resume MUST respect checkpoint approval (don't re-prompt for approved checkpoints)

**FR-5**: Error Handling

- **FR-5.1**: System MUST support per-step error policies (from error-handling feature)
- **FR-5.2**: Engine MUST evaluate error policies when actions fail
  - Map error code to policy action (Continue, Stop, Retry, Ignore)
  - Apply default policy when error code not mapped
  - Execute retry logic with exponential backoff when policy = Retry
- **FR-5.3**: System MUST support `catch` section for error recovery
  - Catch section maps error codes to recovery steps
  - Recovery steps execute before failing playbook
- **FR-5.4**: System MUST support `finally` section for cleanup
  - Finally section executes regardless of success/failure
  - Finally failures logged but don't fail playbook if main execution succeeded

**FR-6**: Resource Locking

- **FR-6.1**: System MUST support resource locks to prevent concurrent conflicts
  - Lock files: `.xe/runs/locks/run-{runId}.lock`
  - Lock metadata: run ID, locked paths, locked branches, lock owner, TTL
- **FR-6.2**: Engine MUST detect conflicts on branch names and file paths
- **FR-6.3**: Conflicting runs MUST be prevented with clear error message
- **FR-6.4**: Locks MUST be released on playbook completion (success or failure)
- **FR-6.5**: Stale locks (exceeded TTL) MUST be automatically cleaned up

**FR-7**: Action Instance Registry

- **FR-7.1**: System MUST maintain runtime action registry mapping action type names to action instances
  - Different from ACTION_REGISTRY (playbook-definition) which maps types to action metadata (dependencies, primaryProperty, configSchema)
  - This registry stores executable action instances for step execution
- **FR-7.2**: System MUST provide registration API for action implementations
  - `registerAction(actionName, action)` for manual registration
  - Action instances MUST implement PlaybookAction interface from playbook-definition feature
  - Action name MUST be kebab-case (e.g., 'file-write', 'http-get')
  - Duplicate action names MUST cause error
- **FR-7.3**: System MAY support convention-based action discovery
  - Scan `src/playbooks/actions/` directory
  - Auto-register classes implementing `PlaybookAction` interface
  - Use `@Action('name')` decorator for explicit naming

### Non-functional Requirements

**NFR-1**: Performance

- **NFR-1.1**: Engine overhead MUST be <5% of total playbook execution time
- **NFR-1.2**: Step dispatch (finding and invoking action) MUST complete in <10ms
- **NFR-1.3**: State save operations MUST complete in <100ms for states <1MB

**NFR-2**: Reliability

- **NFR-2.1**: State writes MUST be atomic to prevent corruption on crash
- **NFR-2.2**: Circular dependency detection MUST prevent infinite recursion
- **NFR-2.3**: Lock cleanup MUST occur even if engine crashes (via TTL expiration)
- **NFR-2.4**: State corruption MUST be detected on resume with clear recovery instructions

**NFR-3**: Testability

- **NFR-3.1**: Action invocation MUST be mockable for unit testing
- **NFR-3.2**: State persistence MUST be mockable for testing
- **NFR-3.3**: Template engine MUST be mockable for testing
- **NFR-3.4**: 90% code coverage across engine core
- **NFR-3.5**: 100% coverage for critical paths: step execution, resume, composition, error policies

**NFR-4**: Extensibility

- **NFR-4.1**: New action types MUST be addable without modifying engine code
- **NFR-4.2**: Engine MUST remain agnostic to specific action implementations

## Key Entities

**Entities owned by this feature:**

- **PlaybookEngine**: Core orchestration service
  - Responsibilities: Step sequencing, action dispatch, resume logic, checkpoints
  - API: `run(playbook, inputs, options)`, `resume(runId, options)`

- **ActionRegistry**: Runtime registry mapping action type names to executable action instances
  - Responsibilities: Action discovery, registration, lookup, step execution dispatch
  - API: `register(name, action)`, `get(name)`, `has(name)`, `getAll()`
  - Different from ACTION_REGISTRY (playbook-definition) which is build-time metadata

- **LockManager**: Resource lock management
  - Responsibilities: Lock acquisition, release, conflict detection, stale cleanup
  - API: `acquire(runId, resources, owner)`, `release(runId)`, `isLocked(resources)`, `cleanupStale()`

- **RunLock**: Resource lock metadata
  - Attributes: runId, lockedPaths, lockedBranches, lockOwner, lockAcquiredAt, lockTTL
  - Location: `.xe/runs/locks/run-{runId}.lock`

- **ExecutionOptions**: Configuration for playbook execution
  - Properties: mode (normal/what-if), autonomous (boolean), maxRecursionDepth, actor, workingDirectory

- **ExecutionResult**: Outcome of playbook execution
  - Properties: runId, status, outputs, error, duration, stepsExecuted, startTime, endTime

**Entities from other features:**

- **Playbook** (playbook-definition): Workflow definition interface
- **PlaybookStep** (playbook-definition): Step definition interface
- **PlaybookAction** (playbook-definition): Action interface contract
- **PlaybookActionResult** (playbook-definition): Step execution result
- **PlaybookState** (playbook-definition): Persistent state snapshot
- **PlaybookContext** (playbook-definition): Runtime execution container
- **StatePersistence** (playbook-definition): State save/load operations
- **ACTION_REGISTRY** (playbook-definition): Build-time metadata registry mapping action types to ActionMetadata (dependencies, primaryProperty, configSchema)
- **ActionMetadata** (playbook-definition): Action metadata containing dependencies, primaryProperty, and configSchema
- **PlaybookActionDependencies** (playbook-definition): CLI and environment dependencies for actions
- **DependencyChecker** (playbook-definition): Service for validating action dependencies before execution
- **TemplateEngine** (playbook-template-engine): Expression evaluation and interpolation
- **CatalystError** (error-handling): Error handling with code and guidance
- **ErrorPolicy** (error-handling): Error handling configuration

## Dependencies

**Internal:**
- **playbook-definition** (Tier 1.2): Provides playbook structure, interfaces, and state persistence
- **playbook-template-engine** (Tier 1.2): Provides expression evaluation and path resolution
- **error-handling** (Tier 1.1): Provides error handling and retry policies

**External:**
- **Node.js >= 18**: Native TypeScript support, async/await
