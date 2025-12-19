---
id: playbook-actions-controls
title: Playbook Actions - Controls
author: "@flanakin"
description: "Control flow actions for playbook execution including conditionals and loops"
dependencies:
  - playbook-definition
  - error-handling
---

# Feature: Playbook Actions - Controls

## Problem

Playbooks need control flow constructs to implement conditional logic, iteration, error handling, and composition. Without these capabilities, playbooks are limited to linear execution flows and cannot handle complex decision-making, iterative processes, or modular workflow design.

## Goals

- Enable playbook authors to create sophisticated workflow logic with conditional branching
- Provide flexible iteration capabilities for processing collections
- Support explicit error throwing for workflow validation and control
- Enable playbook composition through child playbook execution
- Demonstrate extensibility pattern for future control flow actions (parallel, retry, timeout)

## Scenario

- As a **playbook author**, I need conditional execution based on runtime data
  - Outcome: `if` action enables dynamic workflow branching with template expressions

- As a **playbook author**, I need to process collections of data iteratively
  - Outcome: `for-each` action handles array processing with proper variable scoping

- As a **playbook author**, I need to throw errors when validation fails
  - Outcome: `throw` action enables explicit error termination with custom error codes

- As a **playbook author**, I need to compose workflows from smaller, reusable playbooks
  - Outcome: `playbook` action executes child playbooks with isolated execution context

## Success Criteria

- Conditional expressions evaluate correctly in 100% of test cases
- Loop iterations maintain proper variable isolation in 100% of executions
- Error throwing provides actionable error codes and messages in 100% of cases
- Child playbook execution maintains proper context isolation in 100% of executions
- Control flow actions integrate seamlessly via StepExecutor interface
- Actions extending PlaybookActionWithSteps use StepExecutor for consistent nested execution pattern

## Requirements

### Functional Requirements

**FR-1**: Conditional Execution (if action)

- **FR-1.1**: System MUST provide `if` action extending `PlaybookActionWithSteps<IfConfig>`
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

- **FR-1.2**: Action MUST evaluate condition expression using template interpolation
  - Condition receives template interpolation before evaluation
  - Template interpolation resolves `${{expression}}` syntax (applied before action execution)
  - Supports `get('variable-name')` function for variable access
  - Supports complex boolean expressions (`&&`, `||`, `!`)

- **FR-1.3**: Action MUST execute appropriate branch based on condition result
  - Truthy values execute `then` branch
  - Falsy values execute `else` branch (if provided)
  - If condition is falsy and no `else` branch, action succeeds with no execution

- **FR-1.4**: Action MUST execute branch steps using StepExecutor from base class
  - Calls `this.stepExecutor.executeSteps(steps)` to execute branch steps
  - Each branch step follows same execution rules as top-level steps (error policies, state persistence)
  - Branch steps have access to parent playbook variables
  - Named steps in branches add outputs to parent variable scope

- **FR-1.5**: Action MUST support nested conditionals
  - `then` and `else` blocks can contain additional `if` actions
  - No depth limit on nesting

- **FR-1.6**: Action MUST validate configuration before execution
  - Missing `condition` property MUST throw CatalystError with code 'IfConfigInvalid'
  - Missing `then` property MUST throw CatalystError with code 'IfConfigInvalid'
  - Empty `then` array MUST throw CatalystError with code 'IfConfigInvalid'
  - Invalid step structure in branches MUST throw CatalystError with code 'IfConfigInvalid'

- **FR-1.7**: Action MUST handle expression evaluation errors
  - Template interpolation errors are handled by the executor before action receives config
  - Error message MUST include original condition expression and evaluation error

- **FR-1.8**: Action MUST return result indicating branch taken
  - Result value: `{ branch: 'then' | 'else' | 'none', executed: number }` where executed is count of steps run
  - Enables debugging and workflow introspection

**FR-2**: Looping Constructs (for-each action)

- **FR-2.1**: System MUST provide `for-each` action extending `PlaybookActionWithSteps<ForEachConfig>`
  - Primary property: `item` (the variable name for current item)
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

- **FR-2.2**: Action MUST resolve `in` property to array before iteration
  - String values treated as template expressions and evaluated
  - Non-array values MUST throw CatalystError with code 'ForEachInvalidArray'
  - Empty arrays are valid (zero iterations)

- **FR-2.3**: Action MUST execute steps for each array item
  - Items processed sequentially in array order
  - Each iteration isolated from other iterations

- **FR-2.4**: Action MUST inject loop variables into iteration scope
  - Current item accessible via `item` variable name (or custom name from config)
  - Current index accessible via `index` variable name (or custom name from config)
  - Loop variables shadow parent variables during iteration
  - Loop variables removed after iteration completes

- **FR-2.5**: Action MUST support nested loops
  - Inner loops can reference outer loop variables
  - Each loop maintains independent variable scope
  - No depth limit on nesting

- **FR-2.6**: Action MUST validate configuration before execution
  - Missing `in` property MUST throw CatalystError with code 'ForEachConfigInvalid'
  - Missing `steps` property MUST throw CatalystError with code 'ForEachConfigInvalid'
  - Empty `steps` array MUST throw CatalystError with code 'ForEachConfigInvalid'
  - Invalid step structure MUST throw CatalystError with code 'ForEachConfigInvalid'
  - Reserved variable names (`item`, `index` without override) collision with parent variables should log warning

- **FR-2.7**: Action MUST handle iteration errors according to error policy
  - Failed iteration follows step's error policy (Continue, Stop, Retry)
  - Default behavior: stop on first failed iteration
  - `Continue` policy: log error, continue to next iteration

- **FR-2.8**: Action MUST return iteration results
  - Result value: `{ iterations: number, completed: number, failed: number }`
  - Enables tracking iteration progress and failures

**FR-3**: Playbook Composition (playbook action)

- **FR-3.1**: System MUST provide `playbook` action extending `PlaybookActionWithSteps<PlaybookRunConfig>`
  - Config interface: `PlaybookRunConfig`
    ```typescript
    interface PlaybookRunConfig {
      /** Name of the child playbook to execute */
      name: string;
      /** Input values to pass to child playbook (optional) */
      inputs?: Record<string, unknown>;
    }
    ```

- **FR-3.2**: Action MUST load child playbook via PlaybookProvider
  - PlaybookProvider maintained by playbook-definition feature
  - Load via `await PlaybookProvider.getInstance().load(name)` method
  - Supports multiple providers (YAML, TypeScript, remote, custom)
  - Missing playbooks MUST throw CatalystError with code 'PlaybookNotFound'
  - Error message MUST include list of registered providers

- **FR-3.3**: Action MUST execute child playbook steps using StepExecutor
  - Calls `this.stepExecutor.executeSteps(childPlaybook.steps, inputs)` to execute child steps
  - StepExecutor creates isolated variable scope for child execution via variableOverrides parameter
  - Child playbook inputs passed as variable overrides to isolated scope
  - Child playbook cannot modify parent playbook variables

- **FR-3.4**: Action MUST detect circular playbook references
  - Access call stack via `this.stepExecutor.getCallStack()` method
  - If child playbook is already in call stack, throw CatalystError with code 'CircularPlaybookReference'
  - Error message MUST include full call chain (e.g., "A -> B -> C -> A")

- **FR-3.5**: Action MUST enforce recursion depth limit
  - Maximum depth: 10 levels (configurable via static property)
  - Exceeding limit MUST throw CatalystError with code 'MaxRecursionDepthExceeded'
  - Prevents stack overflow from deep nesting

- **FR-3.6**: Action MUST return child playbook outputs
  - Child playbook's final step result returned as action value
  - Enables parent playbook to access child outputs
  - Empty child playbooks return empty object `{}`

- **FR-3.7**: Action MUST validate configuration before execution
  - Missing `name` property MUST throw CatalystError with code 'PlaybookRunConfigInvalid'
  - Empty `name` string MUST throw CatalystError with code 'PlaybookRunConfigInvalid'
  - Invalid `inputs` type MUST throw CatalystError with code 'PlaybookRunConfigInvalid'

**FR-4**: Error Termination (throw action)

- **FR-4.1**: System MUST provide `throw` action implementing `PlaybookAction<ThrowConfig>`
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

- **FR-4.2**: Action MUST validate error code format before throwing
  - Code MUST be PascalCase (starts with uppercase letter, no spaces/hyphens)
  - Invalid codes MUST throw CatalystError with code 'ThrowConfigInvalid'
  - Empty or missing codes MUST throw CatalystError with code 'ThrowConfigInvalid'

- **FR-4.3**: Action MUST throw CatalystError with provided configuration
  - Creates CatalystError with code, message, and optional guidance from config
  - Error propagates through execution stack according to error policies
  - Step-level error policy determines how error is handled (Stop, Continue, Retry)

- **FR-4.4**: Action MUST validate configuration before execution
  - Missing `code` property MUST throw CatalystError with code 'ThrowConfigInvalid'
  - Missing `message` property MUST throw CatalystError with code 'ThrowConfigInvalid'
  - Invalid `code` format MUST throw CatalystError with code 'ThrowConfigInvalid'

- **FR-4.5**: Action MUST support template interpolation in error messages
  - Message can contain template expressions resolved before throwing
  - Guidance can contain template expressions resolved before throwing
  - Enables dynamic error messages based on runtime state

**FR-5**: Action Metadata

- **FR-5.1**: Control flow actions MUST declare `primaryProperty` for YAML shorthand syntax
  - `if` action: primaryProperty = 'condition' (enables `if: "${{ condition }}"`)
  - `for-each` action: primaryProperty = 'item' (enables `for-each: myItem`, with 'in' as required secondary property)
  - `throw` action: primaryProperty = 'code' (enables `throw: ErrorCode`)
  - `playbook` action: primaryProperty = 'name' (enables `playbook: child-playbook-name`)

- **FR-5.2**: Control flow actions MUST provide TypeScript config schemas
  - Generated via build-time schema generation from config interfaces
  - Used by playbook-yaml for YAML validation and IDE IntelliSense
  - Stored in ACTION_REGISTRY from playbook-definition feature

- **FR-5.3**: Actions requiring step execution MUST declare capabilities array
  - `if` action: static readonly capabilities = ['step-execution'] as const
  - `for-each` action: static readonly capabilities = ['step-execution'] as const
  - `playbook` action: static readonly capabilities = ['step-execution'] as const
  - `throw` action: No capabilities needed (stateless action)
  - Capability name matches the dependency: 'step-execution' → receives StepExecutor

- **FR-5.4**: Actions with nested steps MUST declare default isolation mode
  - `if` action: `readonly isolated = false` (shared scope - variables propagate to parent)
  - `for-each` action: `readonly isolated = false` (shared scope - variables propagate to parent)
  - `playbook` action: `readonly isolated = true` (isolated scope - child cannot modify parent variables)
  - Users can override default via `isolated` property on step config (see playbook-definition FR-2.1)
  - Engine enforces isolation (see playbook-engine FR-4.6)

**FR-6**: Nested Execution

- **FR-6.1**: Actions with step execution capability MUST extend PlaybookActionWithSteps base class
  - Applies to: if, for-each, playbook actions (those with 'step-execution' capability)
  - Inherit StepExecutor from base class constructor
  - Call `this.stepExecutor.executeSteps(steps, variableOverrides)` for nested execution

- **FR-6.2**: Actions MUST use appropriate mechanisms for loading and executing playbooks
  - `if` action executes then/else branch steps via StepExecutor.executeSteps()
  - `for-each` action executes iteration steps via StepExecutor.executeSteps() with variable overrides
  - `playbook` action loads child playbooks via PlaybookProvider.getInstance().load()
  - `playbook` action executes child playbook steps via StepExecutor.executeSteps() with variable overrides
  - `playbook` action accesses call stack via StepExecutor.getCallStack()
  - Branch and iteration steps follow same execution rules as top-level steps
  - Nested steps have access to appropriate variable scope

- **FR-6.2.1**: StepExecutor interface MUST provide call stack access for circular reference detection
  - Required for detecting circular playbook references
  - Method: `getCallStack(): string[]`
  - PlaybookProvider provides playbook loading (not StepExecutor)

- **FR-6.3**: Control actions MUST respect playbook execution state
  - Variables added during control flow persist in execution state
  - Resume capability works with partial control flow execution
  - Completed iterations/branches tracked for resume

- **FR-6.4**: Control actions MUST support error policies
  - Step-level error policies apply to control action itself
  - Nested step error policies apply independently
  - Error propagation follows standard playbook error handling

### Non-functional Requirements

**NFR-1**: Performance

- **NFR-1.1**: Condition evaluation MUST complete in <10ms for expressions <1KB
- **NFR-1.2**: Variable assignment MUST complete in <5ms
- **NFR-1.3**: Loop overhead MUST be <2ms per iteration (excluding step execution)
- **NFR-1.4**: Control flow action overhead MUST NOT exceed 5% of total execution time

**NFR-2**: Reliability

- **NFR-2.1**: Nested control flow MUST not cause stack overflow (support 50+ nesting levels)
- **NFR-2.2**: Loop variable scoping MUST prevent variable leakage between iterations
- **NFR-2.3**: Resume capability MUST work correctly with partial control flow execution
- **NFR-2.4**: All configuration errors MUST be caught before execution begins

**NFR-3**: Testability

- **NFR-3.1**: All control actions MUST be testable in isolation with mocked dependencies
- **NFR-3.2**: Condition evaluation MUST be mockable for unit testing
- **NFR-3.3**: 90% code coverage for success paths
- **NFR-3.4**: 100% coverage for error handling and edge cases

**NFR-4**: Maintainability

- **NFR-4.1**: Control actions MUST follow PlaybookAction interface contract
- **NFR-4.2**: Shared logic (validation, template interpolation) MUST be extracted to utilities
- **NFR-4.3**: Error codes MUST be consistent and well-documented
- **NFR-4.4**: Configuration interfaces MUST use TypeScript for type safety

## Key Entities

**Entities owned by this feature:**

- **IfConfig**: Configuration interface for `if` action
  - Properties: condition (string), then (PlaybookStep[]), else (optional PlaybookStep[])
  - Used to configure conditional execution in playbooks

- **IfAction**: Extends `PlaybookActionWithSteps<IfConfig>`
  - Evaluates condition expression (pre-interpolated by executor)
  - Executes appropriate branch (then/else) using StepExecutor from base class
  - Returns result indicating which branch was taken and steps executed
  - Default isolation: `false` (shared scope with parent)

- **ForEachConfig**: Configuration interface for `for-each` action
  - Properties: in (array or template), item (optional string), index (optional string), steps (PlaybookStep[])
  - Used to configure iterative execution in playbooks

- **ForEachAction**: Extends `PlaybookActionWithSteps<ForEachConfig>`
  - Iterates over array executing steps for each item using StepExecutor
  - Manages loop variable scoping via StepExecutor variable overrides
  - Returns result indicating iteration count and completion status
  - Default isolation: `false` (shared scope with parent, loop variables are scoped)

- **IfResult**: Result structure for if action
  - Properties: branch ('then' | 'else' | 'none'), executed (number)
  - Returned as `value` in PlaybookActionResult for debugging

- **ForEachResult**: Result structure for for-each action
  - Properties: iterations (number), completed (number), failed (number)
  - Returned as `value` in PlaybookActionResult for tracking

**Entities from other features:**

- **PlaybookActionWithSteps** (playbook-definition): Base class for actions with nested step execution
- **StepExecutor** (playbook-definition): Interface for executing nested steps with variable overrides
- **PlaybookAction** (playbook-definition): Base interface all actions implement
- **PlaybookActionResult** (playbook-definition): Standard result structure
- **PlaybookStep** (playbook-definition): Step definition used in control flow branches
- **CatalystError** (error-handling): Standard error class with code and guidance
- **ErrorPolicy** (error-handling): Error handling configuration

## TypeScript Examples

### If Action Usage

```typescript
import type { PlaybookStep } from '@xerilium/catalyst/playbooks';

// Conditional execution with expression evaluation
const conditionalStep: PlaybookStep = {
  name: 'check-pr-size',
  action: 'if',
  config: {
    condition: '${{ get("changed-files").length > 50 }}',
    then: [
      {
        action: 'var',
        config: {
          name: 'pr-size',
          value: 'large'
        }
      },
      {
        action: 'bash',
        config: {
          code: 'echo "Large PR detected - requesting additional review"'
        }
      }
    ],
    else: [
      {
        action: 'var',
        config: {
          name: 'pr-size',
          value: 'normal'
        }
      }
    ]
  }
};

// Nested conditionals
const nestedConditional: PlaybookStep = {
  name: 'determine-review-type',
  action: 'if',
  config: {
    condition: '${{ get("is-breaking-change") === true }}',
    then: [
      {
        action: 'if',
        config: {
          condition: '${{ get("has-migration-guide") === true }}',
          then: [
            { action: 'var', config: { name: 'review-type', value: 'breaking-with-docs' } }
          ],
          else: [
            { action: 'throw', config: { code: 'MigrationGuideRequired', message: 'Breaking changes require migration guide' } }
          ]
        }
      }
    ],
    else: [
      { action: 'var', config: { name: 'review-type', value: 'standard' } }
    ]
  }
};
```

### For-Each Action Usage

```typescript
import type { PlaybookStep } from '@xerilium/catalyst/playbooks';

// Basic iteration with default variable names
const iterationStep: PlaybookStep = {
  name: 'validate-files',
  action: 'for-each',
  config: {
    in: '{{changed-files}}',
    steps: [
      {
        action: 'bash',
        config: {
          code: 'echo "Validating file: {{item}}"'
        }
      },
      {
        action: 'if',
        config: {
          condition: '${{ get("item").endsWith(".ts") }}',
          then: [
            {
              action: 'bash',
              config: { code: 'npx tsc --noEmit {{item}}' }
            }
          ]
        }
      }
    ]
  }
};

// Custom variable names and index access
const customVarsLoop: PlaybookStep = {
  name: 'process-features',
  action: 'for-each',
  config: {
    in: '{{features}}',
    item: 'feature',
    index: 'featureIndex',
    steps: [
      {
        action: 'var',
        config: {
          name: 'current-feature',
          value: '${{ get("feature").name }}'
        }
      },
      {
        action: 'bash',
        config: {
          code: 'echo "Processing feature {{featureIndex}}: {{current-feature}}"'
        }
      }
    ]
  }
};
```

## Dependencies

**Internal Dependencies:**

- **playbook-definition** (Tier 1.2): Provides `PlaybookActionWithSteps` base class, `StepExecutor` interface, `PlaybookActionResult`, `PlaybookStep` interfaces
- **error-handling** (Tier 1.1): Provides `CatalystError` and error handling framework

**External Dependencies:**

- **Node.js >= 18**: Runtime for TypeScript execution
