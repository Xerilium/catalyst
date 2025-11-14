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

- **Primary Components**: PlaybookEngine (orchestrator), TaskExecutor registry (markdown, ai-prompt, checkpoint, sub-playbook), AIAdapter registry (Claude, Copilot), StateManager (persistence with rollout files)
- **Data Structures**: PlaybookDefinition (YAML schema), ExecutionContext (runtime state), ExecutionState (persistent JSON), TaskResult (step outcome)
- **Dependencies**:
  - `@anthropic-ai/claude-agent-sdk` (Claude AI integration)
  - `js-yaml` (YAML parsing)
  - Node.js >= 18 (native TypeScript)
- **Configuration**: Playbook YAMLs in `playbooks/`, state files in `.xe/rollouts/`
- **Performance Goals**: <100ms playbook load, <50ms state save, <5% engine overhead vs AI invocation time
- **Testing Framework**: Jest with ts-jest, 90% coverage target, 100% for critical paths (validation, execution, state)
- **Key Constraints**: AI platform agnostic, state must be resumable, no circular playbook dependencies, backward compatible with markdown playbooks

---

## Project Structure

```
src/ts/playbooks/
├── runtime/                      # Execution engine
│   ├── engine.ts                 # Core PlaybookEngine class (main entry point)
│   ├── context.ts                # ExecutionContext for runtime state
│   ├── state.ts                  # StateManager for rollout file persistence
│   ├── discovery.ts              # Convention-based playbook discovery from src/playbooks/
│   ├── types.ts                  # Core TypeScript interfaces
│   ├── executors/                # Task executor implementations
│   │   ├── markdown.ts           # MarkdownTaskExecutor
│   │   ├── ai-prompt.ts          # AIPromptTaskExecutor
│   │   ├── checkpoint.ts         # CheckpointTaskExecutor
│   │   ├── sub-playbook.ts       # SubPlaybookTaskExecutor
│   │   ├── base.ts               # TaskExecutor interface
│   │   └── index.ts              # Executor registry
│   ├── adapters/                 # AI platform adapters
│   │   ├── claude.ts             # ClaudeAdapter for Claude SDK
│   │   ├── base.ts               # AIAdapter interface
│   │   └── index.ts              # Adapter registry
│   └── index.ts                  # Public API exports
├── definitions/                  # YAML playbook definitions
│   └── .gitkeep
├── scripts/                      # CLI utilities
│   ├── run-playbook.ts           # Execute playbook (main CLI entry point)
│   ├── validate-playbook.ts      # Validate playbook definition
│   └── list-playbooks.ts         # List available playbooks
└── [existing .md files]          # Markdown playbooks (unchanged)

tests/playbooks/
├── runtime/
│   ├── engine.test.ts            # Engine unit tests
│   ├── state-manager.test.ts    # State management tests
│   ├── context.test.ts           # Context tests
│   ├── registry.test.ts          # Registry tests
│   ├── executors/
│   │   ├── markdown.test.ts      # Markdown executor tests
│   │   ├── ai-prompt.test.ts     # AI prompt executor tests
│   │   ├── checkpoint.test.ts    # Checkpoint executor tests
│   │   └── sub-playbook.test.ts  # Sub-playbook executor tests
│   └── adapters/
│       └── claude.test.ts        # Claude adapter tests
└── integration/
    ├── full-execution.test.ts    # End-to-end playbook execution
    └── resume.test.ts            # Resume from saved state

.xe/playbooks/
└── state/                        # Execution state files (created at runtime)
    └── .gitignore                # Ignore state files in git
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
  - `outputs`: string[] (expected output files)

- **ExecutionContext**: Runtime state for single execution
  - `executionId`: string (UUID)
  - `playbook`: PlaybookDefinition
  - `inputs`: Record<string, any> (validated inputs)
  - `stepResults`: Map<string, TaskResult>
  - `currentStepIndex`: number
  - `status`: 'running' | 'paused' | 'completed' | 'failed'
  - `startTime`: Date
  - `options`: ExecutionOptions

- **ExecutionState**: Persistent snapshot for resume
  - `playbookId`: string
  - `executionId`: string
  - `startTime`: string (ISO 8601)
  - `currentStep`: number
  - `inputs`: Record<string, any>
  - `stepResults`: Array<{ stepId: string, result: TaskResult }>
  - `status`: 'running' | 'paused' | 'completed' | 'failed'

- **TaskResult**: Step execution outcome
  - `success`: boolean
  - `messages`: string[] (AI responses or logs)
  - `outputs`: string[] (created file paths)
  - `errors`: string[] (error messages if failed)

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
const result = await engine.execute('start-rollout', {
  'rollout-id': 'my-feature',
  'execution-mode': 'manual'
});
```

```typescript
// With options
const result = await engine.execute('start-rollout', {
  'rollout-id': 'my-feature'
}, {
  executionMode: 'autonomous',
  logLevel: 'debug'
});
```

### PlaybookEngine.resume()

**Signature:**

```typescript
async resume(executionId: string): Promise<ExecutionResult>
```

**Purpose:** Resume a paused or failed execution from saved state

**Parameters:**

- `executionId` (string): UUID of execution to resume

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

**Examples:**

```typescript
// Markdown executor
const markdownExecutor = new MarkdownTaskExecutor(aiAdapter);
const result = await markdownExecutor.execute({
  id: 'research',
  type: 'markdown',
  config: {
    markdown: './start-rollout.md',
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
- ID matches filename (e.g., `start-rollout.yaml` → `id: start-rollout`)
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
  readonly executionId: string;
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
    this.executionId = crypto.randomUUID();
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

**Purpose:** Persist and restore execution state

**Implementation:**

```typescript
export class StateManager {
  constructor(private stateDir: string) {}

  async save(context: ExecutionContext): Promise<void> {
    const state: ExecutionState = {
      playbookId: context.playbook.id,
      executionId: context.executionId,
      startTime: context.startTime.toISOString(),
      currentStep: context.currentStepIndex,
      inputs: context.inputs,
      stepResults: Array.from(context.stepResults.entries()).map(([id, result]) => ({ stepId: id, result })),
      status: context.status
    };

    // Atomic write: temp file → rename
    const tempPath = path.join(this.stateDir, `${context.executionId}.tmp`);
    const finalPath = path.join(this.stateDir, `${context.executionId}.json`);

    await fs.promises.writeFile(tempPath, JSON.stringify(state, null, 2));
    await fs.promises.rename(tempPath, finalPath);
  }

  async load(executionId: string): Promise<ExecutionState> {
    const statePath = path.join(this.stateDir, `${executionId}.json`);
    const content = await fs.promises.readFile(statePath, 'utf-8');
    const state = JSON.parse(content);

    // Validate state structure
    this.validateState(state);

    return state;
  }

  private validateState(state: any): void {
    // Check required fields exist
    if (!state.playbookId || !state.executionId || !state.currentStep) {
      throw new StateCorruptedError('Missing required state fields');
    }
  }
}
```

**Key design:**
- Atomic writes prevent corruption
- JSON format for human readability
- Validation on load catches corruption early

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

**Claude Adapter (adapters/claude.ts):**

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

export class ClaudeAdapter implements AIAdapter {
  async *invoke(prompt: string, tools: string[], options: AIOptions): AsyncIterator<Message> {
    const result = query({
      prompt,
      options: {
        model: options.model || 'claude-sonnet-4-5',
        cwd: options.cwd || process.cwd(),
        tools
      }
    });

    for await (const message of result) {
      yield {
        role: 'assistant',
        content: message.content || ''
      };
    }
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
    // Try Claude first, then others
    return this.adapters.get('claude') || this.adapters.values().next().value;
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

```typescript
export class MarkdownTaskExecutor implements TaskExecutor {
  constructor(private aiAdapter: AIAdapter) {}

  async execute(step: StepDefinition, context: ExecutionContext): Promise<TaskResult> {
    const { markdown, inputs } = step.config;

    // 1. Read markdown file
    const content = await fs.promises.readFile(markdown, 'utf-8');

    // 2. Interpolate variables
    const prompt = this.interpolate(content, { ...context.inputs, ...inputs });

    // 3. Invoke AI
    const messages: string[] = [];
    const aiMessages = this.aiAdapter.invoke(
      `You are executing a Catalyst playbook. Follow these instructions:\n\n${prompt}`,
      ['Read', 'Write', 'Bash', 'Grep', 'Glob'],
      { cwd: context.options.workingDirectory }
    );

    for await (const message of aiMessages) {
      messages.push(message.content);
      console.log(message.content); // Stream to console
    }

    return {
      success: true,
      messages,
      outputs: step.outputs || [],
      errors: []
    };
  }

  private interpolate(template: string, vars: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '');
  }
}
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

    // Execute child playbook
    const result = await this.engine.execute(playbook, mappedInputs, context.options);

    return {
      success: result.success,
      messages: [`Sub-playbook '${playbook}' completed`],
      outputs: result.outputs,
      errors: result.errors
    };
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

```typescript
export class PlaybookEngine {
  constructor(
    private executors: TaskExecutorRegistry,
    private stateManager: StateManager
  ) {}

  async execute(
    playbookId: string,
    inputs: Record<string, any>,
    options?: ExecutionOptions
  ): Promise<ExecutionResult> {
    // 1. Load playbook via convention-based discovery
    const playbook = await loadPlaybook(playbookId);
    if (!playbook) throw new NotFoundError(`Playbook ${playbookId} not found`, 'Check playbook ID and ensure file exists at playbooks/${playbookId}.yaml');

    // 2. Validate inputs
    const validatedInputs = this.validateInputs(inputs, playbook.inputs);

    // 3. Create context
    const context = new ExecutionContext(playbook, validatedInputs, options);

    // 4. Execute steps
    while (context.currentStepIndex < playbook.steps.length) {
      const step = context.getCurrentStep();

      // Get executor
      const executor = this.executors.get(step.type);
      if (!executor) throw new ExecutorNotFoundError(step.type);

      // Execute
      console.log(`[${step.id}] Executing step...`);
      const result = await executor.execute(step, context);

      // Check success
      if (!result.success) {
        context.status = 'failed';
        await this.stateManager.save(context);
        throw new ExecutionError(`Step '${step.id}' failed`, result.errors);
      }

      // Save result
      context.setStepResult(step.id, result);

      // Handle checkpoint
      if (step.checkpoint) {
        await this.handleCheckpoint(step, context);
      }

      // Save state
      await this.stateManager.save(context);

      // Advance
      context.advance();
    }

    // 5. Validate outputs
    await this.validateOutputs(playbook.outputs, context);

    // 6. Return result
    return new ExecutionResult(context);
  }

  private validateInputs(inputs: Record<string, any>, definitions: InputDefinition[]): Record<string, any> {
    const validated: Record<string, any> = {};

    for (const def of definitions) {
      let value = inputs[def.name];

      // Check required
      if (def.required && value === undefined) {
        throw new ValidationError(`Missing required input: ${def.name}`);
      }

      // Apply default
      if (value === undefined && def.default !== undefined) {
        value = def.default;
      }

      // Apply transform
      if (value && def.transform) {
        value = this.transform(value, def.transform);
      }

      validated[def.name] = value;
    }

    return validated;
  }

  private transform(value: string, transform: string): string {
    switch (transform) {
      case 'kebab-case':
        return value.toLowerCase().replace(/\s+/g, '-');
      case 'snake-case':
        return value.toLowerCase().replace(/\s+/g, '_');
      case 'camel-case':
        return value.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '');
      default:
        return value;
    }
  }

  private async handleCheckpoint(step: StepDefinition, context: ExecutionContext): Promise<void> {
    if (context.options.executionMode === 'autonomous') {
      return; // Auto-approve
    }

    context.status = 'paused';
    await this.stateManager.save(context);

    // Checkpoint executor already handled user input
    context.status = 'running';
  }

  private async validateOutputs(outputs: string[], context: ExecutionContext): Promise<void> {
    for (const output of outputs) {
      const interpolated = output.replace(/\{\{(\w+)\}\}/g, (_, key) => context.inputs[key] || '');
      const exists = await fs.promises.access(interpolated).then(() => true).catch(() => false);

      if (!exists) {
        throw new ValidationError(`Expected output not found: ${interpolated}`);
      }
    }
  }

  async resume(executionId: string): Promise<ExecutionResult> {
    // 1. Load state
    const state = await this.stateManager.load(executionId);

    // 2. Load playbook via convention-based discovery
    const playbook = await loadPlaybook(state.playbookId);
    if (!playbook) throw new NotFoundError(`Playbook ${state.playbookId} not found`, 'Check playbook ID and ensure file exists');

    // 3. Reconstruct context
    const context = new ExecutionContext(playbook, state.inputs);
    context.currentStepIndex = state.currentStep;
    context.status = 'running';

    // Restore step results
    for (const { stepId, result } of state.stepResults) {
      context.setStepResult(stepId, result);
    }

    // 4. Continue execution (same logic as execute, but starting from currentStep)
    // ... (same loop as execute method)
  }
}
```

### 8. CLI Scripts (scripts/)

**run-playbook.ts:**

```typescript
#!/usr/bin/env node
import { PlaybookEngine } from '../runtime/engine';
import { loadPlaybook } from '../runtime/discovery';
import { StateManager } from '../runtime/state';
import { TaskExecutorRegistry } from '../runtime/executors';
import { AIAdapterRegistry } from '../runtime/adapters';
import { ClaudeAdapter } from '../runtime/adapters/claude';
import { MarkdownTaskExecutor } from '../runtime/executors/markdown';
// ... other imports

async function main() {
  const [, , playbookId, ...args] = process.argv;

  if (!playbookId) {
    console.error('Usage: node run-playbook.js <playbook-id> [inputs...]');
    process.exit(1);
  }

  // Setup AI adapters
  const aiAdapters = new AIAdapterRegistry();
  aiAdapters.register('claude', new ClaudeAdapter());

  // Setup task executors
  const executors = new TaskExecutorRegistry();
  executors.register('markdown', new MarkdownTaskExecutor(aiAdapters.getDefault()));
  // ... register other executors

  // Setup state manager
  const stateManager = new StateManager('.xe/rollouts');

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
- Mock `@anthropic-ai/claude-agent-sdk` for AI calls
- Mock file system for state persistence
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
