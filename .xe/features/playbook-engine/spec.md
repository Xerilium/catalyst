---
id: playbook-engine
title: Playbook Engine
author: "@flanakin"
description: "TypeScript-based workflow execution engine that enables reliable, composable playbook orchestration through programmatic AI invocation and structured task execution"
dependencies:
  - error-handling
  - github-integration
---

<!-- markdownlint-disable single-title -->

# Feature: Playbook Engine

## Problem

AI-driven workflows need enforcement mechanisms to ensure steps are followed correctly, support reliable pause and resume, and enable composition into smaller, reviewable units. Without these capabilities, achieving consistent, high-quality code generation at scale is difficult, and complex workflows cannot be broken into manageable, PR-sized chunks.

## Goals

- Enable programmatic execution of workflows with guaranteed step-by-step progression
- Enable workflow composition by breaking large playbooks into smaller, independently executable units
- Provide state management for pause/resume capability across workflow executions
- Ensure human checkpoints are reliably enforced at critical decision points
- Validate workflow outputs exist and meet quality standards
- Support gradual migration from markdown-based to structured workflows

Explicit non-goals:

- Full autonomous execution without human checkpoints (Phase 2: autonomous-orchestration)
- Real-time workflow monitoring and dashboards (defer until needed)
- Workflow versioning (defer until needed)
- Multi-repository workflow orchestration (Phase 5: multi-repository-management)
- Custom playbook SDK for third-party developers (Phase 4: custom-playbooks)

## Scenario

- As a **Product Manager**, I need playbooks to execute reliably without skipping critical validation steps
  - Outcome: Every playbook execution validates engineering principles and runs all tests, measurable by zero skipped validation steps in execution logs

- As an **Architect**, I need to break multi-phase initiatives into independent phases (research, spec, plan, implementation, documentation) that each create their own PR
  - Outcome: a multi-phase orchestrator can be decomposed into 4+ independent playbooks, each producing a separate PR for focused review

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
- Multi-phase workflows can be decomposed into research → spec → plan → implement → document playbooks
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

- **FR-1.1**: System MUST discover playbook YAML files by location (no registry)
- **FR-1.2**: Playbook definitions MUST include:
  - Unique ID (kebab-case string)
  - Human-readable description
  - Owner role (Product Manager, Architect, Engineer)
  - Required reviewer roles
  - Optional reviewer roles
  - Input parameters with types, validation rules, and defaults
  - Ordered list of execution steps with task types
  - Expected outputs (file paths, patterns)
- **FR-1.3**: System MUST validate playbook definition structure on load and reject invalid definitions with specific error messages
- **FR-1.4**: System MUST provide programmatic API to list all available playbooks with metadata
 - **FR-1.5**: Playbook definitions MUST be authored in YAML (UTF-8) and conform to the canonical playbook YAML schema. The loader MUST reject non-YAML formats or YAML that does not match the schema and return a clear validation error to the user.

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
- **FR-3.5**: System MUST save execution state to a run JSON snapshot (`.xe/runs/run-{runId}.json`) after each step completes. Completed runs MUST be archived to `.xe/runs/history/{YYYY}/{MM}/{DD}/` to avoid littering working source files.
- **FR-3.6**: Step execution failures MUST halt workflow and preserve state for debugging
- **FR-3.7**: System MUST provide a CLI command for running playbooks. Reference CLI (user-facing) SHALL be `catalyst-playbook run <playbook-name> [inputs...]`. Implementations MAY provide an executable script under `src/playbooks/scripts/` (for example `run-playbook.js`) for backwards compatibility, but the user-facing command must match the reference above.

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
- **FR-4.3**: System MUST provide branch task executor that:
  - Creates or switches to a branch
  - Includes an option to require a new branch (and not select an existing branch)
- **FR-4.4**: System MUST provide commit task executor that:
  - Commits and pushes only the specified file patterns
  - Includes a commit message and array of file patterns
  - Includes an optional boolean flag to only commit (and not push; defaults to false)
  - Includes an optional boolean flag to not pull first (defaults to false)
- **FR-4.5**: System MUST provide checkpoint task executor that:
  - Displays checkpoint message to user
  - Pauses execution in manual mode
  - Waits for ENTER key press to continue
  - Auto-approves in autonomous mode
- **FR-4.6**: System MUST provide PR task executor that:
  - Starts a pull request
  - Includes an option to pause execution
- **FR-4.7**: System MUST provide issue task executor that:
  - Creates a new GitHub issue
  - Includes options for the issue title and body
  - Includes an option to assign it to a user
- **FR-4.8**: System MUST provide playbook task executor that:
  - Invokes engine recursively with child playbook ID
  - Passes mapped inputs to child playbook
  - Returns child playbook result to parent execution
- **FR-4.9**: Task executors MUST implement common `TaskExecutor` interface 
  - Includes a `execute(step, context)` method to run the task
  - Includes optional settings that can be set by playbooks when including tasks:
    - `name` string for reference in logs
    - `condition` boolean indicates whether to run the task (default = true)
  - Task executors MUST support a configurable per-step error-handling policy (for example: `fail`, `retry:N`, `continue`, or `ignore`). Executors performing remote or side-effecting work (AI calls, file writes, network calls) MUST implement retry semantics where applicable and surface failure metadata to the engine for logging and run-state capture.
- **FR-4.10**: System MUST allow registration of new task executors without modifying engine code
- **FR-4.11**: System MUST support structured per-step error-handling policy maps keyed by error code
  - `errorPolicy` for a step MUST be allowed in one of two shapes:
    1. A single string policy value (examples: `fail`, `continue`, `ignore`, `retry:3`) which acts as the default for the step.
    2. An object mapping error codes (strings) to policy values, with an optional `default` key used when no mapped code matches. Example:
       ```yaml
       errorPolicy:
         "CATA-IO-001": retry:3
         "CATA-AI-429": retry:5
         default: fail
       ```
  - Task executors MUST evaluate errors using the error `code` field (see `CatalystError`) and apply the mapped policy when present; when an error code is not mapped, the executor MUST apply the `default` policy if present, otherwise fall back to the engine-level default (`fail`).
  - Task executors and the engine MUST record structured failure metadata in run snapshots and logs using at minimum the shape `{ code: string, message: string, guidance?: string, cause?: any }` so that policy lookups are deterministic and auditable.
  - This error-code mapping mechanism MUST be supported by all task executor types, including nested playbook invocation, AI calls, and any remote or side-effecting tasks. This enables per-step try/catch-like behavior via declarative policies.

**FR-5**: AI Platform Integration

- **FR-5.1**: System MUST support AI platform integration via an adapter pattern (provider-specific adapters are pluggable)
- **FR-5.2**: For the initial implementation the engine MUST use a MockAIAdapter (tests and MVP). Provider adapters (e.g., Claude, Copilot) are out-of-scope and will be added in separate features.
- **FR-5.3**: Adapter contract MUST provide a streaming invoke API: `invoke(prompt, tools?, options?) → AsyncIterator<Message>`
- **FR-5.4**: The engine MUST NOT assume permissive tool grants by default. Tool scopes are configurable per-execution and per-step. The default tool scope for AI invocations MUST be minimal (read-only). Any step requesting elevated privileges (Write, Bash) MUST require explicit opt-in in the playbook and additional human approval in manual mode.
- **FR-5.5**: System MUST set working directory to the current project directory (by default) and allow adapters to override via options
- **FR-5.6**: System MUST provide clear errors if no adapter is configured; tests MUST run with the MockAIAdapter so CI does not require external credentials
- **FR-5.7**: Playbook definitions MUST NOT hard-code provider-specific syntax; adapters are chosen by environment or engine configuration

**FR-6**: Human-in-the-Loop Checkpoints

- **FR-6.1**: Steps marked with `checkpoint: true` MUST pause execution in manual mode
- **FR-6.2**: System MUST display checkpoint message and wait for explicit user approval
- **FR-6.3**: System MUST auto-approve checkpoints when `execution-mode: autonomous`
- **FR-6.4**: System MUST save state before each checkpoint, enabling resume if process interrupted
- **FR-6.5**: Checkpoint approval mechanism MUST be ENTER key press in CLI (GitHub issue integration deferred)

**FR-7**: State Management and Resume

- **FR-7.1**: System MUST save execution state to a run JSON snapshot (`.xe/runs/run-{runId}.json`) after each step.
- **FR-7.2**: Execution state MUST include:
  - Playbook ID and runId (friendly identifier containing date/time and a 3-digit index)
  - Start time and current step index
  - Validated inputs and all step results
  - Execution status (running, paused, completed, failed)
  - Feature context
- **FR-7.3**: System MUST provide a `resume` command to continue execution from a saved run snapshot (e.g. `.xe/runs/run-{runId}.json`).
- **FR-7.4**: System MUST skip already-completed steps when resuming
- **FR-7.5**: System MUST validate saved state structure before resuming
- **FR-7.6**: Corrupted state files MUST result in clear error with recovery instructions
- **FR-7.7**: System MUST ensure archived run snapshots under `.xe/runs/history/` are ignored by the repository (via `.gitignore`)

**FR-8**: Output Validation

- **FR-8.1**: System MUST validate all playbook-defined outputs exist after execution completes
- **FR-8.2**: Missing outputs MUST fail the playbook with error listing missing files
- **FR-8.3**: Output paths MUST support variable interpolation using `{{variable}}` syntax
- **FR-8.4**: System MUST allow optional custom validation via TypeScript verify function

**FR-9**: Playbook Composition

- **FR-9.1**: Playbooks MUST support `playbook` task type for composing workflows
- **FR-9.2**: Child playbook execution MUST be isolated - child cannot modify parent context
- **FR-9.3**: Child playbook inputs MUST be explicitly mapped from parent playbook variables
- **FR-9.4**: Child playbook failures MUST propagate to the parent and halt execution by default. A step MAY override this behavior with an explicit error-handling policy (see executor requirements) such as `continue-on-error`, `retry`, or `ignore`. Error policies MAY be specified as mappings keyed by error `code` so a step can express try/catch-like behavior for specific failure classes; the engine MUST record structured failure metadata in the run snapshot and expose it in logs to enable deterministic policy matching.
- **FR-9.5**: System MUST detect circular playbook references and prevent infinite recursion. Self-invocation is permitted when safe, but the engine MUST enforce a configurable recursion depth limit (default: 10) and fail with a clear error if exceeded.

**FR-10**: Multi-Platform Support

- **FR-10.1**: Playbook definitions MUST be AI platform agnostic (no Claude-specific or Copilot-specific syntax)
- **FR-10.2**: System MUST auto-detect available AI platform from environment
- **FR-10.3**: System MUST support adding new AI platform adapters without modifying engine code
- **FR-10.4**: AI platform adapters MUST implement common interface: `invoke(prompt, tools, options) → AsyncIterator<Message>`

### Non-functional requirements

- **NFR-1**: Cost & usage efficiency
  - **NFR-1.1**: Execution state MUST be minimal JSON, not duplicating large file contents
  - **NFR-1.2**: Resume MUST skip re-executing completed steps to avoid redundant AI invocations
  - **NFR-1.3**: AI invocations MUST stream results to avoid memory buffer overflow on long responses
  - **NFR-1.4**: The engine SHOULD provide an optional caching layer for idempotent task executions so that identical inputs can reuse previous results to reduce cost and latency. Cache behavior MUST be opt-in and respect privacy/security constraints.

- **NFR-2**: Reliability
  - **NFR-2.1**: Engine MUST handle AI platform SDK errors gracefully with retry logic (3 attempts, exponential backoff)
  - **NFR-2.2**: State files MUST be written atomically (write to temp, then rename) to prevent corruption
  - **NFR-2.3**: Playbook validation MUST catch all structural errors before execution begins
  - **NFR-2.4**: Circular dependency detection MUST prevent infinite recursion in nested playbook execution

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
  - Location: `src/playbooks/*.yaml`

- **ExecutionContext**: Runtime state container for single playbook execution
  - Attributes: playbook, inputs, stepResults, currentStepIndex, status
  - Lifecycle: Created at execution start, updated after each step, persisted to JSON

- **TaskExecutor**: Interface for step execution strategies
  - Methods: execute(step, context) → TaskResult
  - Notes: Playbooks themselves SHOULD be able to implement the same `TaskExecutor` (an `ITask`-like interface) so that a playbook can be treated as a task (composite/leaf node). This makes error handling and lifecycle consistent whether running a leaf task or invoking a child playbook. The engine may call into a task's `execute` implementation which, for AI-backed tasks, will typically delegate to an `AIAdapter.invoke(...)` call.
  - Implementations: MarkdownTaskExecutor, AIPromptTaskExecutor, CheckpointTaskExecutor, SubPlaybookTaskExecutor

- **AIAdapter**: Interface for AI platform integration
  - Methods: invoke(prompt, tools, options) → AsyncIterator<Message>
  - Implementations: provider-specific adapters (e.g., ClaudeAdapter, CopilotAdapter) will be added in future features

- **ExecutionState**: Persistent snapshot of execution progress
  - Attributes: playbookId, startTime, currentStep, inputs, stepResults, status
  - Location: `.xe/runs/run-{runId}.json` (live); archived copies are stored under `.xe/runs/history/{YYYY}/{MM}/{DD}/`.

- **TaskResult**: Outcome of single step execution
  - Attributes: success, messages, outputs, errors

NOTE: For the short-term code layout, TypeScript runtime helpers and error definitions (including any new error code constants) are expected to live under `src/playbooks/scripts/errors`. This is a temporary/consistent placement while the repository stabilizes; a later refactor will consolidate runtime TS into `src/ts/` as agreed in the roadmap.

Entities from other features:

- **CatalystError** (error-handling): Base error class with code, guidance, and cause chaining
  - Used for: All playbook engine errors
- **GitHub Issue** (github-integration): Issue tracking and PR management
  - Used for: Future checkpoint integration (post-MVP)

Inputs:

- **Playbook YAML Definition**:
  - Format: YAML with strict schema (validated on load)
  - Location: `src/playbooks/*.yaml`
  - Schema: See FR-1.2 for required fields

- **Execution Inputs**:
  - Format: CLI arguments or JavaScript object
  - Types: string, number, boolean, enum (as defined in playbook)
  - Validation: Applied per playbook input definitions

- **Execution Mode**:
  - Values: "manual" (default) or "autonomous"
  - Impact: Controls checkpoint auto-approval behavior

- **User Environment**:
  - AI platform authenticated (provider adapters may require provider credentials; the MVP uses MockAIAdapter so no provider authentication is required)
  - Node.js >= 18 installed
  - Working directory is Catalyst project root

Outputs:

- **Execution Logs**:
  - Format: Console output with timestamps and step indicators
  - Content: Step start/end, durations, checkpoint messages, errors

- **Execution State Files**:
  - Format: JSON in `.xe/runs/run-{runId}.json` (live snapshot); completed runs archived to `.xe/runs/history/{YYYY}/{MM}/{DD}/`.
  - Content: Full execution context for resume capability
  - Retention: Persistent (for audit and resume)

- **Playbook Outputs**:
  - Format: Files specified in playbook definition (markdown, YAML, TypeScript, etc.)
  - Validation: Existence checked after execution
  - Examples: `.xe/features/{feature-id}/spec.md`, `.xe/runs/run-2025-11-14-1530_claude-general_do-something_001.json`

- **Exit Codes**:
  - 0: Success (all steps completed)
  - 1: Validation error (inputs, playbook definition)
  - 2: Execution error (step failed, AI adapter error)
  - 3: State error (corrupted state, resume failed)

## Dependencies

**Internal Dependencies:**

- **error-handling** (Tier 1.1): Provides CatalystError base class and specialized error types for consistent error handling across all engine operations

**External Dependencies:**

- No provider SDKs are required for the MVP. The engine will depend only on generic libraries (YAML parsing, testing). Provider SDKs (Claude, Copilot) will be integrated in later features via adapters.

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
