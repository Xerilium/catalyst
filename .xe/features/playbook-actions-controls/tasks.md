---
id: playbook-actions-controls
title: Playbook Actions - Controls
author: "@flanakin"
description: "Implementation tasks for if, for-each, playbook, and throw control flow actions"
---

# Tasks: Playbook Actions - Controls

**Input**: Design documents from `.xe/features/playbook-actions-controls/`
**Prerequisites**: plan.md (required), research.md, spec.md, MIGRATION-FROM-ENGINE.md

## Step 1: Setup

- [x] T001: Create project structure per implementation plan
  - @req NFR:playbook-actions-controls/maintainability.shared-utilities
  - Create `src/playbooks/actions/controls/` directory
  - Create `tests/actions/controls/` directory
  - Verify directories created correctly

## Step 2: Tests First (TDD)

**CRITICAL: Tests MUST be written and MUST FAIL before ANY implementation**

- [x] T002: [P] Contract test for IfAction in `tests/actions/controls/if-action.test.ts`
  - @req FR:playbook-actions-controls/conditional.if-action
  - @req NFR:playbook-actions-controls/testability.isolation
  - Test valid conditional execution (then branch)
  - Test valid conditional execution (else branch)
  - Test condition evaluation with template expressions
  - Test nested conditionals
  - Test missing/invalid configuration errors
  - Test condition evaluation failures
  - All tests passed (17/17)

- [x] T003: [P] Contract test for ForEachAction in `tests/actions/controls/for-each-action.test.ts`
  - @req FR:playbook-actions-controls/iteration.for-each-action
  - @req NFR:playbook-actions-controls/testability.isolation
  - @req NFR:playbook-actions-controls/reliability.variable-scoping
  - Test valid iteration with default variable names
  - Test valid iteration with custom variable names
  - Test array resolution from template
  - Test empty array handling
  - Test nested loops
  - Test variable scoping (loop vars don't leak)
  - Test missing/invalid configuration errors
  - Test non-array input errors
  - All tests passed (17/17)

- [x] T003b: [P] Contract test for PlaybookRunAction in `tests/actions/controls/playbook-run-action.test.ts`
  - @req FR:playbook-actions-controls/composition.playbook-action
  - @req FR:playbook-actions-controls/composition.playbook-action.circular-detection
  - @req FR:playbook-actions-controls/composition.playbook-action.recursion-limit
  - @req NFR:playbook-actions-controls/testability.isolation
  - Test valid playbook execution with inputs
  - Test playbook execution without inputs
  - Test playbook not found error
  - Test circular reference detection
  - Test recursion depth limit (10 levels)
  - Test output value extraction from child playbook
  - Test missing/invalid configuration errors
  - All tests passed (14/14)

- [x] T003c: [P] Contract test for ThrowAction in `tests/actions/controls/throw-action.test.ts`
  - @req FR:playbook-actions-controls/error-handling.throw-action
  - @req FR:playbook-actions-controls/error-handling.throw-action.code-validation
  - @req NFR:playbook-actions-controls/testability.isolation
  - Test throwing error with message only
  - Test throwing error with custom code
  - Test throwing error with guidance
  - Test metadata attachment
  - Test missing/invalid configuration errors
  - All tests passed (16/16)

- [ ] T004: [P] Integration test in `tests/actions/controls/integration.test.ts`
  - @req FR:playbook-actions-controls/execution.nested-steps
  - @req NFR:playbook-actions-controls/reliability.stack-overflow
  - Test if action with nested steps (mock StepExecutor)
  - Test for-each action with nested steps (mock StepExecutor)
  - Test playbook action with nested playbook execution (mock StepExecutor with playbook registry)
  - Test throw action in various contexts (if branches, for-each iterations, playbooks)
  - Test control flow combinations (if inside for-each, playbook inside if, throw inside for-each)
  - Test nested control flow (for-each inside if, playbook calling playbook)
  - Test variable scoping with StepExecutor overrides
  - All tests must fail initially

## Step 3: Core Implementation

- [x] T005: [P] Type definitions in `src/playbooks/actions/controls/types.ts`
  - @req FR:playbook-actions-controls/conditional.if-action.base-class
  - @req FR:playbook-actions-controls/iteration.for-each-action.base-class
  - @req FR:playbook-actions-controls/composition.playbook-action.base-class
  - @req FR:playbook-actions-controls/error-handling.throw-action.base-class
  - @req NFR:playbook-actions-controls/maintainability.type-safety
  - Define IfConfig and ForEachConfig interfaces
  - Define PlaybookRunConfig and ThrowConfig interfaces
  - Define IfResult and ForEachResult result types
  - Add JSDoc comments for all properties (used for schema generation)

- [x] T006: [P] Error factories in `src/playbooks/actions/controls/errors.ts`
  - @req FR:playbook-actions-controls/conditional.if-action.validation
  - @req FR:playbook-actions-controls/iteration.for-each-action.validation
  - @req FR:playbook-actions-controls/composition.playbook-action.validation
  - @req FR:playbook-actions-controls/error-handling.throw-action.validation
  - @req NFR:playbook-actions-controls/maintainability.error-codes
  - Create IfErrors factory functions (configInvalid, conditionEvaluationFailed)
  - Create ForEachErrors factory functions (configInvalid, invalidArray)
  - Create PlaybookRunErrors factory functions (configInvalid, playbookNotFound, circularReference, maxDepthExceeded)
  - Create ThrowErrors factory functions (configInvalid)
  - Each factory returns CatalystError with consistent code/guidance

- [x] T007: [P] Validation utilities in `src/playbooks/actions/controls/validation.ts`
  - @req NFR:playbook-actions-controls/maintainability.shared-utilities
  - @req NFR:playbook-actions-controls/reliability.validation
  - Implement validateStepArray() function
  - Add unit tests for validation utilities

- [x] T008: Implement IfAction in `src/playbooks/actions/controls/if-action.ts`
  - @req FR:playbook-actions-controls/conditional.if-action
  - @req FR:playbook-actions-controls/conditional.if-action.base-class
  - @req FR:playbook-actions-controls/conditional.if-action.evaluation
  - @req FR:playbook-actions-controls/conditional.if-action.branch-selection
  - @req FR:playbook-actions-controls/conditional.if-action.step-execution
  - @req FR:playbook-actions-controls/conditional.if-action.nesting
  - @req FR:playbook-actions-controls/conditional.if-action.error-handling
  - @req FR:playbook-actions-controls/conditional.if-action.result
  - @req FR:playbook-actions-controls/metadata.primary-property
  - Extend PlaybookActionWithSteps IfConfig base class
  - Add static primaryProperty = 'condition'
  - Implement constructor (accepts StepExecutor from base class)
  - Implement execute() method per plan.md algorithm
  - Config validation using error factories
  - Condition evaluation (template interpolation already applied)
  - Branch execution using this.stepExecutor.executeSteps()
  - Return IfResult with branch and executed count

- [x] T009: Implement ForEachAction in `src/playbooks/actions/controls/for-each-action.ts`
  - @req FR:playbook-actions-controls/iteration.for-each-action
  - @req FR:playbook-actions-controls/iteration.for-each-action.base-class
  - @req FR:playbook-actions-controls/iteration.for-each-action.array-resolution
  - @req FR:playbook-actions-controls/iteration.for-each-action.iteration
  - @req FR:playbook-actions-controls/iteration.for-each-action.variable-scoping
  - @req FR:playbook-actions-controls/iteration.for-each-action.nesting
  - @req FR:playbook-actions-controls/iteration.for-each-action.error-handling
  - @req FR:playbook-actions-controls/iteration.for-each-action.result
  - @req FR:playbook-actions-controls/metadata.capabilities
  - Extend PlaybookActionWithSteps ForEachConfig base class
  - Add static primaryProperty = 'item'
  - Add static capabilities = ['step-execution'] as const
  - Implement constructor (accepts StepExecutor from base class)
  - Implement execute() method per plan.md algorithm
  - Array resolution and validation
  - Iteration loop using this.stepExecutor.executeSteps(steps, variableOverrides)
  - Variable overrides for item/index scoping
  - Return ForEachResult with iteration statistics

- [x] T009b: Implement PlaybookRunAction in `src/playbooks/actions/controls/playbook-run-action.ts`
  - @req FR:playbook-actions-controls/composition.playbook-action
  - @req FR:playbook-actions-controls/composition.playbook-action.base-class
  - @req FR:playbook-actions-controls/composition.playbook-action.loading
  - @req FR:playbook-actions-controls/composition.playbook-action.execution
  - @req FR:playbook-actions-controls/composition.playbook-action.circular-detection
  - @req FR:playbook-actions-controls/composition.playbook-action.recursion-limit
  - @req FR:playbook-actions-controls/composition.playbook-action.outputs
  - @req FR:playbook-actions-controls/execution.nested-steps.call-stack
  - Extend PlaybookActionWithSteps PlaybookRunConfig base class
  - Add static actionType = 'playbook'
  - Add static primaryProperty = 'name'
  - Add static capabilities = ['step-execution'] as const
  - Implement constructor (accepts StepExecutor from base class)
  - Implement execute() method per plan.md algorithm
  - Validate configuration (name required, inputs optional)
  - Check circular references via StepExecutor.getCallStack()
  - Check recursion depth limit (10)
  - Lookup playbook from PlaybookProvider
  - Execute child playbook steps with inputs
  - Return outputs from child playbook

- [x] T009c: Implement ThrowAction in `src/playbooks/actions/controls/throw-action.ts`
  - @req FR:playbook-actions-controls/error-handling.throw-action
  - @req FR:playbook-actions-controls/error-handling.throw-action.base-class
  - @req FR:playbook-actions-controls/error-handling.throw-action.code-validation
  - @req FR:playbook-actions-controls/error-handling.throw-action.error-throwing
  - @req FR:playbook-actions-controls/error-handling.throw-action.interpolation
  - @req FR:playbook-actions-controls/metadata.primary-property
  - Implement PlaybookAction ThrowConfig interface (NOT extending PlaybookActionWithSteps)
  - Add static actionType = 'throw'
  - Add static primaryProperty = 'code'
  - No capabilities needed (stateless action)
  - Implement constructor (no parameters)
  - Implement execute() method per plan.md algorithm
  - Validate configuration (code required, message/guidance/metadata optional)
  - Create and throw CatalystError with user-specified code/message/guidance/metadata

- [x] T010: Public API exports in `src/playbooks/actions/controls/index.ts`
  - @req NFR:playbook-actions-controls/maintainability.interface-contract
  - Export IfAction, ForEachAction, PlaybookRunAction, ThrowAction classes
  - Export IfConfig, ForEachConfig, PlaybookRunConfig, ThrowConfig types
  - Export IfResult, ForEachResult result types
  - Export error factories
  - Export validation utilities

## Step 4: Integration

- [x] T011: Register actions in build system
  - @req FR:playbook-actions-controls/metadata.config-schemas
  - @req FR:playbook-actions-controls/metadata.capabilities
  - Ensure actions are discovered by generate-action-registry.ts script
  - Verify ACTION_REGISTRY includes if, for-each, playbook, and throw actions with metadata
  - Verify primaryProperty and configSchema generated correctly
  - Verify capabilities array generated for if, for-each, and playbook actions ('step-execution')
  - Verify throw action has no capabilities (stateless)

- [x] T012: Verify action integration
  - @req FR:playbook-actions-controls/execution.nested-steps.base-class
  - @req FR:playbook-actions-controls/execution.nested-steps.mechanisms
  - @req FR:playbook-actions-controls/execution.nested-steps.state-management
  - @req FR:playbook-actions-controls/execution.nested-steps.error-policies
  - Actions with 'step-execution' capability extend PlaybookActionWithSteps
  - throw action has no dependencies (stateless)
  - Variable scoping works correctly with StepExecutor overrides
  - Playbook registry lookup works via PlaybookProvider
  - Circular reference detection works for playbook action
  - throw action errors propagate correctly

## Step 5: Polish

- [ ] T013: [P] Performance tests in `tests/actions/controls/performance.test.ts`
  - @req NFR:playbook-actions-controls/performance.condition-eval
  - @req NFR:playbook-actions-controls/performance.variable-assignment
  - @req NFR:playbook-actions-controls/performance.loop-overhead
  - @req NFR:playbook-actions-controls/performance.overhead
  - Test condition evaluation <10ms
  - Test loop overhead <2ms per iteration
  - Test playbook lookup <5ms
  - Test throw action overhead <1ms

- [ ] T014: Edge case tests
  - @req NFR:playbook-actions-controls/reliability.stack-overflow
  - @req NFR:playbook-actions-controls/reliability.resume
  - @req NFR:playbook-actions-controls/testability.error-coverage
  - @req NFR:playbook-actions-controls/testability.mocking
  - Test deeply nested conditionals (50+ levels)
  - Test deeply nested loops (50+ levels)
  - Test deeply nested playbook calls (up to recursion limit)
  - Test large arrays (1000+ items)
  - Test null/undefined values in various contexts
  - Test throw action with various error configurations

- [ ] T015: [P] Write user documentation in `docs/playbooks/actions/controls.md`
  - @req NFR:playbook-actions-controls/maintainability.error-codes
  - Overview section (all four actions)
  - If action usage with examples
  - For-each action usage with examples
  - Playbook action usage with examples (composition patterns)
  - Throw action usage with examples (error termination patterns)
  - Advanced patterns section (combining all control flow actions)
  - Add diagrams (control flow, variable scoping, playbook call stack)

- [ ] T016: Code review and cleanup
  - @req NFR:playbook-actions-controls/maintainability.shared-utilities
  - @req NFR:playbook-actions-controls/maintainability.error-codes
  - @req NFR:playbook-actions-controls/maintainability.type-safety
  - Remove any code duplication
  - Ensure consistent error messages
  - Verify all error codes follow conventions
  - Check TypeScript types for correctness
  - Run linter and fix any issues

- [x] T017: Final test run
  - @req NFR:playbook-actions-controls/testability.success-coverage
  - @req NFR:playbook-actions-controls/testability.error-coverage
  - Run full test suite: `npm test actions/controls`
  - Verify 90% code coverage (100% for error paths)
  - Fix any failing tests
  - Verify all tests pass (64/64 tests passing)

## Dependencies

**Task Dependencies:**

- Tests (T002-T004) must be written before implementation (T005-T010)
- T005 (types) must complete before T006-T009c (implementations depend on types)
- T006 (errors) must complete before T008-T009c (implementations use error factories)
- T007 (validation) must complete before T008-T009 (implementations use validation)
- T008-T009c can run in parallel after dependencies complete
- T010 (exports) blocks T011 (registration)
- T011 (registration) blocks T012 (engine integration)
- Implementation (T005-T012) must complete before polish (T013-T017)
- T013-T015 can run in parallel
- T016-T017 must run sequentially at the end

**Note**: Tasks T003b, T003c, T009b, and T009c added for playbook and throw actions moved from playbook-engine feature.
