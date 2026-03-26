---
id: playbook-actions-controls
title: Playbook Actions - Controls
dependencies:
  - playbook-definition
  - error-handling
---

<!-- markdownlint-disable single-title -->

# Feature: Playbook Actions - Controls

## Purpose

Provide control flow constructs — conditionals, iteration, scoped error handling, error termination, and composition — so playbook authors can implement sophisticated workflow logic beyond linear step sequences.

## Scenarios

### FR:conditional.if-action: Conditional Execution (if action)

**Playbook author** needs conditional execution based on runtime data so that workflows can branch dynamically.

- **FR:conditional.if-action.base-class** (P1): System MUST provide `if` action extending `PlaybookActionWithSteps<IfConfig>` with `isolated = false` and `primaryProperty = 'condition'`
  - Config interface: `IfConfig`
    ```typescript
    interface IfConfig {
      /** Condition expression to evaluate (supports ${{}} template expressions) */
      condition: string;
      /** Steps to execute when condition is true */
      then: PlaybookStep[];
      /** Steps to execute when condition is false (optional) */
      else?: PlaybookStep[];
    }
    ```

- **FR:conditional.if-action.evaluation** (P1): Action MUST evaluate condition expression using template interpolation
  - Condition receives template interpolation before evaluation
  - Template interpolation resolves `${{expression}}` syntax (applied before action execution)
  - Supports `get('variable-name')` function for variable access
  - Supports complex boolean expressions (`&&`, `||`, `!`)

- **FR:conditional.if-action.branch-selection** (P1): Action MUST execute appropriate branch based on condition result
  - Truthy values execute `then` branch
  - Falsy values execute `else` branch (if provided)
  - If condition is falsy and no `else` branch, action succeeds with no execution

- **FR:conditional.if-action.step-execution** (P1): Action MUST execute branch steps using StepExecutor from base class
  - Calls `this.stepExecutor.executeSteps(steps)` to execute branch steps
  - Each branch step follows same execution rules as top-level steps (error policies, state persistence)
  - Branch steps have access to parent playbook variables
  - Named steps in branches add outputs to parent variable scope

- **FR:conditional.if-action.nesting** (P3): Action MUST support nested conditionals
  - `then` and `else` blocks can contain additional `if` actions
  - No depth limit on nesting

- **FR:conditional.if-action.validation** (P1): Action MUST validate configuration before execution
  - Missing `condition` property MUST throw CatalystError with code 'IfConfigInvalid'
  - Missing `then` property MUST throw CatalystError with code 'IfConfigInvalid'
  - Empty `then` array MUST throw CatalystError with code 'IfConfigInvalid'
  - Invalid step structure in branches MUST throw CatalystError with code 'IfConfigInvalid'

- **FR:conditional.if-action.error-handling** (P2): Action MUST handle expression evaluation errors
  - Template interpolation errors are handled by the executor before action receives config
  - Error message MUST include original condition expression and evaluation error

- **FR:conditional.if-action.result** (P2): Action MUST return result indicating branch taken
  - Result value: `{ branch: 'then' | 'else' | 'none', executed: number }` where executed is count of steps run

### FR:iteration.for-each-action: Looping Constructs (for-each action)

**Playbook author** needs to process collections of data iteratively so that workflows can handle arrays and lists.

- **FR:iteration.for-each-action.base-class** (P1): System MUST provide `for-each` action extending `PlaybookActionWithSteps<ForEachConfig>` with `isolated = false` and `primaryProperty = 'item'`
  - Config interface: `ForEachConfig`
    ```typescript
    interface ForEachConfig {
      /** Variable name for current item (primary property, default: 'item') */
      item?: string;
      /** Array to iterate over (required, supports {{}} template interpolation) */
      in: unknown[] | string;
      /** Variable name for current index (default: 'index') */
      index?: string;
      /** Steps to execute for each iteration */
      steps: PlaybookStep[];
    }
    ```

- **FR:iteration.for-each-action.array-resolution** (P1): Action MUST resolve `in` property to array before iteration
  - String values treated as template expressions and evaluated
  - Non-array values MUST throw CatalystError with code 'ForEachInvalidArray'
  - Empty arrays are valid (zero iterations)

- **FR:iteration.for-each-action.iteration** (P1): Action MUST execute steps for each array item
  - Items processed sequentially in array order
  - Each iteration isolated from other iterations

- **FR:iteration.for-each-action.variable-scoping** (P1): Action MUST inject loop variables into iteration scope
  - Current item accessible via `item` variable name (or custom name from config)
  - Current index accessible via `index` variable name (or custom name from config)
  - Loop variables shadow parent variables during iteration
  - Loop variables removed after iteration completes

- **FR:iteration.for-each-action.nesting** (P3): Action MUST support nested loops
  - Inner loops can reference outer loop variables
  - Each loop maintains independent variable scope
  - No depth limit on nesting

- **FR:iteration.for-each-action.validation** (P1): Action MUST validate configuration before execution
  - Missing `in` property MUST throw CatalystError with code 'ForEachConfigInvalid'
  - Missing `steps` property MUST throw CatalystError with code 'ForEachConfigInvalid'
  - Empty `steps` array MUST throw CatalystError with code 'ForEachConfigInvalid'
  - Invalid step structure MUST throw CatalystError with code 'ForEachConfigInvalid'
  - Reserved variable names (`item`, `index` without override) collision with parent variables should log warning

- **FR:iteration.for-each-action.error-handling** (P2): Action MUST handle iteration errors according to error policy
  - Failed iteration follows step's error policy (Continue, Stop, Retry)
  - Default behavior: stop on first failed iteration
  - `Continue` policy: log error, continue to next iteration

- **FR:iteration.for-each-action.result** (P2): Action MUST return iteration results
  - Result value: `{ iterations: number, completed: number, failed: number }`

### FR:error-handling.try-action: Scoped Error Handling (try action)

**Playbook author** needs step-level try-catch-finally error handling so that errors can be caught and recovered from locally without terminating the entire playbook.

- **FR:error-handling.try-action.base-class** (P1): System MUST provide `try` action extending `PlaybookActionWithSteps<TryConfig>` with `isolated = false` and `primaryProperty = 'steps'`
  - Config interface: `TryConfig`
    ```typescript
    interface TryConfig {
      /** Steps to execute in the try block */
      steps: PlaybookStep[];
      /** Error recovery blocks (optional) */
      catch?: CatchBlock[];
      /** Cleanup steps always executed regardless of outcome (optional) */
      finally?: PlaybookStep[];
    }
    ```

- **FR:error-handling.try-action.steps** (P1): Action MUST execute steps array using StepExecutor
  - Steps execute sequentially following same rules as top-level steps
  - Steps have access to parent playbook variables

- **FR:error-handling.try-action.catch** (P2): Action MUST support catch blocks matching errors by code
  - Uses `CatchBlock` from playbook-definition (code + steps)
  - Multiple catch blocks evaluated in order; first matching code wins
  - Caught error accessible via `$error` variable with properties: `code`, `message`, `guidance`
  - Catch block steps execute with `$error` in scope

- **FR:error-handling.try-action.finally** (P2): Action MUST execute finally steps regardless of success or failure
  - Runs after try steps complete successfully, after catch block executes, or after uncaught error
  - Finally errors are logged but do not override the original outcome
  - Matches playbook-level finally semantics

- **FR:error-handling.try-action.error-chaining** (P2): Re-thrown catch errors MUST chain original error as cause
  - If a catch block itself throws, the new error chains the original caught error

- **FR:error-handling.try-action.validation** (P1): Action MUST validate configuration before execution
  - Missing `steps` property MUST throw CatalystError with code 'TryConfigInvalid'
  - Empty `steps` array MUST throw CatalystError with code 'TryConfigInvalid'

- **FR:error-handling.try-action.result** (P2): Action MUST return result indicating outcome
  - Result value: `{ outcome: 'success' | 'caught' | 'uncaught', executed: number, caughtError?: string }`

### FR:error-handling.throw-action: Error Termination (throw action)

**Playbook author** needs to throw errors when validation fails so that workflows can terminate with actionable error codes.

- **FR:error-handling.throw-action.base-class** (P1): System MUST provide `throw` action implementing `PlaybookAction<ThrowConfig>` with `primaryProperty = 'code'`
  - Config interface: `ThrowConfig`
    ```typescript
    interface ThrowConfig {
      /** Error code in PascalCase (e.g., "ValidationFailed", "DependencyNotFound") */
      code: string;
      /** Human-readable error message */
      message: string;
      /** Optional guidance for resolving the error */
      guidance?: string;
    }
    ```

- **FR:error-handling.throw-action.code-validation** (P1): Action MUST validate error code format before throwing
  - Code MUST be PascalCase (starts with uppercase letter, no spaces/hyphens)
  - Invalid codes MUST throw CatalystError with code 'ThrowConfigInvalid'
  - Empty or missing codes MUST throw CatalystError with code 'ThrowConfigInvalid'

- **FR:error-handling.throw-action.error-throwing** (P1): Action MUST throw CatalystError with provided configuration
  - Creates CatalystError with code, message, and optional guidance from config
  - Error propagates through execution stack according to error policies
  - Step-level error policy determines how error is handled (Stop, Continue, Retry)

- **FR:error-handling.throw-action.validation** (P1): Action MUST validate configuration before execution
  - Missing `code` property MUST throw CatalystError with code 'ThrowConfigInvalid'
  - Missing `message` property MUST throw CatalystError with code 'ThrowConfigInvalid'
  - Invalid `code` format MUST throw CatalystError with code 'ThrowConfigInvalid'

- **FR:error-handling.throw-action.interpolation** (P2): Action MUST support template interpolation in error messages
  - Message can contain template expressions resolved before throwing
  - Guidance can contain template expressions resolved before throwing

### FR:composition.playbook-action: Playbook Composition (playbook action)

**Playbook author** needs to compose workflows from smaller, reusable playbooks so that common patterns can be shared and maintained independently.

- **FR:composition.playbook-action.base-class** (P1): System MUST provide `playbook` action extending `PlaybookActionWithSteps<PlaybookRunConfig>` with `isolated = true` and `primaryProperty = 'name'`
  - Config interface: `PlaybookRunConfig`
    ```typescript
    interface PlaybookRunConfig {
      /** Name of the child playbook to execute */
      name: string;
      /** Input values to pass to child playbook (optional) */
      inputs?: Record<string, unknown>;
    }
    ```

- **FR:composition.playbook-action.loading** (P1): Action MUST load child playbook via PlaybookProvider
  - Load via `await PlaybookProvider.getInstance().load(name)` method
  - Missing playbooks MUST throw CatalystError with code 'PlaybookNotFound'
  - Error message MUST include list of registered providers

- **FR:composition.playbook-action.execution** (P1): Action MUST execute child playbook steps using StepExecutor
  - StepExecutor creates isolated variable scope for child execution via variableOverrides parameter
  - Child playbook inputs passed as variable overrides to isolated scope
  - Child playbook cannot modify parent playbook variables

- **FR:composition.playbook-action.circular-detection** (P2): Action MUST detect circular playbook references
  - Access call stack via `this.stepExecutor.getCallStack()` method
  - If child playbook is already in call stack, throw CatalystError with code 'CircularPlaybookReference'
  - Error message MUST include full call chain (e.g., "A -> B -> C -> A")

- **FR:composition.playbook-action.recursion-limit** (P2): Action MUST enforce recursion depth limit
  - Maximum depth: 10 levels (configurable via static property)
  - Exceeding limit MUST throw CatalystError with code 'MaxRecursionDepthExceeded'

- **FR:composition.playbook-action.outputs** (P2): Action MUST return child playbook outputs
  - Child playbook's final step result returned as action value
  - Empty child playbooks return empty object `{}`

- **FR:composition.playbook-action.validation** (P1): Action MUST validate configuration before execution
  - Missing `name` property MUST throw CatalystError with code 'PlaybookRunConfigInvalid'
  - Empty `name` string MUST throw CatalystError with code 'PlaybookRunConfigInvalid'
  - Invalid `inputs` type MUST throw CatalystError with code 'PlaybookRunConfigInvalid'

### FR:execution.nested-steps: Nested Execution

**Playbook Engine** needs control flow actions to execute nested steps consistently so that sub-workflows follow the same rules as top-level execution.

- **FR:execution.nested-steps.base-class** (P1): Actions with step execution capability MUST extend PlaybookActionWithSteps base class
  - Applies to: if, for-each, try, playbook actions
  - Inherit StepExecutor from base class constructor
  - Call `this.stepExecutor.executeSteps(steps, variableOverrides)` for nested execution

- **FR:execution.nested-steps.mechanisms** (P1): Actions MUST use appropriate mechanisms for loading and executing playbooks
  - `if` action executes then/else branch steps via StepExecutor.executeSteps()
  - `for-each` action executes iteration steps via StepExecutor.executeSteps() with variable overrides
  - `try` action executes try/catch/finally steps via StepExecutor.executeSteps()
  - `playbook` action loads child playbooks via PlaybookProvider.getInstance().load()
  - `playbook` action executes child playbook steps via StepExecutor.executeSteps() with variable overrides
  - `playbook` action accesses call stack via StepExecutor.getCallStack()
  - Nested steps follow same execution rules as top-level steps

- **FR:execution.nested-steps.call-stack** (P2): StepExecutor interface MUST provide call stack access for circular reference detection
  - Required for detecting circular playbook references
  - Method: `getCallStack(): string[]`
  - PlaybookProvider provides playbook loading (not StepExecutor)

- **FR:execution.nested-steps.state-management** (P2): Control actions MUST respect playbook execution state
  - Variables added during control flow persist in execution state
  - Resume capability works with partial control flow execution
  - Completed iterations/branches tracked for resume

- **FR:execution.nested-steps.error-policies** (P2): Control actions MUST support error policies
  - Step-level error policies apply to control action itself
  - Nested step error policies apply independently
  - Error propagation follows standard playbook error handling

### Non-functional Requirements

**NFR:performance**: Performance

- **NFR:performance.condition-eval** (P4): Condition evaluation MUST complete in <10ms for expressions <1KB
- **NFR:performance.variable-assignment** (P4): Variable assignment MUST complete in <5ms
- **NFR:performance.loop-overhead** (P4): Loop overhead MUST be <2ms per iteration (excluding step execution)
- **NFR:performance.overhead** (P4): Control flow action overhead MUST NOT exceed 5% of total execution time

**NFR:reliability**: Reliability

- **NFR:reliability.stack-overflow** (P3): Nested control flow MUST not cause stack overflow (support 50+ nesting levels)
- **NFR:reliability.variable-scoping** (P1): Loop variable scoping MUST prevent variable leakage between iterations
- **NFR:reliability.resume** (P2): Resume capability MUST work correctly with partial control flow execution
- **NFR:reliability.validation** (P1): All configuration errors MUST be caught before execution begins

**NFR:testability**: Testability

- **NFR:testability.isolation** (P3): All control actions MUST be testable in isolation with mocked dependencies
- **NFR:testability.mocking** (P3): Condition evaluation MUST be mockable for unit testing
- **NFR:testability.success-coverage** (P4): 90% code coverage for success paths
- **NFR:testability.error-coverage** (P1): 100% coverage for error handling and edge cases

**NFR:maintainability**: Maintainability

- **NFR:maintainability.interface-contract** (P3): Control actions MUST follow PlaybookAction interface contract
- **NFR:maintainability.shared-utilities** (P3): Shared logic (validation, template interpolation) MUST be extracted to utilities
- **NFR:maintainability.error-codes** (P2): Error codes MUST be consistent and well-documented
- **NFR:maintainability.type-safety** (P1): Configuration interfaces MUST use TypeScript for type safety

## Dependencies

**Internal:**

- **playbook-definition** (Tier 1.2): Provides `PlaybookActionWithSteps` base class, `StepExecutor` interface, `PlaybookActionResult`, `PlaybookStep`, `CatchBlock` interfaces
- **error-handling** (Tier 1.1): Provides `CatalystError` and error handling framework

**External:**

- **Node.js >= 18**: Runtime for TypeScript execution
