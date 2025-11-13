---
id: playbook-engine
title: Playbook Engine
author: "@flanakin"
description: "TypeScript-based workflow execution engine with Claude Agent SDK integration for reliable, composable playbook orchestration"
---

# Research: Playbook Engine

> **Executive Summary**
>
> Build a TypeScript execution engine that orchestrates AI workflows using the Claude Agent SDK. The engine will support both existing markdown playbooks (via a "markdown task type") and future TypeScript-defined playbooks, enabling gradual migration while immediately unlocking playbook composition and state management.
>
> **Key Decision:** Build the full execution engine now (not just validation) with native support for running current markdown playbooks unchanged. This allows incremental adoption of structured playbooks as we build new features.

## Problem Statement

### Core Challenge

**Objective:** Achieve reliable, high-quality code generation at scale through structured, composable workflows.

**Current Limitations:**
1. **No enforcement** - AI can skip steps, misinterpret instructions, or hallucinate structure
2. **No state management** - Can't reliably pause/resume, track progress, or recover from errors
3. **No composability** - Can't break workflows into smaller, PR-sized chunks
4. **No validation** - No guarantee that playbook steps were actually followed
5. **Manual orchestration** - Must manually coordinate multi-phase workflows

### User Needs

**As a Product Manager**, I need:
- Playbooks to execute reliably without AI skipping critical validation steps
- Ability to pause and review at key checkpoints (research, spec, plan)
- Confidence that engineering principles are actually validated

**As an Architect**, I need:
- Playbooks broken into smaller, composable pieces that can be independently executed
- Each phase to produce its own PR for focused review
- State tracking across multi-step workflows

**As an Engineer**, I need:
- Playbooks to be testable and maintainable (not just markdown instructions)
- Clear error messages when workflows fail
- Ability to resume from failures without losing progress

## Research Findings

### Investigation: Existing AI Orchestration Tools

**Evaluated frameworks:**
- **Microsoft Agent Framework** - Agent/workflow orchestration, human-in-the-loop, checkpointing
- **LangGraph** - StateGraph for multi-agent workflows, state management
- **CrewAI** - Role-based agents, YAML-defined workflows
- **Dagu** - YAML DAG orchestration for command execution

**Key Insights:**

1. **Microsoft Agent Framework** (MAF)
   - Built for AI agents, supports C# and Python
   - Dual orchestration: Agent (LLM-driven) + Workflow (deterministic)
   - Human-in-the-loop as first-class feature
   - Durable execution with checkpointing
   - **Assessment:** Perfect conceptually, but heavyweight dependency. Better as Phase 2 migration target.

2. **LangGraph**
   - Python-based, StateGraph pattern
   - Strong state management and persistence (Redis/Postgres)
   - **Assessment:** Wrong language (Python, not TypeScript), but good patterns to learn from.

3. **CrewAI**
   - YAML for agents/tasks, Python for orchestration
   - Simple, declarative approach
   - **Assessment:** Good declarative patterns, but Python-based.

4. **Dagu**
   - Pure command orchestration (shell, SSH, Docker)
   - Not AI-native (no LLM integration)
   - **Assessment:** Wrong domain - designed for ETL/batch jobs, not AI workflows.

**Conclusion:** Build our own TypeScript runtime inspired by these patterns, but optimized for Catalyst's needs.

### Investigation: Claude Agent SDK

**Discovery:** Anthropic provides an official TypeScript SDK for programmatically invoking Claude.

**Key Capabilities:**
- **Programmatic invocation** - Call Claude from Node.js code
- **Tool access** - Grant Read, Write, Bash, etc. tools
- **Streaming results** - Async generator for real-time responses
- **Authentication** - Users authenticate with Claude Pro/Max subscription (no separate API billing)
- **Options** - Control model, working directory, environment variables

**Example:**
```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

const result = query({
  prompt: "Read .xe/features/blueprint/spec.md and analyze scope",
  options: {
    model: "claude-sonnet-4-5",
    cwd: process.cwd(),
    tools: ['Read', 'Write', 'Bash']
  }
});

for await (const message of result) {
  console.log(message);
}
```

**Impact:** This unlocks true execution engine capabilities - we can programmatically orchestrate Claude to execute playbook steps.

### Investigation: Declarative vs Imperative Playbook Definitions

**Question:** Should playbooks be defined as TypeScript code or declarative YAML/JSON?

**Declarative Approach (YAML):**
```yaml
id: research-feature
inputs:
  - name: feature-id
    type: string
steps:
  - id: analyze
    type: claude-prompt
    prompt: "Analyze {{feature-id}} scope..."
    tools: [Read, Write]
```

**Pros:**
- Simpler for non-developers
- Easier to validate structure
- Clear separation of data vs logic
- Can generate TypeScript types from schema

**Cons:**
- Limited expressiveness for complex logic
- Can't represent arbitrary validation

**Imperative Approach (TypeScript):**
```typescript
export const researchFeature: Playbook = {
  id: 'research-feature',
  async execute(inputs) {
    const result = await query({
      prompt: `Analyze ${inputs.featureId} scope...`
    });
    return result;
  }
};
```

**Pros:**
- Full TypeScript expressiveness
- Can implement any validation logic
- Type-safe end-to-end

**Cons:**
- Steeper learning curve
- Harder to validate structure

**Decision:** **Hybrid approach** - Start with declarative YAML for most playbooks, allow TypeScript for complex validation logic.

## Proposed Architecture

### Core Design: Multi-Task-Type Engine

**Key Insight:** Build an engine that supports multiple task types, starting with:

1. **`markdown` task type** - Executes existing markdown playbooks unchanged
2. **`claude-prompt` task type** - Structured Claude prompts (future)
3. **`bash` task type** - Shell commands (future)
4. **`checkpoint` task type** - Human approval gates (future)

This allows us to:
- ✅ Run existing playbooks immediately (via `markdown` type)
- ✅ Build the execution engine with full capabilities
- ✅ Gradually migrate playbooks to structured types as we build new features
- ✅ Compose playbooks (mix markdown and structured steps)

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Playbook Engine                        │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │           Playbook Definition (YAML)                │ │
│  │  - Metadata (id, owner, reviewers)                  │ │
│  │  - Inputs (name, type, validation)                  │ │
│  │  - Steps (task type, config, outputs)               │ │
│  └────────────────────────────────────────────────────┘ │
│                          │                               │
│                          ▼                               │
│  ┌────────────────────────────────────────────────────┐ │
│  │           Execution Runtime                         │ │
│  │  - Parse & validate playbook definition             │ │
│  │  - Map & validate inputs                            │ │
│  │  - Execute steps sequentially                        │ │
│  │  - Handle checkpoints (pause/resume)                │ │
│  │  - Track state (save progress)                      │ │
│  └────────────────────────────────────────────────────┘ │
│                          │                               │
│                          ▼                               │
│  ┌────────────────────────────────────────────────────┐ │
│  │           Task Executors                            │ │
│  │  ┌──────────────┐  ┌──────────────┐                │ │
│  │  │   markdown   │  │claude-prompt │                 │ │
│  │  │   executor   │  │   executor   │  ...            │ │
│  │  └──────────────┘  └──────────────┘                │ │
│  └────────────────────────────────────────────────────┘ │
│                          │                               │
│                          ▼                               │
│  ┌────────────────────────────────────────────────────┐ │
│  │         Claude Agent SDK                            │ │
│  │  - Programmatic Claude invocation                   │ │
│  │  - Tool access (Read, Write, Bash)                  │ │
│  │  - Streaming responses                              │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. Playbook Definition (YAML)

**Structure:**
```yaml
# playbooks/start-rollout.yaml
id: start-rollout
description: Orchestrate feature development workflow
owner: Architect
reviewers:
  required: [Engineer]
  optional: [Product Manager]

inputs:
  - name: rollout-id
    type: string
    required: true
    transform: kebab-case
  - name: execution-mode
    type: enum
    values: [manual, autonomous]
    default: manual

steps:
  # Use markdown task type for existing playbook
  - id: full-rollout
    type: markdown
    markdown: ./start-rollout.md  # Points to existing markdown
    inputs:
      rollout-id: "{{rollout-id}}"
      execution-mode: "{{execution-mode}}"

outputs:
  - .xe/features/{{rollout-id}}/spec.md
  - .xe/features/{{rollout-id}}/plan.md
  - .xe/features/{{rollout-id}}/tasks.md
```

**Future: Structured steps**
```yaml
steps:
  - id: research
    type: claude-prompt
    prompt: |
      Read .xe/features/blueprint/spec.md and analyze {{rollout-id}}.
      Create .xe/features/{{rollout-id}}/research.md with findings.
    tools: [Read, Write]
    outputs:
      - .xe/features/{{rollout-id}}/research.md

  - id: approve-research
    type: checkpoint
    message: "Review research.md before continuing"

  - id: create-spec
    type: claude-prompt
    prompt: "Create spec based on research..."
    tools: [Read, Write]
    outputs:
      - .xe/features/{{rollout-id}}/spec.md
```

#### 2. Execution Runtime

**Core orchestration engine:**

```typescript
// src/playbooks/runtime/engine.ts

export class PlaybookEngine {
  constructor(
    private registry: PlaybookRegistry,
    private executors: Map<string, TaskExecutor>
  ) {}

  async execute(
    playbookId: string,
    inputs: Record<string, any>,
    options?: ExecutionOptions
  ): Promise<ExecutionResult> {
    // 1. Load playbook definition
    const playbook = this.registry.get(playbookId);
    if (!playbook) throw new Error(`Playbook not found: ${playbookId}`);

    // 2. Validate inputs
    const validatedInputs = this.validateInputs(inputs, playbook.inputs);

    // 3. Create execution context
    const context = new ExecutionContext(playbook, validatedInputs);

    // 4. Execute steps sequentially
    for (const step of playbook.steps) {
      // Get executor for task type
      const executor = this.executors.get(step.type);
      if (!executor) throw new Error(`Unknown task type: ${step.type}`);

      // Execute step
      console.log(`Executing step: ${step.id} (${step.type})`);
      const result = await executor.execute(step, context);

      // Save result to context
      context.setStepResult(step.id, result);

      // Handle checkpoints
      if (step.checkpoint) {
        await this.handleCheckpoint(step, context);
      }

      // Save state (for resume capability)
      await this.saveState(context);
    }

    // 5. Validate outputs
    await this.validateOutputs(playbook.outputs, context);

    return new ExecutionResult(context);
  }

  private async handleCheckpoint(step: Step, context: ExecutionContext) {
    if (context.options.executionMode === 'autonomous') {
      // Auto-approve in autonomous mode
      return;
    }

    // Pause and wait for human approval
    console.log(`\n🔔 Checkpoint: ${step.id}`);
    console.log(`Review outputs and approve to continue...`);

    // In CLI: wait for user input
    // In future: create GitHub issue, wait for comment
    await this.waitForApproval(step, context);
  }
}
```

#### 3. Task Executors

**Markdown Executor (runs existing playbooks):**

```typescript
// src/playbooks/runtime/executors/markdown.ts

export class MarkdownTaskExecutor implements TaskExecutor {
  async execute(step: Step, context: ExecutionContext): Promise<TaskResult> {
    const { markdown, inputs } = step.config;

    // 1. Read markdown playbook
    const markdownContent = fs.readFileSync(markdown, 'utf-8');

    // 2. Replace placeholders with actual inputs
    const prompt = this.interpolate(markdownContent, {
      ...context.inputs,
      ...inputs
    });

    // 3. Invoke Claude Agent SDK
    const result = query({
      prompt: `You are executing a Catalyst playbook. Follow the instructions below exactly:\n\n${prompt}`,
      options: {
        model: "claude-sonnet-4-5",
        cwd: context.workingDirectory,
        tools: ['Read', 'Write', 'Bash', 'Grep', 'Glob']
      }
    });

    // 4. Stream and collect results
    const messages: string[] = [];
    for await (const message of result) {
      messages.push(message.content);
      // Optionally: stream to console in real-time
      console.log(message.content);
    }

    return new TaskResult({
      success: true,
      messages,
      outputs: step.outputs
    });
  }

  private interpolate(template: string, vars: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '');
  }
}
```

**Claude Prompt Executor (future):**

```typescript
// src/playbooks/runtime/executors/claude-prompt.ts

export class ClaudePromptTaskExecutor implements TaskExecutor {
  async execute(step: Step, context: ExecutionContext): Promise<TaskResult> {
    const { prompt, tools } = step.config;

    // Interpolate variables in prompt
    const interpolatedPrompt = this.interpolate(prompt, context.inputs);

    // Invoke Claude
    const result = query({
      prompt: interpolatedPrompt,
      options: {
        model: "claude-sonnet-4-5",
        cwd: context.workingDirectory,
        tools: tools || ['Read', 'Write']
      }
    });

    // Collect results
    const messages: string[] = [];
    for await (const message of result) {
      messages.push(message.content);
    }

    // Validate outputs exist
    for (const outputPath of step.outputs || []) {
      const fullPath = path.join(context.workingDirectory, outputPath);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Expected output not found: ${outputPath}`);
      }
    }

    return new TaskResult({
      success: true,
      messages,
      outputs: step.outputs
    });
  }
}
```

**Checkpoint Executor (future):**

```typescript
// src/playbooks/runtime/executors/checkpoint.ts

export class CheckpointTaskExecutor implements TaskExecutor {
  async execute(step: Step, context: ExecutionContext): Promise<TaskResult> {
    const { message } = step.config;

    if (context.options.executionMode === 'autonomous') {
      // Auto-approve
      return TaskResult.success();
    }

    // Interactive mode: wait for user
    console.log(`\n🔔 Checkpoint: ${message}`);
    console.log(`Press ENTER to continue...`);

    // Wait for user input
    await this.waitForInput();

    return TaskResult.success();
  }

  private async waitForInput(): Promise<void> {
    return new Promise((resolve) => {
      process.stdin.once('data', () => resolve());
    });
  }
}
```

#### 4. State Management

**Execution state for pause/resume:**

```typescript
// src/playbooks/runtime/state.ts

export interface ExecutionState {
  playbookId: string;
  startTime: Date;
  currentStep: number;
  inputs: Record<string, any>;
  stepResults: Map<string, TaskResult>;
  status: 'running' | 'paused' | 'completed' | 'failed';
}

export class StateManager {
  async saveState(context: ExecutionContext): Promise<void> {
    const state: ExecutionState = {
      playbookId: context.playbook.id,
      startTime: context.startTime,
      currentStep: context.currentStepIndex,
      inputs: context.inputs,
      stepResults: context.stepResults,
      status: context.status
    };

    // Save to file system (simple approach)
    const statePath = `.xe/playbook-state/${context.executionId}.json`;
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  }

  async loadState(executionId: string): Promise<ExecutionState | null> {
    const statePath = `.xe/playbook-state/${executionId}.json`;
    if (!fs.existsSync(statePath)) return null;

    const content = fs.readFileSync(statePath, 'utf-8');
    return JSON.parse(content);
  }

  async resume(executionId: string): Promise<ExecutionResult> {
    const state = await this.loadState(executionId);
    if (!state) throw new Error(`No saved state for execution: ${executionId}`);

    // Resume from saved state
    // ... continue execution from currentStep
  }
}
```

#### 5. Playbook Composition

**Sub-playbook execution:**

```yaml
# playbooks/start-rollout-decomposed.yaml
id: start-rollout-decomposed
description: Feature rollout broken into sub-playbooks

inputs:
  - name: rollout-id
    type: string
    required: true

steps:
  # Step 1: Research phase (creates PR #1)
  - id: research
    type: sub-playbook
    playbook: research-feature
    inputs:
      feature-id: "{{rollout-id}}"
    checkpoint: true  # Wait for PR merge

  # Step 2: Spec phase (creates PR #2)
  - id: spec
    type: sub-playbook
    playbook: create-spec
    inputs:
      feature-id: "{{rollout-id}}"
    checkpoint: true

  # Step 3: Plan phase (creates PR #3)
  - id: plan
    type: sub-playbook
    playbook: create-plan
    inputs:
      feature-id: "{{rollout-id}}"
    checkpoint: true

  # Step 4: Implementation (creates PR #4+)
  - id: implement
    type: sub-playbook
    playbook: implement-feature
    inputs:
      feature-id: "{{rollout-id}}"
```

```typescript
// Sub-playbook executor
export class SubPlaybookTaskExecutor implements TaskExecutor {
  constructor(private engine: PlaybookEngine) {}

  async execute(step: Step, context: ExecutionContext): Promise<TaskResult> {
    const { playbook, inputs } = step.config;

    // Execute child playbook
    const result = await this.engine.execute(playbook, inputs);

    return result;
  }
}
```

### File Structure

```
src/
├── playbooks/
│   ├── runtime/
│   │   ├── engine.ts              # Core execution engine
│   │   ├── registry.ts            # Playbook discovery
│   │   ├── context.ts             # Execution context
│   │   ├── state.ts               # State management
│   │   ├── types.ts               # Core types
│   │   ├── executors/
│   │   │   ├── markdown.ts        # Markdown task executor
│   │   │   ├── claude-prompt.ts   # Claude prompt executor
│   │   │   ├── checkpoint.ts      # Checkpoint executor
│   │   │   ├── sub-playbook.ts    # Sub-playbook executor
│   │   │   └── index.ts           # Executor registry
│   │   └── index.ts               # Public API
│   ├── definitions/               # YAML playbook definitions
│   │   ├── start-rollout.yaml
│   │   ├── start-blueprint.yaml
│   │   ├── update-pull-request.yaml
│   │   ├── research-feature.yaml  # New decomposed playbooks
│   │   ├── create-spec.yaml
│   │   ├── create-plan.yaml
│   │   └── implement-feature.yaml
│   ├── start-rollout.md           # Existing markdown (unchanged)
│   ├── start-blueprint.md
│   ├── update-pull-request.md
│   └── scripts/
│       ├── run-playbook.ts        # CLI: Execute a playbook
│       ├── validate-playbook.ts   # CLI: Validate playbook definition
│       └── list-playbooks.ts      # CLI: List available playbooks

tests/playbooks/
├── runtime/
│   ├── engine.test.ts
│   ├── markdown-executor.test.ts
│   ├── state-manager.test.ts
│   └── integration.test.ts
└── fixtures/
    └── test-playbook.yaml
```

## Implementation Strategy

### Phase 1: Core Runtime (Week 1-2)

**Goal:** Build the execution engine with markdown executor.

**Deliverables:**
1. Core types and interfaces
2. Playbook registry and loader
3. Execution engine with sequential step processing
4. Markdown task executor (runs existing playbooks via Claude SDK)
5. Basic state management (save/load)
6. CLI tool to run playbooks

**Validation:** Can execute existing `start-rollout.md` via engine.

### Phase 2: Structured Executors (Week 3)

**Goal:** Add structured task types.

**Deliverables:**
1. Claude prompt executor
2. Checkpoint executor (human-in-the-loop)
3. Bash executor (run shell commands)
4. Input validation and transformation
5. Output validation

**Validation:** Can run a simple structured playbook with checkpoints.

### Phase 3: Composition (Week 4)

**Goal:** Enable sub-playbook execution.

**Deliverables:**
1. Sub-playbook executor
2. Break `start-rollout` into smaller playbooks:
   - `research-feature.yaml`
   - `create-spec.yaml`
   - `create-plan.yaml`
   - `create-tasks.yaml`
   - `implement-feature.yaml`
3. Composed `start-rollout-decomposed.yaml`

**Validation:** Can run decomposed rollout with independent PRs per phase.

### Phase 4: Testing & Polish (Week 5)

**Goal:** Comprehensive tests and documentation.

**Deliverables:**
1. Unit tests for all executors (90% coverage)
2. Integration tests for full playbook execution
3. Error handling and recovery
4. Documentation and examples
5. Migration guide for future playbook authors

**Validation:** All tests passing, existing playbooks work unchanged.

## Technical Decisions

### Decision 1: YAML vs TypeScript for Playbook Definitions

**Decision:** Start with YAML, allow TypeScript for custom validation.

**Rationale:**
- YAML is simpler and more accessible
- Can validate structure easily
- TypeScript available when needed for complex logic
- Matches patterns from CrewAI, Dagu

### Decision 2: Task Type Extensibility

**Decision:** Build extensible task executor system.

**Rationale:**
- Can add new task types without changing core engine
- Enables markdown executor as first-class citizen (not a hack)
- Future task types (HTTP, database, etc.) are easy to add

### Decision 3: State Persistence Strategy

**Decision:** Simple file-based state in `.xe/playbook-state/`.

**Rationale:**
- KISS - no database needed
- Git-compatible (can version control state)
- Easy to debug (just JSON files)
- Can upgrade to Redis/Postgres later if needed

### Decision 4: Claude Agent SDK Authentication

**Decision:** Use user's Claude Pro/Max subscription.

**Rationale:**
- No separate API billing
- Users already have subscription for Claude Code IDE
- Aligns with Catalyst's consumer-friendly positioning

### Decision 5: Gradual Migration Strategy

**Decision:** Support existing markdown playbooks indefinitely via markdown executor.

**Rationale:**
- Zero migration cost - existing playbooks work immediately
- Can convert playbooks incrementally as we build new features
- No "big bang" rewrite
- Validates engine with real workloads

## Risk Assessment

### Technical Risks

**Risk:** Claude Agent SDK is still evolving (preview status)
- **Mitigation:** Abstract SDK calls behind interface, easy to swap implementations
- **Fallback:** Fall back to current markdown approach if SDK breaks

**Risk:** Execution state could become corrupted
- **Mitigation:** Version state schema, validate on load
- **Fallback:** Manual recovery instructions in documentation

**Risk:** Markdown executor may not capture all current behavior
- **Mitigation:** Extensive testing with all existing playbooks
- **Fallback:** Keep existing `/catalyst:run` command as backup

### Process Risks

**Risk:** Scope creep (trying to solve too much)
- **Mitigation:** Strict phased approach, ship incremental value
- **Monitoring:** Weekly progress check against milestones

**Risk:** Breaking existing workflows during migration
- **Mitigation:** Existing markdown playbooks continue to work unchanged
- **Monitoring:** Integration tests validate backward compatibility

## Dependencies

### Internal Dependencies

**From Catalyst features:**
- ✅ product-context (T001) - Complete
- ✅ engineering-context (T002) - Complete
- ✅ feature-context (T003) - Complete
- ⚠️  github-integration (T004) - In parallel, coordinate on GitHub script interfaces

**Used by future features:**
- slash-command-integration (T006) - Uses playbook engine
- autonomous-orchestration (Phase 2) - Extends engine with triggers
- custom-playbooks (Phase 4) - Uses engine for custom workflows

### External Dependencies

**Runtime:**
- `@anthropic-ai/claude-agent-sdk` - Claude invocation
- `js-yaml` - YAML parsing
- Node.js >= 18 (for native TypeScript support)

**Development:**
- Jest - Testing
- ts-jest - TypeScript testing
- TypeScript >= 5.0

### Authentication Dependency

**Critical:** Users must have Claude Pro/Max subscription ($17/mo) to use playbook engine.

**Impact:** Document clearly in README and installation guide.

## Success Criteria

This feature is successful when:

- [x] Research complete with clear architectural direction
- [ ] Execution engine implemented with markdown executor
- [ ] Can run all existing playbooks via engine unchanged
- [ ] Structured task types (claude-prompt, checkpoint) implemented
- [ ] Sub-playbook composition working
- [ ] start-rollout decomposed into independent PRs
- [ ] 90% test coverage achieved
- [ ] Documentation complete with examples
- [ ] Zero breaking changes to existing workflows

## Next Steps

After research approval:

1. **Create Feature Spec** (`.xe/features/playbook-engine/spec.md`)
   - Functional requirements for execution engine
   - Non-functional requirements (performance, reliability)
   - Success criteria for implementation

2. **Create Implementation Plan** (`.xe/features/playbook-engine/plan.md`)
   - Detailed API designs for engine, executors, state manager
   - File structure and module organization
   - Testing strategy

3. **Create Task Breakdown** (`.xe/features/playbook-engine/tasks.md`)
   - Phase 1: Core runtime (Week 1-2)
   - Phase 2: Structured executors (Week 3)
   - Phase 3: Composition (Week 4)
   - Phase 4: Testing & polish (Week 5)

4. **Begin Implementation**
   - Start with core types and engine
   - Add markdown executor
   - Validate with existing playbooks
   - Add structured executors incrementally

## Open Questions

### For User Review

1. **YAML vs TypeScript:** Comfortable with YAML for playbook definitions, TypeScript for custom validation?

2. **Claude SDK Usage:** Comfortable requiring users to have Claude Pro/Max subscription?

3. **Migration Timeline:** When to convert existing playbooks to structured format?
   - Option A: Convert all now (big refactor)
   - Option B: Convert incrementally as we build new features (recommended)
   - Option C: Keep markdown indefinitely

4. **Checkpoint UX:** How should checkpoints work in CLI?
   - Option A: Pause and wait for ENTER key
   - Option B: Create GitHub issue, wait for comment
   - Option C: Both (configurable)

5. **Scope Confirmation:** 5-week timeline for complete engine acceptable?

## References

### External Documentation
- Claude Agent SDK: https://docs.claude.com/en/api/agent-sdk/typescript
- Microsoft Agent Framework: https://github.com/microsoft/agent-framework
- LangGraph: https://github.com/langchain-ai/langgraph
- CrewAI: https://github.com/crewAIInc/crewAI
- Dagu: https://github.com/dagu-org/dagu

### Internal Documentation
- Blueprint spec: `.xe/features/blueprint/spec.md`
- Blueprint plan: `.xe/features/blueprint/plan.md`
- Architecture: `.xe/architecture.md`
- Engineering principles: `.xe/engineering.md`
- Existing playbooks: `src/playbooks/*.md`
- GitHub integration: `src/playbooks/scripts/github.ts`
