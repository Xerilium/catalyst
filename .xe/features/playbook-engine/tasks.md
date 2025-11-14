---
id: playbook-engine
title: Playbook Engine
author: "@flanakin"
description: "Task breakdown for implementing TypeScript-based playbook execution engine with AI platform agnostic design"
---

# Tasks: Playbook Engine

**Input**: Design documents from `.xe/features/playbook-engine/`

**Prerequisites**: plan.md (required), spec.md, research.md

> **Living Specification Note**: Tasks assume from-scratch implementation following the phased approach in research.md (Core Runtime → Structured Executors → Composition → Testing/Polish)

## Step 1: Project Setup and Core Types

Foundation setup and type definitions for the execution engine.

- [ ] T001: Create project structure per plan.md file organization (runtime/, executors/, adapters/, scripts/, definitions/)
- [ ] T002: Install dependencies (`@anthropic-ai/claude-agent-sdk`, `js-yaml`, `@types/node`)
- [ ] T003: Create core TypeScript interfaces in `src/playbooks/runtime/types.ts` (PlaybookDefinition, ExecutionContext, TaskExecutor, AIAdapter, etc.)
- [ ] T004: Create `.xe/rollouts/.gitignore` to exclude state files from git
- [ ] T005: Create `playbooks/.gitkeep` for YAML playbook directory

## Step 2: Tests First (TDD)

Write all test files that will fail initially and pass as implementation progresses.

- [ ] T006: [P] Unit test for convention-based discovery in `tests/playbooks/runtime/registry.test.ts`
- [ ] T007: [P] Unit test for ExecutionContext in `tests/playbooks/runtime/context.test.ts`
- [ ] T008: [P] Unit test for StateManager in `tests/playbooks/runtime/state-manager.test.ts`
- [ ] T009: [P] Unit test for PlaybookEngine in `tests/playbooks/runtime/engine.test.ts`
- [ ] T010: [P] Unit test for MarkdownTaskExecutor in `tests/playbooks/runtime/executors/markdown.test.ts`
- [ ] T011: [P] Unit test for ClaudeAdapter in `tests/playbooks/runtime/adapters/claude.test.ts`
- [ ] T012: Integration test for full playbook execution in `tests/playbooks/integration/full-execution.test.ts`
- [ ] T013: Integration test for resume capability in `tests/playbooks/integration/resume.test.ts`

## Step 3: Core Runtime (Phase 1)

Implement the execution engine with markdown executor.

- [ ] T014: Implement convention-based discovery in `src/playbooks/runtime/registry.ts` per plan.md § 2
  - Load YAML files from definitions directory
  - Validate playbook structure (id, inputs, steps)
  - Provide get() and list() methods
- [ ] T015: Implement ExecutionContext in `src/playbooks/runtime/context.ts` per plan.md § 3
  - Maintain runtime state (executionId, inputs, stepResults)
  - Track current step index and status
  - Provide step navigation methods
- [ ] T016: Implement StateManager in `src/playbooks/runtime/state.ts` per plan.md § 4
  - Atomic state persistence (temp file + rename)
  - Load and validate saved state
  - Handle state corruption with clear errors
- [ ] T017: Implement ClaudeAdapter in `src/playbooks/runtime/adapters/claude.ts` per plan.md § 5
  - Wrap @anthropic-ai/claude-agent-sdk
  - Stream AI responses as AsyncIterator
  - Handle authentication and API errors
- [ ] T018: Implement AIAdapterRegistry in `src/playbooks/runtime/adapters/index.ts` per plan.md § 5
  - Register and retrieve AI adapters
  - Provide getDefault() for auto-detection
- [ ] T019: Implement MarkdownTaskExecutor in `src/playbooks/runtime/executors/markdown.ts` per plan.md § 6
  - Read markdown files
  - Interpolate variables ({{variable}} syntax)
  - Invoke AI adapter with markdown content
  - Stream results to console
- [ ] T020: Implement TaskExecutorRegistry in `src/playbooks/runtime/executors/index.ts` per plan.md § 6
  - Register and retrieve task executors
- [ ] T021: Implement PlaybookEngine in `src/playbooks/runtime/engine.ts` per plan.md § 7
  - Execute playbooks from start to finish
  - Validate inputs with transforms
  - Sequential step execution
  - Handle checkpoints (pause/resume)
  - Validate outputs after execution
- [ ] T022: Implement engine.resume() method in PlaybookEngine per plan.md § 7
  - Load saved state
  - Reconstruct execution context
  - Continue from last completed step
- [ ] T023: Export public API from `src/playbooks/runtime/index.ts`
  - Export all classes and interfaces
  - Provide clean public surface area

## Step 4: CLI Tools

Command-line interface for executing playbooks.

- [ ] T024: Implement run-playbook CLI in `src/playbooks/scripts/run-playbook.ts` per plan.md § 8
  - Parse command-line arguments
  - Initialize engine with registries
  - Execute playbook and handle errors
  - Exit with appropriate status codes
- [ ] T025: Implement validate-playbook CLI in `src/playbooks/scripts/validate-playbook.ts`
  - Load and validate single playbook
  - Report validation errors with details
- [ ] T026: Implement list-playbooks CLI in `src/playbooks/scripts/list-playbooks.ts`
  - List all available playbooks
  - Show metadata (id, description, owner)

## Step 5: Structured Executors (Phase 2)

Add structured task types beyond markdown.

- [ ] T027: [P] Unit test for AIPromptTaskExecutor in `tests/playbooks/runtime/executors/ai-prompt.test.ts`
- [ ] T028: [P] Unit test for CheckpointTaskExecutor in `tests/playbooks/runtime/executors/checkpoint.test.ts`
- [ ] T029: Implement AIPromptTaskExecutor in `src/playbooks/runtime/executors/ai-prompt.ts` per plan.md § 6
  - Parse prompt from step config
  - Interpolate variables
  - Invoke AI adapter
  - Validate output files exist
- [ ] T030: Implement CheckpointTaskExecutor in `src/playbooks/runtime/executors/checkpoint.ts` per plan.md § 6
  - Display checkpoint message
  - Pause execution in manual mode
  - Wait for ENTER key press
  - Auto-approve in autonomous mode
- [ ] T031: Register new executors in engine initialization

## Step 6: Playbook Composition (Phase 3)

Enable sub-playbook execution for composability.

- [ ] T032: Unit test for SubPlaybookTaskExecutor in `tests/playbooks/runtime/executors/sub-playbook.test.ts`
- [ ] T033: Implement SubPlaybookTaskExecutor in `src/playbooks/runtime/executors/sub-playbook.ts` per plan.md § 6
  - Map inputs from parent to child
  - Invoke engine recursively
  - Handle child failures
  - Detect circular dependencies
- [ ] T034: Create example decomposed playbook YAMLs per research.md § Playbook Composition
  - research-feature.yaml
  - create-spec.yaml
  - create-plan.yaml
  - implement-feature.yaml
  - start-rollout-decomposed.yaml (orchestrator)
- [ ] T035: Integration test for sub-playbook execution in `tests/playbooks/integration/composition.test.ts`
  - Test nested playbook execution
  - Test input mapping
  - Test circular dependency detection

## Step 7: Error Handling and Polish

Robust error handling, logging, and user experience improvements.

- [ ] T036: Implement custom error classes per plan.md § Error Handling
  - PlaybookNotFoundError
  - ValidationError
  - ExecutionError
  - ExecutorNotFoundError
  - StateCorruptedError
  - StateNotFoundError
  - AuthenticationError
- [ ] T037: Add comprehensive logging throughout engine
  - Log step start/end with timestamps
  - Log checkpoint pauses
  - Log state save operations
  - Use configurable log levels (debug, info, warn, error)
- [ ] T038: Implement retry logic for AI adapter per plan.md § Error Handling
  - 3 attempts with exponential backoff (1s, 2s, 4s)
  - Retry on rate limit and transient errors
  - Log retry attempts
- [ ] T039: Add execution summary reporting
  - Total duration
  - Step durations
  - Success/failure status
  - Output file locations
- [ ] T040: Add progress indicators for long-running steps
  - Spinner or progress bar for AI invocations
  - Elapsed time display
  - Current step indicator

## Step 8: Testing and Quality (Phase 4)

Comprehensive testing, coverage, and quality validation.

- [ ] T041: Verify all unit tests pass with 90%+ coverage
  - Run `npm run test:coverage`
  - Fix any failing tests
  - Add tests for uncovered branches
- [ ] T042: Verify integration tests pass with 100% critical path coverage
  - Full playbook execution from start to finish
  - Resume from saved state
  - Sub-playbook composition
  - Error handling scenarios
- [ ] T043: Create test fixtures
  - Sample YAML playbooks for testing
  - Mock AI responses
  - Test state files
- [ ] T044: Run type checking and fix any TypeScript errors
  - Run `npm run type-check`
  - Ensure strict TypeScript compliance
- [ ] T045: Add JSDoc comments to all public APIs
  - Document all exported classes and interfaces
  - Include usage examples
  - Document error conditions

## Step 9: Documentation

User-facing documentation and examples.

- [ ] T046: Create README in `src/playbooks/runtime/README.md`
  - Overview of playbook engine
  - Quick start guide
  - API reference
  - Example playbooks
- [ ] T047: Document YAML playbook schema
  - Required fields
  - Task type reference
  - Variable interpolation syntax
  - Checkpoint configuration
- [ ] T048: Create migration guide for converting markdown to structured playbooks
  - Step-by-step conversion process
  - Examples for each task type
  - Best practices

## Step 10: Validation and Final Review

Final validation before feature completion.

- [ ] T049: Validate all functional requirements from spec.md are met
  - FR-1: Playbook definition and discovery ✓
  - FR-2: Input validation and transformation ✓
  - FR-3: Workflow execution ✓
  - FR-4: Task executors ✓
  - FR-5: AI platform integration ✓
  - FR-6: Human-in-the-loop checkpoints ✓
  - FR-7: State management and resume ✓
  - FR-8: Output validation ✓
  - FR-9: Playbook composition ✓
  - FR-10: Multi-platform support ✓
- [ ] T050: Validate all non-functional requirements from spec.md are met
  - NFR-1: Cost & usage efficiency ✓
  - NFR-2: Reliability ✓
  - NFR-3: Performance ✓
  - NFR-4: Observability ✓
  - NFR-5: Testability ✓
  - NFR-6: Extensibility ✓
- [ ] T051: Validate all success criteria from spec.md are met
  - Markdown playbooks work as first-class task type ✓
  - Sequential step progression enforced ✓
  - Checkpoints block until approval ✓
  - State persisted for resume ✓
  - Feature rollouts decomposable ✓
  - 90% code coverage achieved ✓
  - Clear execution logs ✓
  - Actionable error messages ✓
- [ ] T052: Run engineering principles review per `.xe/engineering.md`
  - KISS: Simple solutions, no premature optimization
  - YAGNI: Only implemented required features
  - Separation of Concerns: Clear module boundaries
  - Single Responsibility: Each class has one purpose
  - Dependency Inversion: Abstracted AI platform and file system
  - Fail Fast: Clear error messages with immediate failure
  - Design for Testability: Mockable dependencies, high coverage
  - Deterministic Processing: Consistent results for same inputs

## Dependencies

- **Sequential Dependencies**: Each step depends on all previous steps completing
- **Parallel Tasks**: Tasks marked [P] within same step run concurrently
- **External Dependencies**: Claude Agent SDK, js-yaml installed in T002
- **Testing Dependencies**: All implementation tasks (T014-T045) must complete before validation (T049-T052)

## Success Criteria

Feature is complete when:

- [ ] All 52 tasks completed
- [ ] All tests passing (unit + integration)
- [ ] 90%+ code coverage achieved
- [ ] All functional requirements validated
- [ ] All non-functional requirements validated
- [ ] Engineering principles review passed
- [ ] Documentation complete
- [ ] CLI tools functional
- [ ] Example playbooks working
