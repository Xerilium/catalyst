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
  - Actions registered via ActionRegistry (runtime registry defined in FR-4)
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
  - Support resuming both `paused` (checkpoints) and `failed` (retry) runs
- **FR-2.3**: System MUST manage run state lifecycle
  - Active runs (`running`, `paused`, `failed`) remain in `.xe/runs/` to enable resume
  - Completed runs (`completed`) automatically archived to `.xe/runs/history/{YYYY}/{MM}/{DD}/`
  - Failed runs remain active to support retry/debugging until explicitly abandoned
  - Provide cleanup mechanism for old failed/paused runs (manual or automated)

**FR-3**: Built-in Privileged Actions

Built-in privileged actions have direct access to PlaybookContext via property injection and are registered automatically via ACTION_REGISTRY. Only actions in Engine.PRIVILEGED_ACTION_CLASSES receive context access.

**FR-3.1**: Variable Assignment (var action)

- **FR-3.1.1**: System MUST provide `var` action for variable assignment
  - Config interface: `VarConfig`
    ```typescript
    interface VarConfig {
      name: string;              // Variable name (kebab-case)
      value: unknown;            // Value to assign (supports template interpolation)
    }
    ```
  - Primary property: `name` (enables YAML shorthand: `var: variable-name`)

- **FR-3.1.2**: Action MUST validate variable name
  - Name MUST be non-empty string
  - Name SHOULD follow kebab-case convention (warn if not)
  - Name MUST NOT be reserved word ('step', 'playbook', 'action', 'config')
  - Invalid names MUST throw CatalystError with code 'VarInvalidName'

- **FR-3.1.3**: Action MUST support template interpolation in value
  - String values processed by template engine before assignment
  - Non-string values assigned directly without interpolation
  - Template evaluation errors MUST throw CatalystError with code 'VarValueEvaluationFailed'

- **FR-3.1.4**: Action MUST update PlaybookContext.variables directly (privileged access)
  - Variable accessible to all subsequent steps
  - Overwrites existing variable with same name (no warning)
  - Variable persisted in execution state for resume capability

- **FR-3.1.5**: Action MUST return PlaybookActionResult with assigned value
  - Result value: assigned value
  - Result code: 'Success'
  - Error codes: 'VarConfigInvalid' (missing/invalid config), 'VarInvalidName', 'VarValueEvaluationFailed'

**FR-3.2**: Human Checkpoints (checkpoint action)

- **FR-3.2.1**: System MUST support checkpoint steps that pause execution
- **FR-3.2.2**: In manual mode (default), checkpoints MUST pause execution until user input
- **FR-3.2.3**: In autonomous mode, checkpoints MUST be automatically approved
- **FR-3.2.4**: Checkpoint approval state MUST be persisted in execution state
- **FR-3.2.5**: Resume MUST respect checkpoint approval (don't re-prompt for approved checkpoints)

**FR-3.3**: Successful Termination (return action)

- **FR-3.3.1**: System MUST provide `return` action for successful playbook termination
  - Config interface: `ReturnConfig`
    ```typescript
    interface ReturnConfig {
      code?: string;                          // Result code (default: 'Success')
      message?: string;                       // Human-readable message
      outputs?: unknown;                      // Any return value (object, array, string, number, boolean)
    }
    ```
  - Primary property: `outputs` (enables YAML shorthand: `return: <any-value>`)
  - Non-object values (primitives, arrays) are wrapped as `{ result: value }` internally

- **FR-3.3.2**: Action MUST interpolate outputs using template engine
  - All output values processed by template engine if string
  - Non-string values assigned directly without interpolation

- **FR-3.3.3**: Action MUST validate outputs against playbook definition
  - If playbook defines `outputs` specification, return outputs MUST match
  - Missing required outputs MUST throw CatalystError with code 'ReturnOutputsMismatch'
  - Extra outputs are allowed (permissive validation)
  - Type mismatches should log warning but not fail

- **FR-3.3.4**: Action MUST immediately halt playbook execution with status='completed'
  - Execution stops after return action completes
  - `finally` section still executes if defined
  - Remaining steps skipped

- **FR-3.3.5**: Action MUST return PlaybookActionResult with success status
  - Result code: config.code or 'Success'
  - Result message: config.message or 'Playbook completed successfully'
  - Result value: config.outputs
  - Result error: null
  - Error codes: 'ReturnOutputsMismatch'

**FR-4**: StepExecutor Implementation

- **FR-4.1**: Engine MUST implement StepExecutor interface from playbook-definition
  - Interface signature:
    ```typescript
    interface StepExecutor {
      executeSteps(
        steps: PlaybookStep[],
        variableOverrides?: Record<string, unknown>
      ): Promise<PlaybookActionResult[]>;
      getCallStack(): string[];
    }
    ```
  - Enables actions to delegate nested step execution to engine
  - Used by control flow actions (if, for-each, playbook from playbook-actions-controls)

- **FR-4.2**: StepExecutor MUST execute nested steps with same semantics as top-level steps
  - Apply template interpolation to step configuration before execution
  - Invoke appropriate action for each step's action type
  - Apply error policies when steps fail (Continue, Stop, Retry)
  - Persist state after each nested step completes
  - Store step results in execution context (named steps accessible to subsequent steps)

- **FR-4.3**: StepExecutor MUST support variable overrides for scoped execution
  - `variableOverrides` parameter provides temporary variables for nested execution
  - Override variables shadow parent variables during nested step execution
  - Used by for-each action to provide `item` and `index` variables
  - Override variables do NOT persist to parent scope after execution completes
  - Parent scope variables remain unchanged unless explicitly modified by nested steps

- **FR-4.4**: StepExecutor MUST return array of step results
  - One PlaybookActionResult per executed step
  - Enables actions to inspect nested execution outcomes
  - Used by for-each action to track completed vs failed iterations

- **FR-4.5**: StepExecutor MUST provide getCallStack() for circular reference detection
  - Returns array of playbook names currently being executed (root first, current last)
  - Used by playbook action to detect circular playbook references
  - Enables maximum recursion depth enforcement

**FR-5**: Action Instantiation via PlaybookProvider

- **FR-5.1**: Engine MUST use PlaybookProvider from playbook-definition for action instantiation
  - PlaybookProvider manages action instantiation (see playbook-definition FR-11.7)
  - Engine uses `PlaybookProvider.getInstance().createAction(actionType, stepExecutor)`
  - PlaybookProvider handles StepExecutor injection for control flow actions automatically

- **FR-5.2**: Engine MUST cache action instances for reuse within a run
  - Cache key: action type identifier
  - Cache value: instantiated action object
  - Actions are created once per run, reused across steps

- **FR-5.3**: Engine MUST use constructor-based validation for privileged access
  - Maintain `static readonly PRIVILEGED_ACTION_CLASSES = [VarAction, ReturnAction]` allowlist
  - Use `instanceof` checks to validate action was instantiated from privileged class
  - Grant context access via property injection: `(action as any).__context = context`
  - External actions CANNOT spoof privileged access (constructor references are internal)
  - Privileged actions MUST validate context was injected before use
  - **Important**: Regular actions NEVER receive context - only config is passed to execute()

**FR-6**: Error Handling

- **FR-6.1**: System MUST support per-step error policies (from error-handling feature)
- **FR-6.2**: Engine MUST evaluate error policies when actions fail
  - Map error code to policy action (Continue, Stop, Retry, Ignore)
  - Apply default policy when error code not mapped
  - Execute retry logic with exponential backoff when policy = Retry
- **FR-6.3**: System MUST support `catch` section for error recovery
  - Catch section maps error codes to recovery steps
  - Recovery steps execute before failing playbook
- **FR-6.4**: System MUST support `finally` section for cleanup
  - Finally section executes regardless of success/failure
  - Finally failures logged but don't fail playbook if main execution succeeded

**FR-7**: Resource Locking

- **FR-7.1**: System MUST support resource locks to prevent concurrent conflicts
  - Lock files: `.xe/runs/locks/run-{runId}.lock`
  - Lock metadata: run ID, locked paths, locked branches, lock owner, TTL
- **FR-7.2**: Engine MUST detect conflicts on branch names and file paths
- **FR-7.3**: Conflicting runs MUST be prevented with clear error message
- **FR-7.4**: Locks MUST be released on playbook completion (success or failure)
- **FR-7.5**: Stale locks (exceeded TTL) MUST be automatically cleaned up

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

- **StepExecutor**: Interface for executing nested steps (FR-4)
  - Implemented by PlaybookEngine
  - Provided to actions that extend PlaybookActionWithSteps
  - Enables control flow actions to delegate step execution to engine
  - Supports variable overrides for scoped execution (for-each loops)
  - Returns array of step results for inspection by actions
  - Provides getCallStack() for circular reference detection

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

- **VarAction**: Built-in action for variable assignment (FR-3.1)
  - Config: VarConfig (name, value)
  - Mutates PlaybookContext.variables directly (privileged access)
  - Validates variable names, interpolates values
  - Returns assigned value as result

- **CheckpointAction**: Built-in action for human checkpoints (FR-3.2)
  - Config: CheckpointConfig (message, approval requirements)
  - Pauses execution in manual mode, auto-approves in autonomous mode
  - Persists approval state for resume capability
  - Returns approval result

- **ReturnAction**: Built-in action for successful playbook termination (FR-3.3)
  - Config: ReturnConfig (code, message, outputs)
  - Mutates PlaybookContext.earlyReturn directly (privileged access)
  - Validates outputs against playbook specification
  - Halts execution with status='completed'
  - Triggers finally section before termination

### Run State Lifecycle

Playbook runs transition through the following states:

```
┌──────────┐
│  start   │
└────┬─────┘
     │
     ▼
┌──────────┐    validation error
│ running  ├──────────────────────┐
└────┬─────┘                      │
     │                            │
     │ checkpoint                 │ step error
     ├──────────────┐             │
     │              ▼             │
     │         ┌─────────┐        │
     │         │ paused  │        │
     │         └────┬────┘        │
     │              │             │
     │     resume   │             │
     │◄─────────────┘             │
     │                            │
     │                            ▼
     │                       ┌────────┐
     │    all steps done     │ failed │
     ├──────────────────────►│        │
     │                       └────┬───┘
     ▼                            │
┌───────────┐                     │
│ completed │                     │
└─────┬─────┘                     │
      │                           │
      │ auto-archive              │ manual abandon
      │                           │ or auto-cleanup
      ▼                           ▼
  .xe/runs/history/          .xe/runs/history/
```

**State Descriptions:**

- **`running`**: Actively executing steps. State file in `.xe/runs/`. Transitions to `completed`, `paused`, or `failed`.

- **`paused`**: Execution paused at checkpoint awaiting approval. State file in `.xe/runs/`. Can `resume()` to continue. Supports human-in-the-loop workflows.

- **`failed`**: Execution encountered an error and stopped. State file remains in `.xe/runs/` to enable:
  - **Retry**: Call `resume()` to retry from failure point
  - **Debugging**: Inspect state to understand what failed
  - **Recovery**: Fix issue and resume execution
  - Must be explicitly abandoned via `abandon()` or cleaned up via `cleanupStaleRuns()` to archive

- **`completed`**: All steps executed successfully. Automatically archived to `.xe/runs/history/{YYYY}/{MM}/{DD}/` for historical reference. Cannot resume.

**Storage Locations:**

| Status | Location | Purpose |
|--------|----------|---------|
| `running`, `paused`, `failed` | `.xe/runs/run-{runId}.json` | Active runs that can be resumed |
| `completed` | `.xe/runs/history/{YYYY}/{MM}/{DD}/` | Historical archive, read-only |

**Cleanup Mechanisms:**

- **Automatic**: `completed` runs archived immediately after success
- **Manual**: `engine.abandon(runId)` marks failed/paused run for archival
- **Scheduled**: `engine.cleanupStaleRuns({ olderThanDays: 7 })` archives old failed/paused runs

**Entities from other features:**

- **Playbook** (playbook-definition): Workflow definition interface
- **PlaybookStep** (playbook-definition): Step definition interface
- **PlaybookAction** (playbook-definition): Action interface contract
- **PlaybookActionResult** (playbook-definition): Step execution result
- **PlaybookState** (playbook-definition): Persistent state snapshot
- **PlaybookContext** (playbook-definition): Runtime execution container
- **StatePersistence** (playbook-definition): State save/load operations
- **PlaybookProvider** (playbook-definition): Unified singleton for playbook loading AND action instantiation
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
