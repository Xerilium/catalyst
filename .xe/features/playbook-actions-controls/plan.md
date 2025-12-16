---
id: playbook-actions-controls
title: Playbook Actions - Controls
author: "@flanakin"
description: "Implementation plan for control flow action implementations"
dependencies:
  - playbook-definition
  - error-handling
---

# Implementation Plan: Playbook Actions - Controls

**Spec**: [Feature spec](./spec.md)

---

## Summary

This feature implements four control flow actions (if, for-each, playbook, throw) that enable conditional execution, iteration, composition, and error termination in Catalyst playbooks. Actions are implemented as TypeScript classes extending either `PlaybookActionWithSteps<TConfig>` base class (for actions requiring step execution) or `PlaybookAction<TConfig>` interface (for stateless actions) from playbook-definition. Each action handles configuration validation, receives pre-interpolated configuration values, and uses the StepExecutor interface for executing nested steps with proper execution semantics and state management.

---

## Technical Context

This feature implementation plan extends the technical architecture defined in `.xe/architecture.md`.

**Feature-specific technical details:**

- **Primary Components**: Four action classes (IfAction, ForEachAction, PlaybookRunAction, ThrowAction), shared error helpers, shared validation utilities
- **Data Structures**: Config interfaces (IfConfig, ForEachConfig, PlaybookRunConfig, ThrowConfig), result structures (IfResult, ForEachResult)
- **Dependencies**: playbook-definition (PlaybookActionWithSteps base class, PlaybookAction interface, StepExecutor interface), error-handling (CatalystError)
- **Configuration**: Actions use static `primaryProperty`, `capabilities`, and `dependencies` properties for metadata
- **Performance Goals**: Condition evaluation <10ms, loop overhead <2ms per iteration, playbook lookup <5ms
- **Testing Framework**: Jest with ts-jest, 90% code coverage target, 100% for error paths
- **Key Constraints**: Actions requiring step execution must use StepExecutor, maintain proper variable scoping, and declare 'step-execution' capability

---

## Project Structure

```
src/playbooks/actions/controls/
  types.ts                      # Config interfaces and result types
  errors.ts                     # CatalystError factory functions
  validation.ts                 # Shared validation utilities
  if-action.ts                  # Conditional execution action
  for-each-action.ts            # Loop iteration action
  playbook-run-action.ts        # Playbook composition action
  throw-action.ts               # Error termination action
  index.ts                      # Public API exports
tests/actions/controls/
  if-action.test.ts             # If action tests
  for-each-action.test.ts       # For-each action tests
  playbook-run-action.test.ts   # Playbook action tests
  throw-action.test.ts          # Throw action tests
  integration.test.ts           # Integration tests with StepExecutor
```

---

## Data Model

**Entities owned by this feature:**

- **IfConfig**: Configuration for conditional execution
  - `condition`: string (template expression)
  - `then`: PlaybookStep[] (steps to execute when true)
  - `else`: PlaybookStep[] (optional, steps to execute when false)

- **ForEachConfig**: Configuration for loop iteration
  - `in`: unknown[] | string (array or template expression)
  - `item`: string (optional, default: 'item')
  - `index`: string (optional, default: 'index')
  - `steps`: PlaybookStep[] (steps to execute per iteration)

- **PlaybookRunConfig**: Configuration for playbook composition
  - `name`: string (playbook name to execute)
  - `inputs`: Record<string, unknown> (optional, inputs to pass to child playbook)

- **ThrowConfig**: Configuration for error termination
  - `message`: string (error message)
  - `code`: string (optional, error code, default: 'PlaybookError')
  - `guidance`: string (optional, guidance for resolving the error)

- **IfResult**: Result structure for if action
  - `branch`: 'then' | 'else' | 'none'
  - `executed`: number (count of steps executed)

- **ForEachResult**: Result structure for for-each action
  - `iterations`: number (total iterations)
  - `completed`: number (successful iterations)
  - `failed`: number (failed iterations)

**Entities from other features:**

- **PlaybookActionWithSteps<TConfig>** (playbook-definition): Base class for actions with nested step execution
- **PlaybookAction<TConfig>** (playbook-definition): Interface for stateless actions
- **StepExecutor** (playbook-definition): Interface for executing nested steps with variable overrides
- **PlaybookActionResult** (playbook-definition): Standard result structure
- **PlaybookStep** (playbook-definition): Step definition
- **Playbook** (playbook-definition): Playbook definition structure
- **CatalystError** (error-handling): Error class

---

## Contracts

### IfAction Class

**Signature:**

```typescript
class IfAction extends PlaybookActionWithSteps<IfConfig> {
  readonly primaryProperty = 'condition';

  constructor(stepExecutor: StepExecutor);

  async execute(config: IfConfig): Promise<PlaybookActionResult>;
}
```

**Purpose:** Evaluates condition expression and executes appropriate branch (then/else)

**Parameters:**

- `stepExecutor` (StepExecutor): Executor for nested steps, inherited from base class

**Returns:** PlaybookActionResult with IfResult value indicating branch taken and steps executed

**Errors/Exceptions:**

- 'IfConfigInvalid': Missing or invalid configuration
- 'IfConditionEvaluationFailed': Condition evaluation error

**Examples:**

```typescript
const stepExecutor = createMockStepExecutor();
const action = new IfAction(stepExecutor);

const result = await action.execute({
  condition: '${{ get("count") > 10 }}',
  then: [{ action: 'bash', config: { code: 'echo "high"' } }],
  else: [{ action: 'bash', config: { code: 'echo "low"' } }]
});
// result.value = { branch: 'then', executed: 1 }
```

### ForEachAction Class

**Signature:**

```typescript
class ForEachAction extends PlaybookActionWithSteps<ForEachConfig> {
  readonly primaryProperty = 'item';

  constructor(stepExecutor: StepExecutor);

  async execute(config: ForEachConfig): Promise<PlaybookActionResult>;
}
```

**Purpose:** Iterates over array executing steps for each item with scoped variables

**Parameters:**

- `stepExecutor` (StepExecutor): Executor for iteration steps, inherited from base class

**Returns:** PlaybookActionResult with ForEachResult value indicating iteration statistics

**Errors/Exceptions:**

- 'ForEachConfigInvalid': Missing or invalid configuration
- 'ForEachInvalidArray': `in` property does not resolve to array

**Examples:**

```typescript
const stepExecutor = createMockStepExecutor();
const action = new ForEachAction(stepExecutor);

const result = await action.execute({
  in: [1, 2, 3],
  steps: [{ action: 'bash', config: { code: 'echo {{item}}' } }]
});
// result.value = { iterations: 3, completed: 3, failed: 0 }
```

### PlaybookRunAction Class

**Signature:**

```typescript
class PlaybookRunAction extends PlaybookActionWithSteps<PlaybookRunConfig> {
  static readonly actionType = 'playbook';
  readonly primaryProperty = 'name';
  static readonly capabilities = ['step-execution'] as const;

  constructor(stepExecutor: StepExecutor);

  async execute(config: PlaybookRunConfig): Promise<PlaybookActionResult>;
}
```

**Purpose:** Executes a registered playbook by name with optional input parameters

**Parameters:**

- `stepExecutor` (StepExecutor): Executor for child playbook steps, inherited from base class

**Returns:** PlaybookActionResult with outputs from child playbook execution

**Errors/Exceptions:**

- 'PlaybookRunConfigInvalid': Missing or invalid configuration
- 'PlaybookNotFound': Referenced playbook not found in registry
- 'CircularPlaybookReference': Detected circular playbook call chain
- 'MaxRecursionDepthExceeded': Playbook nesting depth exceeds limit (10)

**Examples:**

```typescript
const stepExecutor = createMockStepExecutor();
const action = new PlaybookRunAction(stepExecutor);

const result = await action.execute({
  name: 'validate-pr',
  inputs: { prNumber: 123 }
});
// result.value = { validated: true, issuesFound: 0 }
```

### ThrowAction Class

**Signature:**

```typescript
class ThrowAction implements PlaybookAction<ThrowConfig> {
  static readonly actionType = 'throw';
  readonly primaryProperty = 'message';

  constructor();

  async execute(config: ThrowConfig): Promise<PlaybookActionResult>;
}
```

**Purpose:** Terminates playbook execution with custom error message and code

**Parameters:**

- No constructor parameters (stateless action)

**Returns:** Never returns (always throws CatalystError)

**Errors/Exceptions:**

- 'ThrowConfigInvalid': Missing or invalid configuration
- '{config.code}': Throws CatalystError with user-specified code (default: 'PlaybookError')

**Examples:**

```typescript
const action = new ThrowAction();

// This will throw CatalystError
await action.execute({
  message: 'PR validation failed',
  code: 'ValidationFailed',
  guidance: 'Review the PR and fix validation errors before retrying'
});
// Throws: CatalystError('PR validation failed', 'ValidationFailed', ...)
```

---

## Implementation Approach

### 1. Shared Infrastructure

**Config Interfaces** (`types.ts`):

Define TypeScript interfaces for all action configurations and result structures. Use JSDoc comments for property descriptions (generated into JSON schemas).

**Error Factories** (`errors.ts`):

Create factory functions for creating CatalystError instances with consistent codes and guidance:

```typescript
export const IfErrors = {
  configInvalid: (reason: string) => new CatalystError(
    `Invalid if action configuration: ${reason}`,
    'IfConfigInvalid',
    'Check if action config: condition and then properties are required'
  ),
  conditionEvaluationFailed: (condition: string, error: Error) => new CatalystError(
    `Failed to evaluate condition "${condition}": ${error.message}`,
    'IfConditionEvaluationFailed',
    'Check condition syntax - must be valid template expression'
  )
};
```

**Validation Utilities** (`validation.ts`):

Shared validation functions for common patterns:

```typescript
export function validateStepArray(steps: unknown[], actionName: string, propertyName: string): void {
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new CatalystError(
      `${actionName} ${propertyName} must be non-empty array`,
      `${actionName}ConfigInvalid`,
      `Provide at least one step in ${propertyName} array`
    );
  }

  // Validate each step has required properties
  for (const step of steps) {
    if (!step || typeof step !== 'object' || !('action' in step)) {
      throw new CatalystError(
        `Invalid step in ${actionName} ${propertyName}: missing action property`,
        `${actionName}ConfigInvalid`,
        'Each step must have action property'
      );
    }
  }
}
```

### 2. IfAction Implementation

**Algorithm:**

1. Validate configuration
   - Check condition property exists and is non-empty string
   - Check then property exists and is non-empty array
   - Validate else property if provided (must be array)
   - Call `validateStepArray()` for then/else branches

2. Evaluate condition expression
   - Condition already has template interpolation applied before action executes
   - Evaluate boolean expression (JavaScript truthy/falsy semantics)
   - Catch evaluation errors and wrap in 'IfConditionEvaluationFailed'

3. Execute appropriate branch
   - If condition is truthy: call `this.stepExecutor.executeSteps(config.then)`
   - If condition is falsy and `else` exists: call `this.stepExecutor.executeSteps(config.else)`
   - If condition is falsy and no `else`: return success with branch='none'
   - StepExecutor handles all step execution, error policies, and state persistence
   - Track number of steps executed for result

4. Return result
   - Construct IfResult: `{ branch: 'then' | 'else' | 'none', executed: stepCount }`
   - Return PlaybookActionResult with code='Success', value=IfResult

### 3. ForEachAction Implementation

**Algorithm:**

1. Validate configuration
   - Check `in` property exists
   - Check `steps` property exists and is non-empty array
   - Call `validateStepArray()` for steps
   - Validate item/index names if provided (check for valid naming conventions)

2. Resolve array for iteration
   - If `in` is array: use directly
   - If `in` is string: template interpolation already applied, evaluate as array reference
   - If result is not array: throw 'ForEachInvalidArray'
   - Handle empty array (zero iterations, return success immediately)

3. Initialize iteration state
   - `iterationCount = 0`, `completedCount = 0`, `failedCount = 0`
   - Get item/index variable names (default: 'item', 'index')

4. Execute iteration loop
   - For each item at index i in array:
     - Create variable overrides: `{ [itemName]: item, [indexName]: i }`
     - Call `this.stepExecutor.executeSteps(config.steps, variableOverrides)`
     - StepExecutor handles variable scoping (overrides shadow parent variables during execution)
     - If all steps succeed: increment `completedCount`
     - If step fails:
       - Increment `failedCount`
       - StepExecutor handles error policy (Continue/Stop/Retry)
     - Increment `iterationCount`

5. Return result
   - Construct ForEachResult: `{ iterations, completed, failed }`
   - Return PlaybookActionResult with code='Success', value=ForEachResult

### 4. PlaybookRunAction Implementation

**Algorithm:**

1. Validate configuration
   - Check `name` property exists and is non-empty string
   - Validate `inputs` property if provided (must be object)

2. Load playbook from providers
   - Load playbook via PlaybookProvider: `await PlaybookProvider.getInstance().load(name)`
   - If playbook not found: throw 'PlaybookNotFound' with list of registered providers

3. Check for circular references and recursion depth
   - Access call stack via StepExecutor: `this.stepExecutor.getCallStack()`
   - If loaded playbook name is in call stack: throw 'CircularPlaybookReference'
   - If call stack depth >= 10: throw 'MaxRecursionDepthExceeded'

4. Execute child playbook steps
   - Call `this.stepExecutor.executeSteps(playbook.steps, config.inputs || {})`
   - StepExecutor handles:
     - Creating isolated variable scope with inputs
     - Updating call stack for circular reference detection
     - Executing all steps with error policies
     - State persistence for resume capability

5. Return result
   - Extract outputs from last step result (if any)
   - Return PlaybookActionResult with code='Success', message, value=outputs

**Key Security Properties:**

- Playbook loading happens via PlaybookProvider (extensible, decoupled)
- Circular reference detection prevents infinite recursion
- Recursion depth limit (10) prevents stack overflow
- Each child playbook has isolated variable scope

### 5. ThrowAction Implementation

**Algorithm:**

1. Validate configuration
   - Check `message` property exists and is non-empty string
   - Validate `code` property if provided (must be string)
   - Validate `guidance` property if provided (must be string)

2. Create CatalystError
   - Use message from config
   - Use code from config (default: 'PlaybookError')
   - Use guidance from config (optional)

3. Throw error
   - Throw CatalystError immediately
   - Action never returns (always terminates execution)
   - Error propagates up through caller's error handling

**Error Factory:**

```typescript
export const ThrowErrors = {
  configInvalid: (reason: string) => new CatalystError(
    `Invalid throw action configuration: ${reason}`,
    'ThrowConfigInvalid',
    'Check throw action config: message property is required'
  )
};
```

**Implementation:**

```typescript
export class ThrowAction implements PlaybookAction<ThrowConfig> {
  static readonly actionType = 'throw';
  readonly primaryProperty = 'message';

  constructor() {
    // No dependencies - stateless action
  }

  async execute(config: ThrowConfig): Promise<PlaybookActionResult> {
    // Validate configuration
    if (!config?.message || typeof config.message !== 'string') {
      throw ThrowErrors.configInvalid('message property is required and must be string');
    }

    const code = config.code || 'PlaybookError';
    const guidance = config.guidance;

    // Throw user-specified error
    throw new CatalystError(config.message, code, guidance);
  }
}
```

### 6. Integration Points

**Depends on:**

- playbook-definition: PlaybookActionWithSteps base class, StepExecutor interface, PlaybookStep type, ACTION_REGISTRY
- error-handling: CatalystError class

**Step Execution Integration:**

Control actions extend PlaybookActionWithSteps base class and receive StepExecutor via constructor:

```typescript
interface StepExecutor {
  /**
   * Execute an array of steps sequentially
   */
  executeSteps(
    steps: PlaybookStep[],
    variableOverrides?: Record<string, unknown>
  ): Promise<PlaybookActionResult[]>;

  /**
   * Get the current playbook call stack for circular reference detection
   */
  getCallStack(): string[];
}
```

StepExecutor capabilities:
- Executes array of steps following same rules as top-level steps
- Applies error policies to each step
- Updates state persistence after each step
- Supports variable overrides for scoped execution (used by for-each)
- Returns array of step results
- Provides call stack access for circular reference detection (getCallStack)

### 7. Error Handling

**Configuration Validation Errors:**

All actions validate configuration before execution:
- Missing required properties → '{Action}ConfigInvalid'
- Invalid property types → '{Action}ConfigInvalid'
- Invalid property values → '{Action}ConfigInvalid'

Validation errors thrown immediately, preventing execution.

**Runtime Execution Errors:**

- Condition evaluation failures → 'IfConditionEvaluationFailed'
- Array resolution failures → 'ForEachInvalidArray'
- Playbook not found → 'PlaybookNotFound'
- Circular playbook references → 'CircularPlaybookReference'
- Recursion depth exceeded → 'MaxRecursionDepthExceeded'
- User-triggered errors → '{config.code}' (from throw action)

Runtime errors wrapped in CatalystError with actionable guidance.

**Nested Step Errors:**

Steps executed by IfAction, ForEachAction, and PlaybookRunAction may fail:
- Error propagated by default (stops branch/iteration/child playbook)
- Error policy on control flow step can override (Continue, Retry)
- Failed steps tracked in result (ForEachResult.failed)

**ThrowAction Behavior:**

ThrowAction always terminates execution:
- Throws CatalystError with user-specified message/code/guidance
- Never returns (no success path)
- Error propagates through caller's error handling
- Respects error policies on parent steps

### 8. Performance Considerations

**Optimization Strategies:**

- **Config Validation**: Validate once before execution
- **Variable Scoping**: StepExecutor handles variable overrides efficiently
- **Expression Evaluation**: Condition expressions pre-interpolated before action execution
- **Step Execution**: StepExecutor reused across all nested step execution
- **Playbook Lookup**: O(1) registry lookup via Map data structure
- **Error Construction**: ThrowAction validates config once, minimal overhead

**Performance Targets:**

- Condition evaluation: <10ms for expressions <1KB
- Loop overhead: <2ms per iteration (excluding step execution time)
- Playbook lookup: <5ms for registry access
- Throw action overhead: <1ms (validation + error construction)
- Total control flow overhead: <5% of playbook execution time

**Measurement:**

Performance tests in Jest with timing assertions:

```typescript
test('condition evaluation completes in <10ms', async () => {
  const start = Date.now();
  await action.execute({ condition: '${{ get("count") > 10 }}', then: [] });
  const elapsed = Date.now() - start;
  expect(elapsed).toBeLessThan(10);
});
```

### 9. Testing Strategy

**Unit Tests:**

Each action class:
- Valid configuration execution (happy path)
- Invalid configuration (missing properties, wrong types)
- Expression evaluation (various conditions, edge cases)
- Error handling (template errors, validation errors)
- Variable scoping (nested loops, variable shadowing)
- Edge cases (empty arrays, null values, nested control flow)

**PlaybookRunAction-specific tests:**
- Playbook lookup from registry
- Circular reference detection
- Recursion depth limits
- Input parameter passing
- Output value extraction

**ThrowAction-specific tests:**
- Error message/code/guidance configuration
- Default error code ('PlaybookError')
- Validation error handling
- Error propagation behavior

**Integration Tests:**

- Control actions with mock StepExecutor
- Full playbook execution (integration tests in consuming features)
- Nested playbook execution (playbook calling playbook)
- Error termination with throw action in various contexts

**Performance Tests:**

- Condition evaluation timing
- Loop overhead timing
- Playbook lookup timing
- Throw action overhead timing

**Coverage Targets:**

- 90% overall code coverage
- 100% error handling paths
- 100% configuration validation paths

### 10. Documentation Plan

**Target Audience**: Playbook authors (developers using Catalyst framework)

**Documentation Type**: User guide and API reference

**File Location**: `docs/playbooks/actions/controls.md`

**Content Outline:**

1. Overview
   - What are control flow actions
   - When to use if vs for-each vs playbook vs throw

2. Conditional Execution (if action)
   - Basic if/then/else syntax
   - Condition expression syntax
   - Nested conditionals
   - Examples: PR size check, feature flag evaluation

3. Iteration (for-each action)
   - Basic loop syntax
   - Loop variable access (item, index)
   - Custom variable names
   - Nested loops
   - Error handling in loops
   - Examples: file validation, multi-environment deployment

4. Playbook Composition (playbook action)
   - Calling playbooks from other playbooks
   - Passing inputs to child playbooks
   - Accessing child playbook outputs
   - Circular reference detection
   - Recursion depth limits
   - Examples: reusable validation playbooks, multi-step workflows

5. Error Termination (throw action)
   - Basic throw syntax
   - Custom error codes and messages
   - Adding guidance for error resolution
   - Examples: validation failures, precondition checks

6. Advanced Patterns
   - Combining all control flow actions
   - Nested control flow
   - Error handling strategies with throw
   - Resume capability with control flow
   - Building reusable playbook libraries

**Code Examples**: 15+ examples covering basic usage, common patterns, and advanced scenarios

**Diagrams**:
- Control flow execution diagram (Mermaid flowchart)
- Variable scoping diagram for loops
- Playbook composition call stack diagram

---

## Usage Examples

### Example 1: Basic Conditional Execution

```typescript
import type { Playbook } from '@xerilium/catalyst/playbooks';

const playbook: Playbook = {
  name: 'pr-review-workflow',
  description: 'Determines review requirements based on PR size',
  owner: 'Engineer',
  inputs: [
    { name: 'changed-files', type: 'number', required: true }
  ],
  steps: [
    {
      name: 'check-size',
      action: 'if',
      config: {
        condition: '${{ get("changed-files") > 50 }}',
        then: [
          {
            action: 'bash',
            config: { code: 'echo "Large PR detected - requesting additional review"' }
          }
        ],
        else: [
          {
            action: 'bash',
            config: { code: 'echo "Standard PR size - normal review process"' }
          }
        ]
      }
    }
  ]
};
```

### Example 2: Nested Control Flow - Loop with Conditional

```typescript
const playbook: Playbook = {
  name: 'multi-file-validation',
  description: 'Validates multiple files with conditional type checking',
  owner: 'Engineer',
  inputs: [
    { name: 'files', type: 'string', required: true } // JSON array string
  ],
  steps: [
    {
      name: 'validate-all-files',
      action: 'for-each',
      config: {
        in: '{{files}}',
        item: 'file',
        steps: [
          {
            action: 'bash',
            config: { code: 'echo "Checking {{file}}"' }
          },
          {
            action: 'if',
            config: {
              condition: '${{ get("file").endsWith(".ts") }}',
              then: [
                {
                  action: 'bash',
                  config: { code: 'npx tsc --noEmit {{file}}' },
                  errorPolicy: { default: { action: 'Continue', retryCount: 0 } }
                }
              ]
            }
          }
        ]
      },
      errorPolicy: { default: { action: 'Continue', retryCount: 0 } }
    },
    {
      name: 'summary',
      action: 'bash',
      config: {
        code: 'echo "Validation completed for {{validate-all-files.completed}} files"'
      }
    }
  ]
};
```

### Example 3: Playbook Composition - Reusable Validation

```typescript
// Child playbook: validate-file.yaml
const validateFilePlaybook: Playbook = {
  name: 'validate-file',
  description: 'Validates a single file based on type',
  owner: 'Engineer',
  inputs: [
    { name: 'file-path', type: 'string', required: true }
  ],
  steps: [
    {
      name: 'check-exists',
      action: 'bash',
      config: { code: 'test -f {{file-path}}' }
    },
    {
      name: 'check-typescript',
      action: 'if',
      config: {
        condition: '${{ get("file-path").endsWith(".ts") }}',
        then: [
          {
            action: 'bash',
            config: { code: 'npx tsc --noEmit {{file-path}}' }
          }
        ]
      }
    },
    {
      name: 'return-result',
      action: 'return',
      config: { value: { validated: true, file: '{{file-path}}' } }
    }
  ]
};

// Parent playbook: validate-all-files.yaml
const validateAllFilesPlaybook: Playbook = {
  name: 'validate-all-files',
  description: 'Validates multiple files using reusable playbook',
  owner: 'Engineer',
  inputs: [
    { name: 'files', type: 'string', required: true }
  ],
  steps: [
    {
      name: 'validate-each-file',
      action: 'for-each',
      config: {
        in: '{{files}}',
        item: 'file',
        steps: [
          {
            action: 'playbook',
            config: {
              name: 'validate-file',
              inputs: { 'file-path': '{{file}}' }
            }
          }
        ]
      }
    }
  ]
};
```

### Example 4: Error Termination - Precondition Check

```typescript
const deploymentPlaybook: Playbook = {
  name: 'deploy-application',
  description: 'Deploys application with precondition checks',
  owner: 'Engineer',
  inputs: [
    { name: 'environment', type: 'string', required: true },
    { name: 'version', type: 'string', required: true }
  ],
  steps: [
    {
      name: 'validate-environment',
      action: 'if',
      config: {
        condition: '${{ !["dev", "staging", "prod"].includes(get("environment")) }}',
        then: [
          {
            action: 'throw',
            config: {
              message: 'Invalid environment: {{environment}}',
              code: 'InvalidEnvironment',
              guidance: 'Environment must be one of: dev, staging, prod'
            }
          }
        ]
      }
    },
    {
      name: 'check-version-format',
      action: 'if',
      config: {
        condition: '${{ !get("version").match(/^\\d+\\.\\d+\\.\\d+$/) }}',
        then: [
          {
            action: 'throw',
            config: {
              message: 'Invalid version format: {{version}}',
              code: 'InvalidVersionFormat',
              guidance: 'Version must follow semver format (e.g., 1.2.3)'
            }
          }
        ]
      }
    },
    {
      name: 'deploy',
      action: 'bash',
      config: {
        code: 'echo "Deploying version {{version}} to {{environment}}"'
      }
    }
  ]
};
```
