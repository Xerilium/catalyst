---
id: playbook-engine
title: Playbook Engine
author: "@flanakin"
description: "TypeScript-based workflow execution engine that enables reliable, composable playbook orchestration through programmatic Claude invocation and structured task execution"
dependencies:
  - product-context
  - engineering-context
  - feature-context
---

<!-- markdownlint-disable single-title -->

# Feature: Playbook Engine

## Problem

AI-driven workflows need enforcement mechanisms to ensure steps are followed correctly, support reliable pause and resume, and enable composition into smaller, reviewable units. Without these capabilities, achieving consistent, high-quality code generation at scale is difficult, and complex workflows cannot be broken into manageable, PR-sized chunks.

## Goals

- Enable programmatic execution of workflows with guaranteed step-by-step progression
- Support existing markdown playbooks without requiring migration
- Enable workflow composition by breaking large playbooks into smaller, independently executable units
- Provide state management for pause/resume capability across workflow executions
- Ensure human checkpoints are reliably enforced at critical decision points
- Validate workflow outputs exist and meet quality standards
- Support gradual migration from markdown-based to structured workflows

Explicit non-goals:

- Full autonomous execution without human checkpoints (Phase 2: autonomous-orchestration)
- Real-time workflow monitoring and dashboards (defer until needed)
- Workflow versioning and migration tools (defer until multiple versions exist)
- Multi-repository workflow orchestration (Phase 5: multi-repository-management)
- Custom playbook SDK for third-party developers (Phase 4: custom-playbooks)

## Scenario

- As a **Product Manager**, I need playbooks to execute reliably without skipping critical validation steps
  - Outcome: Every playbook execution validates engineering principles and runs all tests, measurable by zero skipped validation steps in execution logs

- As an **Architect**, I need to break feature rollouts into independent phases (research, spec, plan, implementation) that each create their own PR
  - Outcome: start-rollout can be decomposed into 4+ independent playbooks, each producing a separate PR for focused review

- As an **Engineer**, I need playbook execution to pause at checkpoints and wait for explicit approval before continuing
  - Outcome: Playbooks with checkpoints cannot proceed without human input, preventing premature code generation

- As a **Developer**, I need markdown-based playbooks to be supported as a task type
  - Outcome: Playbooks can be defined as pure markdown files and executed by the engine

- As a **Framework Developer**, I need to add new workflow capabilities (bash commands, HTTP calls) without modifying core engine
  - Outcome: New task executors can be added as independent modules without changing engine code

## Success Criteria

- Markdown playbooks can be executed as a first-class task type via the engine
- Playbook execution enforces sequential step progression - cannot skip steps or reorder execution
- Checkpoints block execution until explicit human approval in manual mode
- State is persisted after each step, enabling resume from last completed step
- Feature rollouts can be decomposed into research → spec → plan → implement sub-playbooks
- 90% code coverage across engine, executors, and state management
- Execution logs show clear visibility into which step is running, results, and validation status
- Failed playbooks provide actionable error messages indicating which step failed and why

## Design principles

**Extensibility through composition, not modification**
> New capabilities are added via new task executor types, not by changing the engine. Task executors register with the engine and implement a common interface. This ensures the engine remains stable while workflow capabilities expand.

**Explicit over implicit**
> Workflow behavior must be explicitly defined in playbook YAML. No hidden defaults, no magic behavior. Every step, input, output, and checkpoint is visible in the definition. This makes workflows auditable and debuggable.

**Fail fast with clear guidance**
> Validation errors stop execution immediately with specific, actionable error messages. Never silently continue or guess intent. Messages include the exact requirement violated and how to fix it.

**Markdown as a first-class task type**
> Markdown playbooks are a first-class task type, not a legacy compatibility shim. The markdown executor enables human/AI-readable workflows that can be executed programmatically, combining the best of both declarative and natural language approaches.

**State is cheap, re-execution is expensive**
> Save execution state after every step. Disk is cheap, AI token usage is not. This enables resume capability and provides execution audit trails without requiring re-running completed steps.

## Requirements

### Functional Requirements

**FR-1**: Playbook Definition and Discovery

- **FR-1.1**: System MUST load playbook definitions from YAML files in `src/playbooks/definitions/`
- **FR-1.2**: Playbook definitions MUST include:
  - Unique ID (kebab-case string)
  - Human-readable description
  - Owner role (Product Manager, Architect, Engineer)
  - Reviewer roles (required and optional)
  - Input parameters with types, validation rules, and defaults
  - Ordered list of execution steps with task types
  - Expected outputs (file paths, patterns)
- **FR-1.3**: System MUST validate playbook definition structure on load and reject invalid definitions with specific error messages
- **FR-1.4**: System MUST provide programmatic API to list all available playbooks with metadata

**FR-2**: Input Validation and Transformation

- **FR-2.1**: System MUST validate all required inputs are provided before execution begins
- **FR-2.2**: System MUST validate input types match definitions (string, number, boolean, enum)
- **FR-2.3**: System MUST apply input transformations (kebab-case, snake-case, camel-case) as specified in playbook definition
- **FR-2.4**: System MUST validate enum values match allowed values list
- **FR-2.5**: System MUST apply default values for optional inputs when not provided
- **FR-2.6**: Input validation failures MUST halt execution with error message listing missing/invalid inputs

**FR-3**: Workflow Execution

- **FR-3.1**: System MUST execute playbook steps sequentially in definition order
- **FR-3.2**: System MUST NOT allow steps to be skipped or reordered during execution
- **FR-3.3**: System MUST create execution context containing playbook definition, validated inputs, and step results
- **FR-3.4**: System MUST invoke the appropriate task executor for each step's task type
- **FR-3.5**: System MUST save execution state to `.xe/playbooks/state/{execution-id}.json` after each step completes
- **FR-3.6**: Step execution failures MUST halt workflow and preserve state for debugging
- **FR-3.7**: System MUST provide CLI command `node src/playbooks/scripts/run-playbook.js <playbook-id> [inputs...]` to execute playbooks

**FR-4**: Task Executors

- **FR-4.1**: System MUST provide markdown task executor that:
  - Reads markdown file from specified path
  - Interpolates input variables using `{{variable}}` syntax
  - Invokes AI platform SDK with markdown content as prompt
  - Streams results to console in real-time
  - Collects all AI responses for result reporting
- **FR-4.2**: System MUST provide ai-prompt task executor that:
  - Interpolates variables in prompt template
  - Invokes AI platform SDK with specified tools
  - Validates expected output files exist after execution
  - Returns success only if all outputs created
- **FR-4.3**: System MUST provide checkpoint task executor that:
  - Displays checkpoint message to user
  - Pauses execution in manual mode
  - Waits for ENTER key press to continue
  - Auto-approves in autonomous mode
- **FR-4.4**: System MUST provide sub-playbook task executor that:
  - Invokes engine recursively with child playbook ID
  - Passes mapped inputs to child playbook
  - Returns child playbook result to parent execution
- **FR-4.5**: Task executors MUST implement common `TaskExecutor` interface with `execute(step, context)` method
- **FR-4.6**: System MUST allow registration of new task executors without modifying engine code

**FR-5**: AI Platform Integration

- **FR-5.1**: System MUST support multiple AI platform providers via adapter pattern
- **FR-5.2**: System MUST provide adapter for Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`)
  - Uses `claude-sonnet-4-5` model
  - Authenticates with Claude Pro/Max subscription
- **FR-5.3**: System MUST provide adapter for GitHub Copilot (future)
- **FR-5.4**: System MUST grant tools `['Read', 'Write', 'Bash', 'Grep', 'Glob']` to all AI invocations
- **FR-5.5**: System MUST set working directory to current project directory
- **FR-5.6**: System MUST stream AI responses as async iterator
- **FR-5.7**: System MUST provide clear error message if AI platform SDK is not configured or user not authenticated
- **FR-5.8**: Playbook definitions MUST NOT specify AI platform - engine determines from environment

**FR-6**: Human-in-the-Loop Checkpoints

- **FR-6.1**: Steps marked with `checkpoint: true` MUST pause execution in manual mode
- **FR-6.2**: System MUST display checkpoint message and wait for explicit user approval
- **FR-6.3**: System MUST auto-approve checkpoints when `execution-mode: autonomous`
- **FR-6.4**: System MUST save state before each checkpoint, enabling resume if process interrupted
- **FR-6.5**: Checkpoint approval mechanism MUST be ENTER key press in CLI (GitHub issue integration deferred)

**FR-7**: State Management and Resume

- **FR-7.1**: System MUST save execution state JSON to `.xe/playbooks/state/` after each step
- **FR-7.2**: Execution state MUST include:
  - Playbook ID and execution ID (UUID)
  - Start time and current step index
  - Validated inputs and all step results
  - Execution status (running, paused, completed, failed)
- **FR-7.3**: System MUST provide `resume` command to continue from saved state
- **FR-7.4**: System MUST skip already-completed steps when resuming
- **FR-7.5**: System MUST validate saved state structure before resuming
- **FR-7.6**: Corrupted state files MUST result in clear error with recovery instructions

**FR-8**: Output Validation

- **FR-8.1**: System MUST validate all playbook-defined outputs exist after execution completes
- **FR-8.2**: Missing outputs MUST fail the playbook with error listing missing files
- **FR-8.3**: Output paths MUST support variable interpolation using `{{variable}}` syntax
- **FR-8.4**: System MUST allow optional custom validation via TypeScript verify function

**FR-9**: Playbook Composition

- **FR-9.1**: Playbooks MUST support `sub-playbook` task type for composing workflows
- **FR-9.2**: Sub-playbook execution MUST be isolated - child cannot modify parent context
- **FR-9.3**: Sub-playbook inputs MUST be explicitly mapped from parent playbook variables
- **FR-9.4**: Sub-playbook failures MUST propagate to parent and halt execution
- **FR-9.5**: System MUST detect circular playbook references and fail with error

**FR-10**: Multi-Platform Support

- **FR-10.1**: Playbook definitions MUST be AI platform agnostic (no Claude-specific or Copilot-specific syntax)
- **FR-10.2**: System MUST auto-detect available AI platform from environment
- **FR-10.3**: System MUST support adding new AI platform adapters without modifying engine code
- **FR-10.4**: AI platform adapters MUST implement common interface: `invoke(prompt, tools, options) → AsyncIterator<Message>`

### Non-functional requirements

- **NFR-1**: Cost & usage efficiency
  - **NFR-1.1**: Execution state MUST be minimal JSON, not duplicating large file contents
  - **NFR-1.2**: Resume MUST skip re-executing completed steps to avoid redundant AI invocations
  - **NFR-1.3**: Claude invocations MUST stream results to avoid memory buffer overflow on long responses

- **NFR-2**: Reliability
  - **NFR-2.1**: Engine MUST handle AI platform SDK errors gracefully with retry logic (3 attempts, exponential backoff)
  - **NFR-2.2**: State files MUST be written atomically (write to temp, then rename) to prevent corruption
  - **NFR-2.3**: Playbook validation MUST catch all structural errors before execution begins
  - **NFR-2.4**: Circular dependency detection MUST prevent infinite recursion in sub-playbook execution

- **NFR-3**: Performance
  - **NFR-3.1**: Playbook definition loading MUST complete in <100ms for 20 playbooks
  - **NFR-3.2**: State save operations MUST complete in <50ms
  - **NFR-3.3**: Engine overhead (non-AI invocation time) MUST be <5% of total execution time

- **NFR-4**: Observability
  - **NFR-4.1**: System MUST log each step start with timestamp and step ID
  - **NFR-4.2**: System MUST log each step completion with duration and success/failure status
  - **NFR-4.3**: System MUST provide execution summary showing step durations and total time
  - **NFR-4.4**: Checkpoint pauses MUST log clear message indicating waiting for user input

- **NFR-5**: Testability
  - **NFR-5.1**: AI platform SDK calls MUST be abstracted behind interface for test mocking
  - **NFR-5.2**: File system operations MUST be abstracted for test mocking
  - **NFR-5.3**: 90% code coverage across engine, executors, and state manager
  - **NFR-5.4**: 100% coverage for critical paths: input validation, step execution, state persistence

- **NFR-6**: Extensibility
  - **NFR-6.1**: New task executor types MUST be addable without modifying engine code
  - **NFR-6.2**: New AI platform adapters MUST be addable without modifying engine code
  - **NFR-6.3**: Playbook YAML schema MUST be versioned to support future migrations

## Key Entities

Entities owned by this feature:

- **PlaybookDefinition**: YAML structure defining workflow metadata, inputs, steps, and outputs
  - Attributes: id, description, owner, reviewers, inputs, steps, outputs
  - Location: `src/playbooks/definitions/*.yaml`

- **ExecutionContext**: Runtime state container for single playbook execution
  - Attributes: executionId, playbook, inputs, stepResults, currentStepIndex, status
  - Lifecycle: Created at execution start, updated after each step, persisted to JSON

- **TaskExecutor**: Interface for step execution strategies
  - Methods: execute(step, context) → TaskResult
  - Implementations: MarkdownTaskExecutor, AIPromptTaskExecutor, CheckpointTaskExecutor, SubPlaybookTaskExecutor

- **AIAdapter**: Interface for AI platform integration
  - Methods: invoke(prompt, tools, options) → AsyncIterator<Message>
  - Implementations: ClaudeAdapter, CopilotAdapter (future)

- **ExecutionState**: Persistent snapshot of execution progress
  - Attributes: playbookId, startTime, currentStep, inputs, stepResults, status
  - Location: `.xe/playbooks/state/{execution-id}.json`

- **TaskResult**: Outcome of single step execution
  - Attributes: success, messages, outputs, errors

Entities from other features:

- **GitHub Issue** (github-integration): Issue tracking and PR management
  - Used for: Future checkpoint integration (post-MVP)

Inputs:

- **Playbook YAML Definition**:
  - Format: YAML with strict schema (validated on load)
  - Location: `src/playbooks/definitions/*.yaml`
  - Schema: See FR-1.2 for required fields

- **Execution Inputs**:
  - Format: CLI arguments or JavaScript object
  - Types: string, number, boolean, enum (as defined in playbook)
  - Validation: Applied per playbook input definitions

- **Execution Mode**:
  - Values: "manual" (default) or "autonomous"
  - Impact: Controls checkpoint auto-approval behavior

- **User Environment**:
  - AI platform authenticated (Claude Pro/Max, GitHub Copilot, etc.)
  - Node.js >= 18 installed
  - Working directory is Catalyst project root

Outputs:

- **Execution Logs**:
  - Format: Console output with timestamps and step indicators
  - Content: Step start/end, durations, checkpoint messages, errors

- **Execution State Files**:
  - Format: JSON in `.xe/playbooks/state/{execution-id}.json`
  - Content: Full execution context for resume capability
  - Retention: Manual cleanup (no auto-deletion in MVP)

- **Playbook Outputs**:
  - Format: Files specified in playbook definition (markdown, YAML, TypeScript, etc.)
  - Validation: Existence checked after execution
  - Examples: `.xe/features/{feature-id}/spec.md`, `.xe/rollouts/rollout-{id}.md`

- **Exit Codes**:
  - 0: Success (all steps completed)
  - 1: Validation error (inputs, playbook definition)
  - 2: Execution error (step failed, Claude SDK error)
  - 3: State error (corrupted state, resume failed)

## Dependencies

**Internal Dependencies:**

- **product-context** (T001): Provides product vision and strategy for playbook content
- **engineering-context** (T002): Provides technical patterns and principles for validation
- **feature-context** (T003): Provides feature spec templates used by playbooks
- **github-integration** (T004): Provides GitHub scripts for issue/PR operations (parallel development, coordinate interfaces)

**External Dependencies:**

- **AI Platform SDKs** (one or more):
  - Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`): Programmatic Claude invocation
  - GitHub Copilot SDK (future): Programmatic Copilot invocation
  - Authentication: User's AI platform subscription/credentials
  - Risk: SDKs may change; mitigation via adapter abstraction layer

- **YAML Parser** (`js-yaml`):
  - Purpose: Parse playbook definitions
  - Version: Latest stable
  - Alternative: Built-in JSON if YAML proves problematic

- **Node.js >= 18**:
  - Purpose: Native TypeScript support, modern async/await
  - Justification: Required for project

**Setup Prerequisites:**

- User must have at least one AI platform authenticated (Claude Pro/Max, GitHub Copilot, etc.)
- Project must be initialized with `.xe/` directory structure
- Git repository (for state file management)

**Integration Points:**

- **Slash Commands** (AI platform integrations):
  - Commands like `/catalyst:run` should route to playbook engine
  - Platform-agnostic interface required

- **GitHub Scripts** (github-integration feature):
  - Used by playbooks for issue/PR operations
  - Shared utility functions for issue/PR management

**Future Phase Dependencies:**

- **autonomous-orchestration** (Phase 2): Will extend engine with GitHub webhook triggers
- **custom-playbooks** (Phase 4): Will use engine for user-defined workflows
