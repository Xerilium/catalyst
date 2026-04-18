---
id: playbook-engine
title: Playbook Engine
dependencies:
  - playbook-definition
  - playbook-template-engine
  - error-handling
---

# Feature: Playbook Engine

## Purpose

Orchestrate workflow execution by sequencing steps, dispatching actions, persisting state, and enabling resume from interruption. The engine executes playbook definitions reliably without knowledge of specific action implementations, extending capabilities through composition rather than modification.

## Scenarios

### FR:execution: Sequential Step Execution

**Playbook Engine** needs to execute playbook steps sequentially with validation, interpolation, and action dispatch so that workflows run reliably and predictably.

- **FR:execution.sequential** (P1): System MUST execute playbook steps sequentially in definition order
- **FR:execution.no-skip** (P1): System MUST NOT allow steps to be skipped or reordered during execution
- **FR:execution.validation.structure** (P1): System MUST validate playbook structure before execution begins
  - Required properties: `name`, `description`, `owner`, `steps`
  - Invalid playbooks MUST fail fast with actionable error messages
- **FR:execution.validation.inputs** (P1): System MUST validate inputs against playbook input specifications
  - Required parameters MUST be provided
  - Type checking MUST be enforced (string, number, boolean)
  - Validation rules MUST be applied (regex, length, range, custom)
- **FR:execution.interpolation** (P2): System MUST interpolate step configuration before action execution
  > - @req FR:playbook-template-engine/interface.interpolate
  - Delegates to playbook-template-engine for template resolution
  - Supports `{{variable}}` and `${{ expression }}` syntax
- **FR:execution.action-dispatch** (P1): System MUST invoke appropriate action for each step's action type
  > - @req FR:playbook-definition/types.action.interface
  - Actions registered via ActionRegistry (runtime registry defined in FR:step-executor)
  - Action lookup uses PlaybookAction interface from playbook-definition feature
  - Unknown action types MUST fail with clear error
- **FR:execution.result-storage** (P2): System MUST store named step results in execution context
  - Named steps: result stored with step name as key
  - Unnamed steps: auto-generate name as `{action-type}-{sequence}` for identification but do NOT store in variables
  - In debug mode, unnamed step results MUST also be stored in variables (using auto-generated name) for observability
  - Named step results accessible to subsequent steps via template expressions
  - Uses PlaybookContext from playbook-definition feature
- **FR:execution.log-capture** (P2): Engine MUST capture log action results into the run state's log tracking
  - When a step executes a log action (log-info, log-debug, log-error, log-warning, log-verbose, log-trace), the result MUST be appended to the state's log entries
  - Log capture MUST occur after action execution and before state persistence
  - Log capture MUST include the step name that produced the log
  - Log steps are typically unnamed and follow FR:execution.result-storage rules (not stored in variables in normal mode)

- ~~**FR:execution.log-level**~~: [deprecated] Log-level filtering handled by framework Logger; engine does not need log level

### FR:state: State Persistence and Resume

**Playbook Engine** needs to persist execution state and support resume so that workflows can recover from interruptions without data loss.

- **FR:state.persistence** (P1): System MUST persist execution state after each step completes
  - State saved to `.xe/runs/run-{runId}.json`
  - State includes: run ID, name, execution options, status, error details, current step, start time, playbook, inputs, variables, completed steps, approved checkpoints, logs
  - Uses atomic writes to prevent corruption
- **FR:state.error-capture** (P1): System MUST persist error details in state when a run fails
  - Error object MUST include `code` (string), `message` (string), and `guidance` (string)
  - Error MUST be set on the state before saving when transitioning to `failed` status
  - Error field MUST be omitted from state when status is not `failed`
- **FR:state.serialization-order** (P2): State files MUST serialize properties in a consistent, human-readable order
  - Order: runId, playbookName, status, error (if present), currentStepName, startTime, executionOptions, inputs, variables, completedSteps, checkpointResponses, logs
- **FR:state.resume** (P1): System MUST provide resume capability
  - Load state from `.xe/runs/run-{runId}.json`
  - Skip already-completed steps
  - Continue from next uncompleted step
  - Validate state compatibility with playbook definition
  - Support resuming both `paused` (checkpoints) and `failed` (retry) runs
- **FR:state.lifecycle** (P2): System MUST manage run state lifecycle
  - Active runs (`running`, `paused`, `failed`) remain in `.xe/runs/` to enable resume
  - Completed runs (`completed`) automatically archived to `.xe/runs/history/{YYYY}/{MM}/{DD}/`
  - Failed runs remain active to support retry/debugging until explicitly abandoned
  - Provide cleanup mechanism for old failed/paused runs (manual or automated)

### FR:actions.builtin: Built-in Privileged Actions

**Playbook Engine** needs to provide built-in privileged actions (var, checkpoint, return, function) so that playbooks can assign variables, pause for human review, terminate early with outputs, and define reusable parameterized step sequences.

Built-in privileged actions have direct access to PlaybookContext via property injection and are registered automatically via ACTION_REGISTRY. Only actions in Engine.PRIVILEGED_ACTION_CLASSES receive context access.

#### FR:actions.builtin.var: Variable Assignment (var action)

- **FR:actions.builtin.var.interface** (P1): System MUST provide `var` action for variable assignment
  - Config interface: `VarConfig`

    ```typescript
    interface VarConfig {
      name: string; // Variable name (kebab-case)
      value: unknown; // Value to assign (supports template interpolation)
    }
    ```

  - Primary property: `name` (enables YAML shorthand: `var: variable-name`)

- **FR:actions.builtin.var.validation** (P2): Action MUST validate variable name
  - Name MUST be non-empty string
  - Name SHOULD follow kebab-case convention (warn if not)
  - Name MUST NOT be reserved word ('step', 'playbook', 'action', 'config')
  - Invalid names MUST throw CatalystError with code 'VarInvalidName'

- **FR:actions.builtin.var.interpolation** (P2): Action MUST support template interpolation in value
  - String values processed by template engine before assignment
  - Non-string values assigned directly without interpolation
  - Template evaluation errors MUST throw CatalystError with code 'VarValueEvaluationFailed'

- **FR:actions.builtin.var.mutation** (P1): Action MUST update PlaybookContext.variables directly (privileged access)
  - Variable accessible to all subsequent steps
  - Overwrites existing variable with same name (no warning)
  - Variable persisted in execution state for resume capability

- **FR:actions.builtin.var.result** (P2): Action MUST return PlaybookActionResult with assigned value
  - Result value: assigned value
  - Result code: 'Success'
  - Error codes: 'VarConfigInvalid' (missing/invalid config), 'VarInvalidName', 'VarValueEvaluationFailed'

#### FR:actions.builtin.function: Inline Function Definition (function action)

- **FR:actions.builtin.function.interface** (P1): System MUST provide `function` action for defining reusable step sequences within a playbook
  - Config interface: `FunctionConfig`

    ```typescript
    interface FunctionConfig {
      /** Function name in kebab-case (becomes the callable action type) */
      name: string;
      /** Typed input parameters (optional, uses existing InputSpec format) */
      inputs?: InputSpec[];
      /** Steps to execute when function is invoked */
      steps: PlaybookStep[];
    }
    ```

  - Primary property: `name` (enables YAML shorthand: `function: my-func-name`)
  - Defining a function makes it available for use in subsequent steps within the same playbook scope

- **FR:actions.builtin.function.invocation** (P1): Defined functions MUST be callable using their name as the action type
  - Inputs passable as a named object: `- my-func: { arg1: val1, arg2: val2 }`
  - Inputs passable as a positional array: `- my-func: [val1, val2]`
  - Function invocation executes the function's steps with input values bound to input parameter names

- **FR:actions.builtin.function.inputs** (P2): Functions MUST support typed input parameters using existing InputSpec format

  > - @req FR:playbook-definition/types.playbook.input-parameter
  - Supported types: string, number, boolean (with required/default semantics)
  - Input values MUST be validated before function body executes

- **FR:actions.builtin.function.return** (P1): Functions MUST support return values via the existing `return` action
  - Return value is stored as the calling step's result
  - Result accessible by step name in subsequent steps (e.g., `{{step-name.property}}`)
  - Functions without explicit return produce an empty result

- **FR:actions.builtin.function.scoping** (P1): Function body MUST execute in an isolated scope by default
  - Variables created inside the function body do not leak to the caller
  - Caller variables are accessible within the function body via template interpolation
  - Variable resolution occurs at call-time, not definition-time

- **FR:actions.builtin.function.collision** (P1): Function names MUST be unique within the defining scope
  - Defining a function with the same name as a built-in action type MUST throw CatalystError with code 'FunctionConfigInvalid'
  - Functions MUST NOT be visible to nested playbook executions (scoped to the defining playbook's execution context)

- **FR:actions.builtin.function.validation** (P1): Action MUST validate configuration before registration
  - Missing or empty `name` MUST throw CatalystError with code 'FunctionConfigInvalid'
  - Missing or empty `steps` MUST throw CatalystError with code 'FunctionConfigInvalid'
  - Invalid input specs MUST throw CatalystError with code 'FunctionConfigInvalid'
  - Invoking an undefined function name MUST throw CatalystError with code 'FunctionNotFound'
  - Input validation failures at invocation MUST throw CatalystError with code 'FunctionInputInvalid'

#### FR:actions.builtin.checkpoint: Interactive Checkpoints (checkpoint action)

- **FR:actions.builtin.checkpoint.interface** (P1): System MUST provide `checkpoint` action for interactive user prompts during playbook execution
  - Config interface: `CheckpointConfig`

    ```typescript
    interface CheckpointConfig {
      /** Question or prompt text (inline formatting only: bold, italic, code) */
      message: string;
      /** Extended context (full markdown, displayed collapsed/expandable) */
      context?: string;
      /** 1-9 selectable options */
      options?: CheckpointOption[];
      /** Key of the default option (used for autonomous mode and optional timeout) */
      default?: string;
      /** Timeout in seconds; auto-selects default when elapsed (requires default) */
      timeout?: number;
      /** Allow multiple selections (default: false) */
      multiSelect?: boolean;
      /** Optional header title displayed above the message (default: none, dim HR only) */
      header?: string;
      /** Optional header color: named ("yellow", "bold cyan"), hex ("#ff8800"), or ANSI code (default: dim) */
      headerColor?: string;
    }

    interface CheckpointOption {
      /** Unique key for this option (used as result value if no explicit value) */
      key: string;
      /** Display label; use & before a character for accelerator key (e.g., "&Continue") */
      label: string;
      /** Optional description shown alongside the label */
      description?: string;
      /** Optional value returned when selected (defaults to key) */
      value?: unknown;
      /** Mark as "Recommended" or "Suggested" with visual emphasis */
      emphasis?: "recommended" | "suggested";
      /** When true, selecting this option prompts for text input */
      allowText?: boolean;
    }
    ```

  - Primary property: `message` (enables YAML shorthand: `checkpoint: Review the results before proceeding`)
  - When used with shorthand (message only, no options), displays message and waits for Enter to continue

- **FR:actions.builtin.checkpoint.display** (P1): System MUST render checkpoint prompt to the terminal
  - Display visual separator spanning terminal width to distinguish checkpoint from prior output
  - If `header` is set, render as `── {header} ─────...` with `headerColor` filling remaining width (default: dim)
  - If `header` is not set, render a dim horizontal rule spanning terminal width (fallback: 80 columns)
  - `headerColor` accepts named colors ("yellow", "bold cyan"), hex codes ("#ff8800"), or raw ANSI escape codes
  - Display message text with inline formatting
  - If `context` provided, display as a collapsible/expandable section (collapsed by default)
  - If `options` provided, display as a navigable list with labels and descriptions
  - Options with `emphasis: 'recommended'` MUST be visually distinguished (e.g., color, prefix)
  - Options with `emphasis: 'suggested'` MUST be visually distinguished differently from recommended
  - Accelerator keys (from `&` prefix in label) MUST be rendered with underline formatting
  - If no options provided, display "Press Enter to continue..." prompt

- **FR:actions.builtin.checkpoint.interactive** (P1): In manual mode (default), checkpoints MUST collect user input via stdin
  - Single-select: arrow keys (↑/↓) navigate options, Enter confirms selection; number keys (1-9) select directly
  - Multi-select: arrow keys navigate, Space toggles selection, Enter confirms all selected
  - The currently highlighted option MUST be visually distinguished (e.g., cursor indicator `›`)
  - Accelerator keys: pressing the accelerator character selects the option (single-select with unique accelerator) or toggles it (multi-select)
  - When multiple options share the same accelerator in single-select, repeated presses cycle the cursor (Enter required to confirm); in multi-select, each press toggles the next match
  - Options with `allowText: true`: after selection, prompt for text input via readline
  - Pressing '?' while options are displayed MUST toggle context visibility (if context provided)
  - Input collection MUST support abort signal (e.g., Ctrl+C terminates playbook)

- **FR:actions.builtin.checkpoint.autonomous** (P2): In autonomous mode, checkpoints MUST auto-select the default option
  - If `default` specified, select that option without prompting
  - If no `default` and options exist, select the first option
  - If no options, auto-approve (equivalent to pressing Enter)
  - Auto-selection MUST be logged for auditability

- **FR:actions.builtin.checkpoint.timeout** (P3): System SHOULD support optional timeout for interactive checkpoints
  - If `timeout` specified and `default` set, auto-select default after timeout elapses
  - Display countdown or timeout notice to user
  - If `timeout` specified without `default`, timeout MUST be ignored (cannot auto-select without default)

- **FR:actions.builtin.checkpoint.result** (P1): Action MUST return user's selection as the step result
  - Result value: `{ selected: string | string[], value: unknown, hasTextInput: boolean, textInput?: string }`
  - `selected`: key(s) of chosen option(s)
  - `value`: the option's `value` property (or key if no value), or the text input string for allowText options
  - `hasTextInput`: true if user provided text input (via an `allowText: true` option)
  - `textInput`: the user's text input (only when hasTextInput is true)
  - For shorthand usage (no options), result is `{ selected: 'continue', value: true }`
  - Result accessible by step name for subsequent conditional logic

- **FR:actions.builtin.checkpoint.persistence** (P1): Checkpoint responses MUST be persisted in execution state
  - Store checkpoint step name and user's response in state for resume
  - Persisted in `checkpointResponses` record (keyed by step name) in execution state

- **FR:actions.builtin.checkpoint.resume** (P1): Resume MUST respect previous checkpoint responses (don't re-prompt)
  - If checkpoint was previously answered, return stored response without prompting
  - Enables interrupted playbooks to skip already-answered checkpoints

#### FR:actions.builtin.return: Successful Termination (return action)

- **FR:actions.builtin.return.interface** (P1): System MUST provide `return` action for successful playbook termination
  - Config interface: `ReturnConfig`

    ```typescript
    interface ReturnConfig {
      code?: string; // Result code (default: 'Success')
      message?: string; // Human-readable message
      outputs?: Record<string, unknown>; // Structured outputs (supports template interpolation)
    }
    ```

  - Primary property: `code` (enables YAML shorthand: `return: SuccessCode`)

- **FR:actions.builtin.return.interpolation** (P2): Action MUST interpolate outputs using template engine
  - All output values processed by template engine if string
  - Non-string values assigned directly without interpolation

- **FR:actions.builtin.return.validation** (P2): Action MUST validate outputs against playbook definition
  - If playbook defines `outputs` specification, return outputs MUST match
  - Missing required outputs MUST throw CatalystError with code 'ReturnOutputsMismatch'
  - Extra outputs are allowed (permissive validation)
  - Type mismatches should log warning but not fail

- **FR:actions.builtin.return.halt** (P1): Action MUST immediately halt playbook execution with status='completed'
  - Execution stops after return action completes
  - `finally` section still executes if defined
  - Remaining steps skipped

- **FR:actions.builtin.return.result** (P2): Action MUST return PlaybookActionResult with success status
  - Result code: config.code or 'Success'
  - Result message: config.message or 'Playbook completed successfully'
  - Result value: config.outputs
  - Result error: null
  - Error codes: 'ReturnOutputsMismatch'

### FR:step-executor: StepExecutor Implementation

**Playbook Engine** needs to implement StepExecutor for nested step execution so that control flow actions can delegate sub-workflows to the engine.

- **FR:step-executor.interface** (P1): Engine MUST implement StepExecutor interface from playbook-definition
  - Interface signature:

    ```typescript
    interface StepExecutor {
      executeSteps(
        steps: PlaybookStep[],
        variableOverrides?: Record<string, unknown>,
      ): Promise<PlaybookActionResult[]>;
      getCallStack(): string[];
    }
    ```

  - Enables actions to delegate nested step execution to engine

- **FR:step-executor.semantics** (P1): StepExecutor MUST execute nested steps with same semantics as top-level steps
  - Apply template interpolation to step configuration before execution
  - Invoke appropriate action for each step's action type
  - Apply error policies when steps fail (Continue, Stop, Retry)
  - Persist state after each nested step completes
  - Store step results in execution context (named steps accessible to subsequent steps)

- **FR:step-executor.overrides** (P2): StepExecutor MUST support variable overrides for scoped execution
  - `variableOverrides` parameter provides temporary variables for nested execution
  - Override variables shadow parent variables during nested step execution
  - Override variables do NOT persist to parent scope after execution completes
  - Parent scope variables remain unchanged unless explicitly modified by nested steps

- **FR:step-executor.results** (P2): StepExecutor MUST return array of step results
  - One PlaybookActionResult per executed step
  - Enables actions to track execution progress across nested steps

- **FR:step-executor.call-stack** (P2): StepExecutor MUST provide getCallStack() for circular reference detection
  - Returns array of playbook names currently being executed (root first, current last)
  - Used to detect circular references in nested playbook execution
  - Enables maximum recursion depth enforcement

### FR:actions.instantiation: Action Instantiation via PlaybookProvider

**Playbook Engine** needs to instantiate actions via PlaybookProvider so that action creation is centralized and privileged access is controlled.

- **FR:actions.instantiation.provider** (P1): Engine MUST use PlaybookProvider from playbook-definition for action instantiation
  - PlaybookProvider manages action instantiation (see playbook-definition FR-11.7)
  - Engine uses `PlaybookProvider.getInstance().createAction(actionType, stepExecutor)`
  - PlaybookProvider handles StepExecutor injection for control flow actions automatically

- **FR:actions.instantiation.caching** (P3): Engine MUST cache action instances for reuse within a run
  - Cache key: action type identifier
  - Cache value: instantiated action object
  - Actions are created once per run, reused across steps

- **FR:actions.instantiation.privileged** (P1): Engine MUST use constructor-based validation for privileged access
  - Maintain `static readonly PRIVILEGED_ACTION_CLASSES = [VarAction, ReturnAction]` allowlist
  - Use `instanceof` checks to validate action was instantiated from privileged class
  - Grant context access via property injection: `(action as any).__context = context`
  - External actions CANNOT spoof privileged access (constructor references are internal)
  - Privileged actions MUST validate context was injected before use
  - **Important**: Regular actions NEVER receive context - only config is passed to execute()

### FR:error: Error Handling

**Playbook Engine** needs to evaluate error policies and support catch/finally blocks so that workflows handle failures gracefully.

- **FR:error.policies** (P1): System MUST support per-step error policies (from error-handling feature)
  > - @req FR:error-handling/error-policy
- **FR:error.evaluation** (P1): Engine MUST evaluate error policies when actions fail
  - Map error code to policy action (Continue, Stop, Retry, Ignore)
  - Apply default policy when error code not mapped
  - Execute retry logic with exponential backoff when policy = Retry
- **FR:error.catch** (P2): System MUST support `catch` section for error recovery
  - Catch section maps error codes to recovery steps
  - Recovery steps execute before failing playbook
- **FR:error.finally** (P2): System MUST support `finally` section for cleanup
  - Finally section executes regardless of success/failure
  - Finally failures logged but don't fail playbook if main execution succeeded

### FR:locking: Resource Locking

**Playbook Engine** needs resource locking so that concurrent runs don't conflict.

- **FR:locking.acquisition** (P2): System MUST support resource locks to prevent concurrent conflicts
  - Lock files: `.xe/runs/locks/run-{runId}.lock`
  - Lock metadata: run ID, locked paths, locked branches, lock owner, TTL
- **FR:locking.conflict-detection** (P2): Engine MUST detect conflicts on branch names and file paths
- **FR:locking.conflict-prevention** (P2): Conflicting runs MUST be prevented with clear error message
- **FR:locking.release** (P1): Locks MUST be released on playbook completion (success or failure)
- **FR:locking.cleanup** (P2): Stale locks (exceeded TTL) MUST be automatically cleaned up

### Non-functional Requirements

**NFR:performance**: Performance

- **NFR:performance.overhead** (P4): Engine overhead MUST be <5% of total playbook execution time
- **NFR:performance.dispatch** (P4): Step dispatch (finding and invoking action) MUST complete in <10ms
- **NFR:performance.state-save** (P4): State save operations MUST complete in <100ms for states <1MB

**NFR:reliability**: Reliability

- **NFR:reliability.atomic-writes** (P1): State writes MUST be atomic to prevent corruption on crash
- **NFR:reliability.circular-detection** (P1): Circular dependency detection MUST prevent infinite recursion
- **NFR:reliability.lock-ttl** (P2): Lock cleanup MUST occur even if engine crashes (via TTL expiration)
- **NFR:reliability.state-validation** (P2): State corruption MUST be detected on resume with clear recovery instructions

**NFR:testability**: Testability

- **NFR:testability.mockable-actions** (P3): Action invocation MUST be mockable for unit testing
- **NFR:testability.mockable-state** (P3): State persistence MUST be mockable for testing
- **NFR:testability.mockable-template** (P3): Template engine MUST be mockable for testing
- **NFR:testability.coverage** (P3): 90% code coverage across engine core
- **NFR:testability.critical-coverage** (P1): 100% coverage for critical paths: step execution, resume, composition, error policies

**NFR:extensibility**: Extensibility

- **NFR:extensibility.action-plugins** (P2): New action types MUST be addable without modifying engine code
- **NFR:extensibility.action-agnostic** (P2): Engine MUST remain agnostic to specific action implementations

## Architecture Constraints

**Extensibility through composition, not modification**

> New capabilities are added via new action types, not by changing the engine. Actions are discovered and registered automatically. This ensures the engine remains stable while workflow capabilities expand.

**Explicit over implicit**

> Workflow behavior must be explicitly defined in playbook definitions. No hidden defaults, no magic behavior. Every step, input, output, and checkpoint is visible in the definition. This makes workflows auditable and debuggable.

**Fail fast with clear guidance**

> Validation errors stop execution immediately with specific, actionable error messages. Never silently continue or guess intent. Messages include the exact requirement violated and how to fix it.

### Run State Lifecycle

Playbook runs transition through the following states:

```text
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

| Status                        | Location                             | Purpose                         |
| ----------------------------- | ------------------------------------ | ------------------------------- |
| `running`, `paused`, `failed` | `.xe/runs/run-{runId}.json`          | Active runs that can be resumed |
| `completed`                   | `.xe/runs/history/{YYYY}/{MM}/{DD}/` | Historical archive, read-only   |

**Cleanup Mechanisms:**

- **Automatic**: `completed` runs archived immediately after success
- **Manual**: `engine.abandon(runId)` marks failed/paused run for archival
- **Scheduled**: `engine.cleanupStaleRuns({ olderThanDays: 7 })` archives old failed/paused runs

### Key Entities

**Entities owned by this feature:**

- **PlaybookEngine**: Core orchestration service
  - Responsibilities: Step sequencing, action dispatch, resume logic, checkpoints
  - API: `run(playbook, inputs, options)`, `resume(runId, options)`

- **StepExecutor**: Interface for executing nested steps (FR:step-executor)
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

- **VarAction**: Built-in action for variable assignment (FR:actions.builtin.var)
  - Config: VarConfig (name, value)
  - Mutates PlaybookContext.variables directly (privileged access)
  - Validates variable names, interpolates values
  - Returns assigned value as result

- **CheckpointAction**: Built-in action for human checkpoints (FR:actions.builtin.checkpoint)
  - Config: CheckpointConfig (message, approval requirements)
  - Pauses execution in manual mode, auto-approves in autonomous mode
  - Persists approval state for resume capability
  - Returns approval result

- **ReturnAction**: Built-in action for successful playbook termination (FR:actions.builtin.return)
  - Config: ReturnConfig (code, message, outputs)
  - Mutates PlaybookContext.earlyReturn directly (privileged access)
  - Validates outputs against playbook specification
  - Halts execution with status='completed'
  - Triggers finally section before termination

- **FunctionAction**: Built-in action for inline function definition (FR:actions.builtin.function)
  - Config: FunctionConfig (name, inputs, steps)
  - Registers function name as a callable action type in the current execution context
  - Functions are scoped to the defining playbook (not visible to nested playbooks)
  - Supports typed inputs via InputSpec and return values via the return action

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

## External Dependencies

- **Node.js >= 18**: Native TypeScript support, async/await
