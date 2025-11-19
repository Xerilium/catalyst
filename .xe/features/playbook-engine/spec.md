---
id: playbook-engine
title: Playbook Engine
author: "@flanakin"
description: "TypeScript-based workflow execution engine that enables reliable, composable playbook orchestration through programmatic AI invocation and structured action execution"
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

- As a **Developer**, I need AI prompt actions to support both inline and file-based prompts
  - Outcome: Playbooks can be defined as pure markdown files and executed by the engine

- As a **Framework Developer**, I need to add new workflow capabilities (bash commands, HTTP calls) without modifying core engine
  - Outcome: New actions can be added as independent modules without changing engine code

## Success Criteria

- Markdown playbooks can be executed as a first-class action type via the engine
- Playbook execution enforces sequential step progression - cannot skip steps or reorder execution
- Checkpoints block execution until explicit human approval in manual mode
- State is persisted after each step, enabling resume from last completed step
- Multi-phase workflows can be decomposed into research → spec → plan → implement → document playbooks
- 90% code coverage across engine, actions, and state management
- Execution logs show clear visibility into which step is running, results, and validation status
- Failed playbooks provide actionable error messages indicating which step failed and why

## Design principles

**Extensibility through composition, not modification**
> New capabilities are added via new action types, not by changing the engine. Actions register with the engine and implement a common interface. This ensures the engine remains stable while workflow capabilities expand.

**Explicit over implicit**
> Workflow behavior must be explicitly defined in playbook YAML. No hidden defaults, no magic behavior. Every step, input, output, and checkpoint is visible in the definition. This makes workflows auditable and debuggable.

**Fail fast with clear guidance**
> Validation errors stop execution immediately with specific, actionable error messages. Never silently continue or guess intent. Messages include the exact requirement violated and how to fix it.

**AI prompt as a first-class action type**
> AI prompt actions are a first-class action type, supporting both inline templates and file-based prompts (markdown/YAML). This enables human/AI-readable workflows that can be executed programmatically, combining the best of both declarative and natural language approaches.

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
  - Ordered list of execution steps with action types
  - Expected outputs (file paths, patterns)
- **FR-1.3**: System MUST validate playbook definition structure on load and reject invalid definitions with specific error messages
- **FR-1.4**: System MUST provide programmatic API to list all available playbooks with metadata
- **FR-1.5**: Playbook definitions MUST be authored in YAML (UTF-8) and conform to the canonical playbook YAML schema. The loader MUST reject non-YAML formats or YAML that does not match the schema and return a clear validation error to the user

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
- **FR-3.4**: System MUST invoke the appropriate action for each step's action type
- **FR-3.5**: System MUST save execution state to a run JSON snapshot (`.xe/runs/run-{runId}.json`) after each step completes. Completed runs MUST be archived to `.xe/runs/history/{YYYY}/{MM}/{DD}/` to avoid littering working source files
- **FR-3.6**: Step execution failures MUST halt workflow and preserve state for debugging
- **FR-3.7**: System MUST provide a CLI command for running playbooks. Reference CLI (user-facing) SHALL be `catalyst-playbook run <playbook-name> [inputs...]`
- **FR-3.8**: System MUST enforce write permissions and path restrictions for steps that write files
  - **FR-3.8.1**: Commits and file writes MUST be limited to declared output paths and explicitly allowed path patterns for the run (see FR-3.13 Pre-flight checks)
  - **FR-3.8.2**: Steps attempting to write outside allowed paths MUST fail the FR-3.13 pre-flight validation before changes are made
- **FR-3.9**: System MUST support a global run lock and per-resource locks to avoid concurrent runs writing to the same files, branches, or other shared resources
  - **FR-3.9.1**: The engine MUST detect conflicts on branch names, file paths, or repository locks and surface a clear error when a run cannot proceed due to active conflicting runs
- **FR-3.10**: System MUST support an optional `parallel` step group that allows multiple steps to run concurrently when they do not have overlapping write operations or shared resource conflicts
  - **FR-3.10.1**: The engine MUST still enforce per-resource locks when steps run concurrently
- **FR-3.11**: System MUST provide a CLI entrypoint for running playbooks (e.g., `catalyst-playbook run`)
- **FR-3.12**: System MUST simulate playbook exec with a CLI `--what-if` flag (alias `--dry-run`) without side-effects. When run, the engine MUST:
  - Validate inputs, render interpolations, and validate expected outputs and allowed write paths
  - Produce a human-readable and machine-parseable `--what-if-report` JSON containing simulated diffs, step summaries, and detected conflicts/locks
  - Skip steps that have side-effects unless an action provides a safe simulation path; read-only steps (e.g., tests, static analysis, read-only HTTP GETs) MAY run
  - Enforce RBAC, configuration validation, and detect resource conflicts but MUST NOT acquire locks or perform side-effecting operations. Slash command wrappers MUST pass a `what-if` hint to the engine to ensure identical behavior.
  - **FR-3.12.1**: The action MUST provide a summary for every skipped step indicating the reason
- **FR-3.13**: System MUST perform pre-flight validation and permission checks prior to running steps or acquiring locks, including:
  - RBAC validation for the actor and required reviewer roles
  - allowedWritePaths validation if a step requires write access
  - Branch protection and repository policy checks
  - Lock detection (conflict detection must report and prevent run start for non-what-if runs)

**FR-4**: Playbook Actions

- **FR-4.1**: System MUST provide AI prompt action that:
  - Supports prompt as inline template or file path (reads markdown/YAML file if path provided)
  - Interpolates variables in prompt template using `{{variable}}` syntax
  - Invokes AI platform SDK with specified tools
  - Validates expected output files exist after execution
  - Returns success only if all outputs created
  - Streams results to console in real-time and collects AI responses for reporting
- **FR-4.2**: System MUST provide branch action that:
  - Creates or switches to a branch
  - Includes an option to require a new branch (and not select an existing branch)
- **FR-4.3**: System MUST provide commit action that:
  - Commits and pushes only the specified file patterns
  - Includes a commit message and array of file patterns
  - Includes an optional boolean flag to only commit (and not push; defaults to false)
  - Includes an optional boolean flag to not pull first (defaults to false)
  - **FR-4.3.1**: Enforce repository branch protection rules
  - **FR-4.3.2**: Commit behavior MUST be idempotent
  - **FR-4.3.3**: The commit executor MUST detect when a prior commit already includes the same file changes and avoid creating duplicate commits on resume or re-run
  - **FR-4.3.4**: The executor SHOULD be able to provide a stable commit message and metadata to detect duplicate runs and be able to perform a no-op when commits are identical
- **FR-4.4**: System MUST provide checkpoint action that:
  - Displays checkpoint message to user
  - Pauses execution in manual mode
  - Waits for ENTER key press to continue
  - Auto-approves in autonomous mode
- **FR-4.5**: System MUST provide PR action that:
  - Starts a pull request
  - Includes an option to pause execution
- **FR-4.6**: System MUST provide issue action that:
  - Creates a new GitHub issue
  - Includes options for the issue title and body
  - Includes an option to assign it to a user
- **FR-4.7**: System MUST provide playbook action that:
  - Invokes engine recursively with child playbook ID
  - Passes mapped inputs to child playbook
  - Returns child playbook result to parent execution
- **FR-4.8**: Playbook actions MUST implement common `PlaybookAction` interface 
  - Includes a `execute(step, context)` method to run the action
  - Includes optional settings that can be set by playbooks when including actions:
    - `name` string for reference in logs
    - `condition` boolean indicates whether to run the action (default = true)
  - **FR-4.8.1**: Actions MUST support configurable per-step error-handling policies using the `ErrorPolicy` interface from the error-handling feature
  - **FR-4.8.2**: Playbook actions performing remote or side-effecting work (AI calls, file writes, HTTP mutating calls such as POST/PUT/PATCH, and HTTP DELETE calls) MUST implement retry semantics where applicable and surface failure metadata to the engine for logging and run-state capture
- **FR-4.9**: System MUST allow registration of new actions without modifying engine code
- **FR-4.10**: System MUST support structured per-step error-handling policies using ErrorPolicy from error-handling feature
  - The `errorPolicy` for a step MUST use the `ErrorPolicy` interface which supports a dictionary with required `default: ErrorPolicyAction` and optional per-code overrides
  - Each `ErrorPolicyAction` specifies `action: ErrorAction` and optional `retryCount?: number`
  - Error codes MUST be Pascal-cased identifiers matching CatalystError codes
  - Playbook actions MUST evaluate an error's `code` field and apply the mapped action; when unmapped, apply the `default` policy
  - The engine and actions MUST record structured failure metadata using `CatalystError` for deterministic policy lookups and auditability
  - This error-code mapping mechanism MUST be supported by all action types
- **FR-4.13**: System MUST provide a command (bash) action that:
  - Runs shell commands with configurable environment variables
  - Supports working directory selection and timeouts
  - Returns success only if the command exits with a 0 status code
  - Streams command stdout/stderr to execution logs and captures the exit code for error policy mapping
- **FR-4.14**: System MUST provide an HTTP action that:
  - Performs HTTP requests with configurable headers, method, body, timeouts, and retries
  - Validates HTTP response status codes and optional JSON schema validation on response bodies
  - Supports secrets in headers and body via secret providers
- **FR-4.15**: System MUST provide a test action that:
  - Executes project test command(s) (e.g., `npm test`, `yarn test`, `pnpm test`, or a specified script)
  - Validates exit code is 0 and captures test report file paths as outputs when present
  - Optionally aggregates test coverage results and fails run if thresholds are not met
- **FR-4.16**: System MUST support per-step configurable timeouts and watchdogs
  - **FR-4.16.1**: If a step exceeds its configured timeout, the engine MUST apply the configured ErrorPolicy and provide a clear timeout error code and time metrics in the run snapshot
- **FR-4.18**: The engine MUST provide a central `executeIfAllowed(step, runMode, actor, callback)` helper that executes a user-supplied `callback` only if authorization checks pass
- **FR-4.10**: System MUST allow registration of new actions without modifying engine code
- **FR-4.11**: System MUST support structured per-step error-handling policies using ErrorPolicy from error-handling feature
  - The `errorPolicy` for a step MUST use the `ErrorPolicy` interface which supports a dictionary with required `default: ErrorPolicyAction` and optional per-code overrides
  - Each `ErrorPolicyAction` specifies `action: ErrorAction` and optional `retryCount?: number`
  - Error codes MUST be Pascal-cased identifiers matching CatalystError codes
  - Playbook actions MUST evaluate an error's `code` field and apply the mapped action; when unmapped, apply the `default` policy
  - The engine and actions MUST record structured failure metadata using `CatalystError` for deterministic policy lookups and auditability
  - This error-code mapping mechanism MUST be supported by all action types
- **FR-4.14**: System MUST provide a command (bash) action that:
  - Runs shell commands with configurable environment variables
  - Supports working directory selection and timeouts
  - Returns success only if the command exits with a 0 status code
  - Streams command stdout/stderr to execution logs and captures the exit code for error policy mapping
- **FR-4.15**: System MUST provide an HTTP action that:
  - Performs HTTP requests with configurable headers, method, body, timeouts, and retries
  - Validates HTTP response status codes and optional JSON schema validation on response bodies
  - Supports secrets in headers and body via secret providers
- **FR-4.16**: System MUST provide a test action that:
  - Executes project test command(s) (e.g., `npm test`, `yarn test`, `pnpm test`, or a specified script)
  - Validates exit code is 0 and captures test report file paths as outputs when present
  - Optionally aggregates test coverage results and fails run if thresholds are not met
- **FR-4.17**: System MUST support per-step configurable timeouts and watchdogs
  - **FR-4.17.1**: If a step exceeds its configured timeout, the engine MUST apply the configured ErrorPolicy and provide a clear timeout error code and time metrics in the run snapshot
- **FR-4.19**: The engine MUST provide a central `executeIfAllowed(step, runMode, actor, callback)` helper that executes a user-supplied `callback` only if authorization checks pass
  - Returns `{ result?, skipped?: boolean, reason?: string }`; centralizes pre-flight validation, lock acquisition, privileged API calls, and cleanup
  - In `what-if` mode, skips side-effects; accepts optional `simulateFn` for simulation reports
  - Privileged APIs (writes, commits, HTTP mutating) MUST only be callable within the callback

**FR-5**: AI Platform Integration

- **FR-5.1**: System MUST support AI platform integration via an adapter pattern (provider-specific adapters are pluggable)
- **FR-5.2**: For the initial implementation the engine MUST use a MockAIAdapter (tests and MVP)
- **FR-5.3**: Adapter contract MUST provide a streaming invoke API: `invoke(prompt, tools?, options?) → AsyncIterator<Message>`
- **FR-5.4**: The engine MUST NOT assume permissive tool grants by default. Tool scopes are configurable per-execution and per-step. The default tool scope for AI invocations MUST be minimal (read-only). Any step that performs write operations or runs shell commands that modify state MUST require explicit opt-in in the playbook and additional human approval in manual mode.
- **FR-5.5**: System MUST set working directory to the current project directory (by default) and allow adapters to override via options
- **FR-5.6**: System MUST provide clear errors if no adapter is configured; tests MUST run with the MockAIAdapter so CI does not require external credentials
- **FR-5.7**: Playbook definitions MUST NOT hard-code provider-specific syntax; adapters are chosen by environment or engine configuration
- **FR-5.8**: For auditability, the engine MUST persist the AI prompts submitted to adapters and the streamed responses into the run snapshot, with secrets redacted according to NFR-7.6
  - **FR-5.8.1**: Prompt and response retention should be configurable to avoid unnecessary data retention.
- **FR-5.9**: System MUST NOT invoke configured remote AI adapters when the `--what-if` (alias `--dry-run`) option is used

**FR-6**: Human-in-the-Loop Checkpoints

- **FR-6.1**: Steps marked with `checkpoint: true` MUST pause execution in manual mode
- **FR-6.2**: System MUST display checkpoint message and wait for explicit user approval
- **FR-6.3**: System MUST auto-approve checkpoints when `execution-mode: autonomous`
- **FR-6.4**: System MUST save state before each checkpoint, enabling resume if process interrupted
- **FR-6.5**: Checkpoint approval mechanism MUST be ENTER key press in CLI (GitHub issue integration deferred)
- **FR-6.6**: Checkpoint approvals initiated via non-CLI integrations (e.g., GitHub PR approvals, automation webhooks) MUST map to the same approval semantics and be auditable in the run snapshot (who approved, when, and the rationale)
  - **FR-6.6.1**: The engine must ignore failsafe approvals that do not match the required owner/reviewer role in FR-1.2
- **FR-6.7**: Engine MUST interpret GitHub PR review actions:
  - `approve` maps to checkpoint approval
  - `request changes` maps to pause or stop according to the step's ErrorPolicy
  - `comment` must be recorded but not advance the checkpoint
  - **FR-6.7.1**: Approval semantics must respect the reviewer role configured in the playbook and require at least one required reviewer approval before a checkpoint proceeds

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
- **FR-7.8**: System MUST support a cancellation mechanism for running playbooks
  - **FR-7.8.1**: A cancellation MUST leave the run snapshot in a cancel state
  - **FR-7.8.2**: Cancellation should be auditable and indicate traceable reason metadata
- **FR-7.9**: System MUST support run pruning and retention configuration
  - **FR-7.9.1**: Administrators MUST be able to configure how long run snapshots are retained in `.xe/runs/` and archives (e.g., 30/90/365 days)
  - **FR-7.9.2**: The engine MUST provide an operation for archiving and pruning old run data for audits and must support exporting run snapshots for regulatory compliance

**FR-8**: Output Validation

- **FR-8.1**: System MUST validate all playbook-defined outputs exist after execution completes
- **FR-8.2**: Missing outputs MUST fail the playbook with error listing missing files
- **FR-8.3**: Output paths MUST support variable interpolation using `{{variable}}` syntax
- **FR-8.4**: System MUST allow optional custom validation via TypeScript verify function
- **FR-8.5**: If playbook outputs include code or test artifacts, the engine MUST execute a `test` action to validate the code and ensure tests pass and optional coverage thresholds are met. If tests fail the run MUST fail with actionable guidance.

**FR-9**: Playbook Composition

- **FR-9.1**: Playbooks MUST support `playbook` action type for composing workflows
- **FR-9.2**: Child playbook execution MUST be isolated - child cannot modify parent context
- **FR-9.3**: Child playbook inputs MUST be explicitly mapped from parent playbook variables
- **FR-9.4**: Child playbook failures SHOULD propagate to the parent and halt execution by default. A step MAY override this behavior with an explicit ErrorPolicy (see FR-4.11).
  - **FR-9.4.1**: The engine MUST record structured failure metadata in the run snapshot and expose it in logs to enable deterministic policy matching.
- **FR-9.5**: System MUST detect circular playbook references and prevent infinite recursion. Self-invocation is permitted when safe, but the engine MUST enforce a configurable recursion depth limit (default: 10) and fail with a clear error if exceeded.
- **FR-9.6**: System MUST provide isolation semantics for child playbook invocation using an `inheritPermissions` flag
  - By default, child playbooks run in read-only sandbox; cannot write or push to parent branch
  - Parent MAY opt-in with `inheritPermissions: true` to allow child writes within parent's permissions and branch context
  - Opt-in requires RBAC checks and explicit approval; validates `allowedWritePaths` if provided, defaults to repository root
  - Engine records permission inheritance in run snapshot for auditability

**FR-10**: Multi-Platform Support

- **FR-10.1**: Playbook definitions MUST be AI platform agnostic (no Claude-specific or Copilot-specific syntax)
- **FR-10.2**: System MUST auto-detect available AI platform from environment
- **FR-10.3**: System MUST support adding new AI platform adapters without modifying engine code
- **FR-10.4**: AI platform adapters MUST implement common interface: `invoke(prompt, tools, options) → AsyncIterator<Message>`
- **FR-10.5**: System MUST provide a configurable adapter selection precedence so runs are deterministic about which adapter is used in mixed-provider environments

### Non-functional requirements

- **NFR-1**: Cost & usage efficiency
  - **NFR-1.1**: Execution state MUST be minimal JSON, not duplicating large file contents
  - **NFR-1.2**: Resume MUST skip re-executing completed steps to avoid redundant AI invocations
  - **NFR-1.3**: AI invocations MUST stream results to avoid memory buffer overflow on long responses
  - **NFR-1.4**: The engine SHOULD provide an optional caching layer for idempotent action executions so that identical inputs can reuse previous results to reduce cost and latency. Cache behavior MUST be opt-in and respect privacy/security constraints.

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
  - System MUST log each step start/completion with timestamps, durations, and status
  - Checkpoint pauses MUST log clear messages indicating waiting for user input
  - Engine MUST emit structured logs (JSON mode supported) with runId, playbookId, stepId, timestamp, level, status, and metadata
  - Engine MUST emit telemetry metrics (run counts, durations, error rates) for operational monitoring (opt-in, configurable)
  - System MUST store immutable audit records of run-level actions (initiator, approvals, commits, timestamps) with diffs and export capability

- **NFR-5**: Testability
  - **NFR-5.1**: AI platform SDK calls MUST be abstracted behind interface for test mocking
  - **NFR-5.2**: File system operations MUST be abstracted for test mocking
  - **NFR-5.3**: 90% code coverage across engine, actions, and state manager
  - **NFR-5.4**: 100% coverage for critical paths: input validation, step execution, state persistence

- **NFR-6**: Extensibility
  - **NFR-6.1**: New action types MUST be addable without modifying engine code
  - **NFR-6.2**: New AI platform adapters MUST be addable without modifying engine code
  - **NFR-6.3**: Playbook YAML schema MUST be versioned to support future migrations

- **NFR-7**: Security
  - **NFR-7.1**: Execution state files MUST be encrypted at rest and access-controlled to prevent unauthorized reading or modification.
  - **NFR-7.2**: AI adapter integrations MUST validate provider credentials securely without logging sensitive tokens.
  - **NFR-7.3**: Playbook inputs containing sensitive data (e.g., API keys) MUST support masking in logs and state snapshots.
  - **NFR-7.4**: The engine MUST implement configurable rate limiting for AI invocations to prevent abuse or cost overruns.
  - **NFR-7.5**: All external integrations (AI platforms, GitHub) MUST use HTTPS/TLS and validate certificates.
  - **NFR-7.6**: The engine MUST support configurable secret providers (local encrypted keystore, OS keychain, or external secret store)
    - **NFR-7.6.1**: Secrets MUST be masked in logs and redacted in run snapshots; they MUST not be stored in plaintext in the filesystem

## Key Entities

Entities owned by this feature:

- **PlaybookDefinition**: YAML structure defining workflow metadata, inputs, steps, and outputs
  - Attributes: id, description, owner, reviewers, inputs, steps, outputs
  - Location: `src/playbooks/*.yaml`

- **ExecutionContext**: Runtime state container for single playbook execution
  - Attributes: playbook, inputs, stepResults, currentStepIndex, status
  - Lifecycle: Created at execution start, updated after each step, persisted to JSON

- **PlaybookAction**: Interface for step execution strategies
  - Methods: execute(step, context) → ActionResult
  - Notes: Playbooks themselves SHOULD be able to implement the same `PlaybookAction` so that a playbook can be treated as an action (composite/leaf node). This makes error handling and lifecycle consistent whether running a leaf action or invoking a child playbook. The engine may call into an action's `execute` implementation which, for AI-backed actions, will typically delegate to an `AIAdapter.invoke(...)` call.
  - Implementations: AIPromptAction, CheckpointAction, PlaybookAction

- **AIAdapter**: Interface for AI platform integration
  - Methods: invoke(prompt, tools, options) → AsyncIterator<Message>
  - Implementations: provider-specific adapters (e.g., ClaudeAdapter, CopilotAdapter) will be added in future features

- **ExecutionState**: Persistent snapshot of execution progress
  - Attributes: playbookId, startTime, currentStep, inputs, stepResults, status
  - Location: `.xe/runs/run-{runId}.json` (live); archived copies are stored under `.xe/runs/history/{YYYY}/{MM}/{DD}/`.

- **ActionResult**: Outcome of single step execution
  - Attributes: success, messages, outputs, errors

- **RunLock**: Lock metadata for a running playbook
  - Attributes: runId, lockedPaths[], lockedBranches[], lockOwner, lockAcquiredAt, lockTTL
  - Location: `.xe/runs/locks/run-{runId}.lock`

NOTE: TypeScript runtime helpers and playbook-engine-specific error definitions (including any playbook-engine-specific error code constants) SHALL live under `src/playbooks/scripts/errors`.

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

## Examples

### Error Policy Configuration
```yaml
errorPolicy:
  default:
    action: Stop
  InvalidParameter:
    action: Continue
    retryCount: 3
  RateLimitExceeded:
    action: Ignore
```

### ExecuteIfAllowed Usage
```ts
// Example action implementation
await executeIfAllowed(step, runMode, actor, async () => {
  // privileged APIs only accessible inside guard callback
  await BranchAction.createOrSwitch(branchName);
  await CommitAction.commitAndPush(files, message);
  return { success: true };
});
```

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
