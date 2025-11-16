---
id: playbook-engine
title: Playbook Engine
author: "@flanakin"
description: "Implementation plan for TypeScript-based playbook execution engine with AI platform agnostic design"
dependencies:
  - product-context
  - engineering-context
  - feature-context
---

<!-- markdownlint-disable single-title -->

# Implementation Plan: Playbook Engine

**Spec**: [Feature spec](./spec.md)

---

## Summary

The playbook engine implements programmatic workflow execution through a TypeScript runtime that orchestrates AI-driven tasks via an extensible executor system. The engine loads YAML playbook definitions, validates inputs, executes steps sequentially through registered task executors (markdown, ai-prompt, checkpoint, sub-playbook), manages execution state for pause/resume capability, and validates outputs. This enables reliable, composable workflows that can be broken into smaller PR-sized units while supporting multiple AI platforms through an adapter pattern.

**Design rationale**: See [research.md](./research.md) for analysis of alternatives (MAF, LangGraph, CrewAI, Dagu), declarative vs imperative approaches, and decision to build TypeScript runtime with markdown executor as first-class task type.

---

## Technical Context

This feature implementation plan extends the technical architecture defined in `.xe/architecture.md`.

**Feature-specific technical details:**

- **Primary Components**: PlaybookEngine (orchestrator), TaskExecutor registry (markdown, ai-prompt, checkpoint, sub-playbook), AIAdapter registry (Claude, Copilot), StateManager (persistence with run state files)
- **Data Structures**: PlaybookDefinition (YAML schema), ExecutionContext (runtime state), ExecutionState (persistent JSON), TaskResult (step outcome)
- **Dependencies**:
  - `js-yaml` (YAML parsing)
  - Node.js >= 18 (native TypeScript)
- **Configuration**: Playbook YAMLs in `src/playbooks/`; live run state snapshots in `.xe/runs/` (archive completed runs to `.xe/runs/history/`).
- **Performance Goals**: <100ms playbook load, <50ms state save, <5% engine overhead vs AI invocation time
- **Testing Framework**: Jest with ts-jest, 90% coverage target, 100% for critical paths (validation, execution, state)
- **Key Constraints**: AI platform agnostic, state must be resumable, no circular playbook dependencies, markdown playbooks supported as a first-class task type

---

## Project Structure

```
src/playbooks/scripts/
  runtime/          # Core execution engine, state management, task executors, AI adapters (TypeScript source)
  adapters/         # AI adapter implementations (TypeScript)
  executors/        # Task executor implementations (TypeScript)
  cli/              # CLI entrypoints and small runtime utilities (e.g., run-playbook.ts)
src/playbooks/definitions/  # YAML playbook definitions
tests/playbooks/    # Unit and integration tests for engine components
.xe/runs/           # Live run snapshots (run-{runId}.json)
.xe/runs/history/   # Archived completed runs (YYYY/MM/DD)
```

---

## Data Model

**Entities owned by this feature:**

- **PlaybookDefinition**: YAML workflow definition
  - `id`: string (kebab-case identifier)
  - `description`: string (human-readable purpose)
  - `owner`: string (role: Product Manager, Architect, Engineer)
  - `reviewers`: object ({ required: string[], optional: string[] })
  - `inputs`: InputDefinition[] (parameter specifications)
  - `steps`: StepDefinition[] (ordered execution steps)
  - `outputs`: string[] (expected output file paths)

- **InputDefinition**: Input parameter specification
  - `name`: string (parameter name)
  - `type`: 'string' | 'number' | 'boolean' | 'enum'
  - `required`: boolean
  - `default`: any (optional default value)
  - `values`: string[] (for enum type)
  - `transform`: 'kebab-case' | 'snake-case' | 'camel-case' | undefined

- **StepDefinition**: Single workflow step
  - `id`: string (step identifier)
  - `type`: 'markdown' | 'ai-prompt' | 'checkpoint' | 'sub-playbook' | 'bash'
  - `checkpoint`: boolean (pause for approval)
  - `config`: Record<string, any> (type-specific configuration)
  - `errorPolicy`?: string (optional per-step error handling policy such as `fail`, `retry:N`, `continue`, `ignore`)
  - `outputs`: string[] (expected output files)

**ExecutionContext**: Runtime state for single execution
  - `runId`: string (friendly, filename-safe run identifier, see "Run naming" below)
  - `playbook`: PlaybookDefinition
  - `inputs`: Record<string, any> (validated inputs)
  - `stepResults`: Map<string, TaskResult>
  - `currentStepIndex`: number
  - `status`: 'running' | 'paused' | 'completed' | 'failed'
  - `startTime`: Date
  - `options`: ExecutionOptions
    - `errorPolicyDefaults`?: Record<string, any> (optional default error policy settings for the run)

**ExecutionState**: Persistent snapshot for resume
  - `playbookId`: string
  - `runId`: string
  - `startTime`: string (ISO 8601)
  - `currentStep`: number
  - `inputs`: Record<string, any>
  - `stepResults`: Array<{ stepId: string, result: TaskResult }>
  - `status`: 'running' | 'paused' | 'completed' | 'failed'

Note: The playbook loader MUST validate YAML against the canonical schema during discovery (see runtime/discovery.ts). Non-conforming YAML MUST be rejected with a clear error.

- **TaskResult**: Step execution outcome
  - `success`: boolean
  - `messages`: string[] (AI responses or logs)
  - `outputs`: string[] (created file paths)
  - `errors`: string[] (error messages if failed)

## Run naming

Recommended `runId` format (filename-safe, human friendly):

- `{yyyy}-{MM}-{dd}-{HHmm}_{platform}-{agent}_{playbook-name}_{index}`

Notes:
- `platform` is a short platform identifier (e.g., `claude`, `copilot`)
- `agent` is the Catalyst agent name; use `general` when the run is created by a general-purpose, non-specialized agent
- `playbook-name` is the kebab-case playbook id (e.g., `do-something`)
- `index` is a three-digit counter (001, 002) to disambiguate runs started within the same minute

Example filename: `run-2025-11-14-1530_claude-general_do-something_001.json` (stored under `.xe/runs/`)

**Entities from other features:**

- **GitHub Scripts** (github-integration): Issue and PR management utilities

---

## Contracts

### PlaybookEngine.execute()

**Signature:**

```typescript
async execute(
  playbookId: string,
  inputs: Record<string, any>,
  options?: ExecutionOptions
): Promise<ExecutionResult>
```

**Purpose:** Execute a playbook with given inputs from start to completion

**Parameters:**

- `playbookId` (string): Kebab-case playbook identifier matching YAML filename
- `inputs` (Record<string, any>): Key-value pairs for playbook inputs
- `options` (ExecutionOptions, optional): Execution configuration
  - `executionMode`: 'manual' | 'autonomous' (default: 'manual')
  - `workingDirectory`: string (default: process.cwd())
  - `logLevel`: 'debug' | 'info' | 'warn' | 'error' (default: 'info')

**Returns:** Promise<ExecutionResult> containing execution status, step results, and outputs

**Errors/Exceptions:**
- `PlaybookNotFoundError`: Playbook ID not found in registry
- `ValidationError`: Input validation failed
- `ExecutionError`: Step execution failed
- `StateError`: State save/load failed

**Examples:**

```typescript
// Basic execution
const engine = new PlaybookEngine(executors, stateManager);
const result = await engine.execute('do-something', {
  'rollout-id': 'my-feature',
  'execution-mode': 'manual'
});
```

```typescript
// With options
const result = await engine.execute('do-something', {
  'rollout-id': 'my-feature'
}, {
  executionMode: 'autonomous',
  logLevel: 'debug'
});
```

### PlaybookEngine.resume()

**Signature:**

```typescript
async resume(runId: string): Promise<ExecutionResult>
```

**Purpose:** Resume a paused or failed execution from saved state

**Parameters:**

-- `runId` (string): run identifier of execution to resume

**Returns:** Promise<ExecutionResult> with execution continuing from last completed step

**Errors/Exceptions:**
- `StateNotFoundError`: No saved state for execution ID
- `StateCorruptedError`: State file is invalid or corrupted

**Examples:**

```typescript
const result = await engine.resume('550e8400-e29b-41d4-a716-446655440000');
```

### TaskExecutor.execute()

**Signature:**

```typescript
async execute(
  step: StepDefinition,
  context: ExecutionContext
): Promise<TaskResult>
```

**Purpose:** Execute a single workflow step

**Parameters:**

- `step` (StepDefinition): Step configuration from playbook
- `context` (ExecutionContext): Current execution context with inputs and previous results

**Returns:** Promise<TaskResult> with success status, messages, and outputs

**Errors/Exceptions:**
- `ExecutorError`: Step-specific execution failure

Executors MUST honor per-step `errorPolicy` where supported and return structured failure metadata that the engine can persist.

**Examples:**

```typescript
// Markdown executor
const markdownExecutor = new MarkdownTaskExecutor(aiAdapter);
const result = await markdownExecutor.execute({
  id: 'research',
  type: 'markdown',
  config: {
    markdown: './do-something.md',
    inputs: { 'feature-id': 'my-feature' }
  }
}, context);
```

### AIAdapter.invoke()

**Signature:**

```typescript
async *invoke(
  prompt: string,
  tools: string[],
  options: AIOptions
): AsyncIterator<Message>
```

**Purpose:** Invoke AI platform with prompt and return streaming responses

**Parameters:**

- `prompt` (string): Text prompt for AI
- `tools` (string[]): Tool names to grant (Read, Write, Bash, Grep, Glob)
- `options` (AIOptions): Platform-specific options
  - `model`: string (e.g., 'claude-sonnet-4-5')
  - `cwd`: string (working directory)

**Returns:** AsyncIterator<Message> yielding AI response messages

**Errors/Exceptions:**
- `AuthenticationError`: AI platform not authenticated
- `RateLimitError`: Rate limit exceeded
- `APIError`: AI platform API error

**Examples:**

```typescript
const adapter = new ClaudeAdapter();
const messages = adapter.invoke(
  'Analyze the codebase',
  ['Read', 'Grep'],
  { model: 'claude-sonnet-4-5', cwd: '/project' }
);

for await (const message of messages) {
  console.log(message.content);
}
```

---

## Implementation Approach

### 1. Core Type Definitions (runtime/types.ts)

**Create TypeScript interfaces:**

- `PlaybookDefinition` - YAML structure
- `InputDefinition` - Input parameter spec
- `StepDefinition` - Workflow step
- `ExecutionContext` - Runtime state
- `ExecutionState` - Persistent state
- `TaskResult` - Step outcome
- `ExecutionOptions` - Engine options
- `ExecutionResult` - Final result
- `TaskExecutor` - Executor interface
- `AIAdapter` - AI platform interface

**Implementation details:**
- Use strict typing with no `any` except `Record<string, any>` for dynamic inputs
- Add JSDoc comments for each interface
- Export all types from index.ts

### 2. Playbook Discovery (runtime/discovery.ts)

**Purpose:** Convention-based discovery and loading of playbook definitions from src/playbooks/*.yaml

**Implementation:**

```typescript
// Convention-based discovery - no registry class needed
export async function loadPlaybook(id: string): Promise<PlaybookDefinition> {
  // 1. Construct path: playbooks/{id}.yaml
  // 2. Read and parse YAML file using js-yaml
  // 3. Validate structure (required fields present)
  // 4. Return validated PlaybookDefinition
}

export async function listPlaybooks(): Promise<PlaybookDefinition[]> {
  // 1. Scan playbooks/ for *.yaml files
  // 2. Load and validate each playbook
  // 3. Return array of definitions
}
```

**Validation rules:**
- ID matches filename (e.g., `do-something.yaml` → `id: do-something`)
- All required fields present (id, description, owner, inputs, steps)
- Steps have valid task types
- No duplicate step IDs

**Error handling:**
- Throw ValidationError with specific field name if invalid
- Throw NotFoundError if playbook file doesn't exist
- Log warning for unknown task types (don't fail, allow extension)

### 3. Execution Context (runtime/context.ts)

**Purpose:** Maintain runtime state during execution

**Implementation:**

```typescript
export class ExecutionContext {
  readonly runId: string;
  readonly playbook: PlaybookDefinition;
  readonly inputs: Record<string, any>;
  readonly stepResults: Map<string, TaskResult> = new Map();
  currentStepIndex: number = 0;
  status: ExecutionStatus = 'running';
  readonly startTime: Date;
  readonly options: ExecutionOptions;

  constructor(
    playbook: PlaybookDefinition,
    inputs: Record<string, any>,
    options?: ExecutionOptions
  ) {
    this.runId = generateFriendlyRunId();
    this.playbook = playbook;
    this.inputs = inputs;
    this.startTime = new Date();
    this.options = { executionMode: 'manual', ...options };
  }

  setStepResult(stepId: string, result: TaskResult): void {
    this.stepResults.set(stepId, result);
  }

  getStepResult(stepId: string): TaskResult | undefined {
    return this.stepResults.get(stepId);
  }

  getCurrentStep(): StepDefinition {
    return this.playbook.steps[this.currentStepIndex];
  }

  advance(): void {
    this.currentStepIndex++;
    if (this.currentStepIndex >= this.playbook.steps.length) {
      this.status = 'completed';
    }
  }
}
```

### 4. State Manager (runtime/state.ts)

**Purpose:** Persist and restore execution state (canonical location: `.xe/runs/run-{run-id}.json`).

Keep implementation in `src/playbooks/runtime/state.ts`. Key requirements:

- Atomic writes (write temp file then rename) to avoid corruption
- Minimal, stable JSON schema containing: playbookId, runId, startTime, currentStep, inputs, stepResults, status
- Validation on load that errors with a clear recovery message for corrupted files

Example (pseudo-signature):

```ts
class StateManager {
  constructor(stateDir: string);
  save(context: ExecutionContext): Promise<void>;
  load(runId: string): Promise<ExecutionState>;
}
```

See `src/playbooks/runtime/state.ts` for the reference implementation.

### 5. AI Platform Adapters (runtime/adapters/)

**Base Interface (adapters/base.ts):**

```typescript
export interface AIAdapter {
  invoke(prompt: string, tools: string[], options: AIOptions): AsyncIterator<Message>;
}

export interface Message {
  role: 'assistant' | 'user';
  content: string;
}

export interface AIOptions {
  model?: string;
  cwd?: string;
}
```

**Mock Adapter (adapters/mock.ts):**

```typescript
export class MockAdapter implements AIAdapter {
  async *invoke(prompt: string, tools: string[], options: AIOptions): AsyncIterator<Message> {
    yield {
      role: "assistant",
      content: `Prompt: ${prompt}`
    };

    yield {
      role: "assistant",
      content: `Tools: ${tools.join(", ")}`
    };

    yield {
      role: "assistant",
      content: `Options: ${JSON.stringify(options)}`
    };
  }
}
```

**Adapter Registry (adapters/index.ts):**

```typescript
export class AIAdapterRegistry {
  private adapters: Map<string, AIAdapter> = new Map();

  register(name: string, adapter: AIAdapter): void {
    this.adapters.set(name, adapter);
  }

  get(name: string): AIAdapter | undefined {
    return this.adapters.get(name);
  }

  getDefault(): AIAdapter {
    // Prefer a registered mock adapter in tests/dev; otherwise return first registered adapter
    return this.adapters.get('mock') || this.adapters.values().next().value;
  }
}
```

### 6. Task Executors (runtime/executors/)

**Base Interface (executors/base.ts):**

```typescript
export interface TaskExecutor {
  execute(step: StepDefinition, context: ExecutionContext): Promise<TaskResult>;
}
```

**Markdown Executor (executors/markdown.ts):**

```ts
// MarkdownTaskExecutor - contract and behavior summary.
// Implementation lives in `src/playbooks/runtime/executors/markdown.ts`.
// Behavior:
// 1) Read the markdown playbook file
// 2) Interpolate `{{var}}` placeholders from context.inputs
// 3) Invoke configured AI adapter with minimal default tool scope
// 4) Stream messages to console and return TaskResult with outputs
export interface MarkdownTaskExecutor extends TaskExecutor {}
```

**AI Prompt Executor (executors/ai-prompt.ts):**

Similar to markdown but takes prompt from step.config.prompt instead of file.

**Checkpoint Executor (executors/checkpoint.ts):**

```typescript
export class CheckpointTaskExecutor implements TaskExecutor {
  async execute(step: StepDefinition, context: ExecutionContext): Promise<TaskResult> {
    if (context.options.executionMode === 'autonomous') {
      // Auto-approve
      return { success: true, messages: ['Auto-approved'], outputs: [], errors: [] };
    }

    // Manual approval
    console.log(`\n🔔 Checkpoint: ${step.config.message || step.id}`);
    console.log('Press ENTER to continue...');

    await this.waitForEnter();

    return { success: true, messages: ['Approved'], outputs: [], errors: [] };
  }

  private async waitForEnter(): Promise<void> {
    return new Promise((resolve) => {
      process.stdin.once('data', () => resolve());
    });
  }
}
```

**Sub-Playbook Executor (executors/sub-playbook.ts):**

```typescript
export class SubPlaybookTaskExecutor implements TaskExecutor {
  constructor(private engine: PlaybookEngine) {}

  async execute(step: StepDefinition, context: ExecutionContext): Promise<TaskResult> {
    const { playbook, inputs } = step.config;

    // Map inputs from parent context
    const mappedInputs: Record<string, any> = {};
    for (const [key, value] of Object.entries(inputs)) {
      if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
        const varName = value.slice(2, -2);
        mappedInputs[key] = context.inputs[varName];
      } else {
        mappedInputs[key] = value;
      }
    }

    // Recursion guard: enforce a maximum call depth to avoid infinite loops
    const depth = (context.options && (context.options as any).callDepth) || 0;
    const MAX_DEPTH = (context.options && (context.options as any).maxCallDepth) || 10;
    if (depth >= MAX_DEPTH) {
      throw new Error(`Maximum playbook recursion depth exceeded (${MAX_DEPTH}) for playbook: ${playbook}`);
    }

    // Execute child playbook (propagate a callDepth counter)
    const childOptions = { ...context.options, callDepth: depth + 1 } as ExecutionOptions;
    const result = await this.engine.execute(playbook, mappedInputs, childOptions);

    // Respect errorPolicy: by default failures propagate; a step can override via errorPolicy
    const taskResult: TaskResult = {
      success: result.success,
      messages: [`Sub-playbook '${playbook}' completed`],
      outputs: result.outputs,
      errors: result.errors || []
    };

    return taskResult;
  }
}
```

**Executor Registry (executors/index.ts):**

```typescript
export class TaskExecutorRegistry {
  private executors: Map<string, TaskExecutor> = new Map();

  register(type: string, executor: TaskExecutor): void {
    this.executors.set(type, executor);
  }

  get(type: string): TaskExecutor | undefined {
    return this.executors.get(type);
  }
}
```

### 7. Playbook Engine (runtime/engine.ts)

**Main orchestration class:**

```ts
// PlaybookEngine: public contract (implementation is placed in src/).
export interface PlaybookEngine {
  execute(playbookId: string, inputs: Record<string, any>, options?: ExecutionOptions): Promise<ExecutionResult>;
  resume(runId: string): Promise<ExecutionResult>;
}
```

See `src/playbooks/runtime/engine.ts` for the full implementation.

### 8. CLI Scripts (scripts/)

**CLI: `catalyst-playbook run <playbook-name>`**

Implementation: `src/playbooks/scripts/run-playbook.ts`

```typescript
#!/usr/bin/env node
import { PlaybookEngine } from '../runtime/engine';
import { loadPlaybook } from '../runtime/discovery';
import { StateManager } from '../runtime/state';
import { TaskExecutorRegistry } from '../runtime/executors';
import { AIAdapterRegistry } from '../runtime/adapters';
import { MockAdapter } from '../runtime/adapters/mock';
import { MarkdownTaskExecutor } from '../runtime/executors/markdown';
// ... other imports

async function main() {
  const [, , playbookId, ...args] = process.argv;

  if (!playbookId) {
    console.error('Usage: catalyst-playbook run <playbook-name> [inputs...]');
    process.exit(1);
  }

  // Setup AI adapters
  const aiAdapters = new AIAdapterRegistry();
  aiAdapters.register('mock', new MockAdapter());

  // Setup task executors
  const executors = new TaskExecutorRegistry();
  executors.register('markdown', new MarkdownTaskExecutor(aiAdapters.getDefault()));
  // ... register other executors

  // Setup state manager (live runs)
  const stateManager = new StateManager('.xe/runs');

  // Create engine (no registry needed - convention-based discovery)
  const engine = new PlaybookEngine(executors, stateManager);

  // Parse inputs
  const inputs = parseInputs(args);

  // Execute
  try {
    const result = await engine.execute(playbookId, inputs);
    console.log('\n✅ Playbook completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Playbook failed:', error.message);
    process.exit(1);
  }
}

function parseInputs(args: string[]): Record<string, any> {
  // Simple positional parsing for MVP
  // Future: support --key=value syntax
  return {};
}

main();
```

### 9. Testing Strategy

**Unit Tests (90% coverage):**
- `engine.test.ts` - Validate inputs, execute steps, handle errors
- `context.test.ts` - State transitions, result storage
- `state-manager.test.ts` - Save/load, corruption handling, atomic writes
- `registry.test.ts` - Load YAMLs, validation, discovery
- `executors/*.test.ts` - Each executor in isolation with mocked AI
- `adapters/*.test.ts` - Each adapter with mocked SDK

**Integration Tests (100% critical paths):**
- `full-execution.test.ts` - End-to-end playbook execution
- `resume.test.ts` - Save state, kill process, resume successfully
- Validate markdown executor works with real YAML
- Validate checkpoint pauses and resumes

**Mocking Strategy:**
- Use `MockAdapter` for all AI calls in tests and CI (no provider SDKs required)
- Mock file system for state persistence where appropriate
- Use fixture YAML files for test playbooks

---

## Error Handling

**Error Types:**
- `PlaybookNotFoundError` - Playbook ID not in registry
- `ValidationError` - Input validation or output validation failed
- `ExecutionError` - Step execution failed
- `ExecutorNotFoundError` - Unknown task type
- `StateCorruptedError` - State file invalid
- `StateNotFoundError` - No saved state for execution ID
- `AuthenticationError` - AI platform not authenticated

**Error Response:**
- Log error with context (playbook ID, step ID, inputs)
- Save failed state for debugging
- Exit with non-zero code (1=validation, 2=execution, 3=state)
- Provide actionable message (what failed, how to fix)

**Retry Logic:**
- AI adapter: 3 attempts with exponential backoff (1s, 2s, 4s)
- State save: No retry (atomic write ensures consistency)
- Checkpoint: No timeout (wait indefinitely for user)

---

## Integration Points

**Slash Commands:**
- `/catalyst:run` command should route to `run-playbook.ts`
- Pass playbook ID and inputs from command args
- Stream output to console

**GitHub Scripts:**
- Playbooks import from `src/playbooks/scripts/github.ts`
- No changes to existing functions
- Scripts are used by AI within playbook execution

---

## Future Enhancements (Out of Scope)

- GitHub Copilot adapter (Phase 1.4)
- Bash task executor (Phase 2)
- HTTP task executor (Phase 2)
- GitHub issue checkpoint integration (Phase 2)
- Workflow visualization (Phase 3)
- Playbook analytics/telemetry (Phase 5)
