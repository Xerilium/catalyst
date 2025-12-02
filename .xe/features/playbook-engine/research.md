---
id: playbook-engine
title: Playbook Engine
author: "@flanakin"
description: "TypeScript workflow execution engine providing step sequencing, composition, checkpoints, and resume capabilities"
---

# Research: Playbook Engine

> **Executive Summary**
>
> Build a TypeScript execution engine that orchestrates playbook workflows through action-based step execution. The engine operates on `Playbook` interface instances (format-agnostic), delegates step configuration interpolation to the template engine, and invokes registered actions for each step. This design enables reliable, testable, and composable workflows with pause/resume capability and human checkpoints.
>
> **Key Decision:** Focus the engine on execution orchestration, not playbook format. Playbook loading from YAML/JSON is delegated to the playbook-yaml feature. The engine works with any source that produces `Playbook` interface instances, ensuring clean separation of concerns.

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

### Investigation: Engine Architecture Pattern

**Question:** Should the engine be responsible for playbook loading, or just execution?

**Option A: Integrated Engine (Load + Execute)**
- Engine handles YAML parsing, validation, and execution
- Tightly couples format to engine implementation
- Harder to test, harder to extend to new formats

**Option B: Separated Engine (Execute Only)**
- Engine accepts `Playbook` interface instances
- Playbook loading is delegated to separate feature (playbook-yaml)
- Clean separation: format vs execution logic
- Testable with in-memory `Playbook` objects

**Decision:** Option B - Separated Engine

**Rationale:**
- Follows Single Responsibility Principle - engine orchestrates, loader parses
- Enables format-agnostic execution (YAML, JSON, TypeScript all produce `Playbook`)
- Simplifies testing - no need for file fixtures, use TypeScript objects
- Aligns with dependency architecture - engine depends on playbook-definition (interfaces), not playbook-yaml (format)

### Investigation: Action Registration Pattern

**Question:** How should actions be discovered and registered?

**Option A: Manual Registration**
```typescript
engine.registerAction('file-write', new FileWriteAction());
engine.registerAction('http-get', new HttpGetAction());
```

**Option B: Convention-Based Discovery**
- Scan `src/playbooks/actions/` directory
- Auto-register classes implementing `PlaybookAction`
- Use `@Action('name')` decorator for explicit naming

**Option C: Hybrid**
- Convention-based discovery at startup
- Manual registration API for extensibility

**Decision:** Option C - Hybrid Approach

**Rationale:**
- Convention-based reduces boilerplate for built-in actions
- Manual registration enables testing and third-party extensions
- Decorator pattern provides explicit control when needed
- Matches extensibility principle from product requirements

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

### Investigation: Template Interpolation Strategy

**Question:** Should the engine handle template interpolation, or delegate to a separate component?

**Option A: Engine Handles Interpolation**
- Engine directly replaces `{{variable}}` and `${{ expression }}` in configs
- Simple, but couples engine to template syntax

**Option B: Delegate to Template Engine**
- Engine calls template engine to interpolate step configs
- Clean separation of concerns
- Template engine can be tested independently

**Decision:** Option B - Delegate to playbook-template-engine feature

**Rationale:**
- Follows dependency inversion - engine depends on template engine abstraction
- Template engine handles security (sandboxing, secret masking)
- Engine remains focused on orchestration, not string manipulation
- Aligns with spec dependencies (playbook-template-engine is listed dependency)

### Investigation: State Persistence Strategy

**Question:** Where and how should execution state be persisted?

**Options Evaluated:**
- Database (PostgreSQL, Redis) - Too heavyweight for file-based tool
- In-memory only - Loses state on crash, no resume capability
- File-based JSON - Simple, git-compatible, human-readable

**Decision:** File-based JSON with atomic writes

**File Structure:**
- Active runs: `.xe/runs/run-{runId}.json`
- Archived runs: `.xe/runs/history/{YYYY}/{MM}/{DD}/run-{runId}.json`
- Lock files: `.xe/runs/locks/run-{runId}.lock`

**Rationale:**
- KISS principle - no external dependencies
- Git-compatible for version control and multi-machine resume
- Human-readable for debugging
- Atomic writes prevent corruption
- Aligns with file-based context architecture (.xe directory pattern)

## Proposed Architecture

### Core Design: Action-Based Execution Engine

**Key Insight:** Build an execution engine that orchestrates workflows by:

1. **Accepting `Playbook` interfaces** - Format-agnostic (YAML loading is separate feature)
2. **Registering actions** - Convention-based discovery + manual registration
3. **Interpolating step configs** - Delegating to template engine before execution
4. **Invoking actions** - Looking up action by type, calling `execute(config)`
5. **Managing state** - Persisting progress after each step for resume capability

This architecture provides:
- ✅ Clean separation: format (YAML) vs execution (engine) vs template (interpolation)
- ✅ Extensibility via action registration (no engine modification needed)
- ✅ Testability with in-memory `Playbook` objects
- ✅ Composability through `playbook` action type
- ✅ Resume capability via state persistence

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Playbook Engine                            │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         PlaybookEngine.run(playbook, inputs)            │ │
│  │  - Validate playbook structure                          │ │
│  │  - Validate and map inputs                              │ │
│  │  - Create PlaybookContext with state                    │ │
│  │  - Execute steps sequentially                           │ │
│  │  - Persist state after each step                        │ │
│  │  - Return ExecutionResult                               │ │
│  └────────────────────────────────────────────────────────┘ │
│                          │                                   │
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Step Execution Loop (for each step)             │ │
│  │  1. Interpolate config via TemplateEngine               │ │
│  │  2. Lookup action from ActionRegistry                   │ │
│  │  3. Invoke action.execute(config)                       │ │
│  │  4. Store result in context.variables                   │ │
│  │  5. Apply error policy if step fails                    │ │
│  │  6. Persist state via StatePersistence                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                          │                                   │
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Dependencies (from other features)         │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │ │
│  │  │ActionRegistry│  │TemplateEngine│  │StatePersist │  │ │
│  │  │ (built-in)   │  │(playbook-    │  │(playbook-   │  │ │
│  │  │              │  │ template-    │  │definition)  │  │ │
│  │  │              │  │ engine)      │  │             │  │ │
│  │  └──────────────┘  └──────────────┘  └─────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
│                          │                                   │
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Registered Actions (from action features)       │ │
│  │  file-write, file-read, http-get, ai-prompt,            │ │
│  │  checkpoint, playbook, if, var, github-*, script-*      │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
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

**Example: Converting new-blueprint-issue.md to TypeScript**

**Original Markdown Playbook:**
```markdown
---
owner: "Product Manager"
reviewers:
  required: []
  optional: ["Architect"]
triggers: []
---

# Playbook: new-blueprint-issue

Generates a GitHub issue for blueprint creation, optionally using init issue context.

## Inputs

- `init-issue-number` (optional) - The init issue number to use for context

## Outputs

- GitHub issue with blueprint template

## Execute

1. Gather context:
   - If `init-issue-number` provided: Fetch init issue with comments via `npx catalyst-github issue get {issue-number} --with-comments`
   - Read `.xe/product.md` for product vision and goals
   - Read `.xe/architecture.md` for technical context
2. Analyze requirements and draft comprehensive blueprint issue content:
   - **Phased Implementation**: Propose MVP capabilities vs future phases based on goals and complexity
   - **Primary User Workflow**: Describe high-level user journey through Phase 1 capabilities
   - **Additional Context**: Include relevant constraints and priorities from init issue and context files
3. Create issue with drafted content:
   - Run `node node_modules/@xerilium/catalyst/playbooks/scripts/new-blueprint-issue.js --content={drafted-content}`
   - Script validates (checks for existing issues, GitHub CLI, gets project name)
   - Script creates issue and returns URL
4. Provide issue URL to user

## Success criteria

- [ ] GitHub issue created with blueprint template
- [ ] Issue pre-filled with context if init issue provided
```

**Converted to TypeScript Playbook Definition:**
```typescript
// src/playbooks/definitions/new-blueprint-issue.ts

import { Playbook, PlaybookInput, PlaybookOutput } from '../runtime/types';
import { GitHubAdapter } from '../adapters/github';
import { AIAdapter } from '../adapters/ai';

export interface NewBlueprintIssueInputs {
  initIssueNumber?: number;
}

export interface NewBlueprintIssueOutputs {
  issueUrl: string;
  issueNumber: number;
}

export const newBlueprintIssuePlaybook: Playbook<NewBlueprintIssueInputs, NewBlueprintIssueOutputs> = {
  id: 'new-blueprint-issue',
  description: 'Generates a GitHub issue for blueprint creation, optionally using init issue context',
  owner: 'Product Manager',
  reviewers: {
    required: [],
    optional: ['Architect']
  },

  inputs: [
    {
      name: 'initIssueNumber',
      type: 'number',
      required: false,
      description: 'The init issue number to use for context'
    }
  ],

  outputs: [
    {
      name: 'issueUrl',
      type: 'string',
      description: 'URL of the created GitHub issue'
    },
    {
      name: 'issueNumber',
      type: 'number',
      description: 'Number of the created GitHub issue'
    }
  ],

  async execute(inputs: NewBlueprintIssueInputs, context): Promise<NewBlueprintIssueOutputs> {
    const github = new GitHubAdapter();
    const ai = new AIAdapter();

    // Step 1: Gather context
    let initContext = '';
    if (inputs.initIssueNumber) {
      const initIssue = await github.getIssue(inputs.initIssueNumber, { withComments: true });
      initContext = `Init Issue Context:\n${initIssue.title}\n${initIssue.body}\n\nComments:\n${initIssue.comments.join('\n')}`;
    }

    const productContext = await context.readFile('.xe/product.md');
    const architectureContext = await context.readFile('.xe/architecture.md');

    // Step 2: Analyze requirements and draft content
    const prompt = `
You are creating a comprehensive blueprint issue for a new feature.

Context:
${initContext}

Product Vision:
${productContext}

Technical Architecture:
${architectureContext}

Please draft a blueprint issue that includes:
- Phased Implementation: Propose MVP capabilities vs future phases based on goals and complexity
- Primary User Workflow: Describe high-level user journey through Phase 1 capabilities
- Additional Context: Include relevant constraints and priorities from the provided context

Format the response as a complete GitHub issue body with sections for:
- Overview
- Requirements
- Implementation Plan
- Success Criteria
`;

    const draftContent = await ai.generate(prompt);

    // Step 3: Create issue
    const issue = await github.createIssue({
      title: 'Blueprint: [Feature Name]',
      body: draftContent,
      labels: ['blueprint', 'planning']
    });

    // Step 4: Return results
    return {
      issueUrl: issue.url,
      issueNumber: issue.number
    };
  }
};
```

This TypeScript example demonstrates:
- Strong typing for inputs/outputs
- Async execution with proper error handling
- Integration with adapters (GitHub, AI)
- Context-aware file operations
- Structured result validation

**Example: new-blueprint-issue playbook in TypeScript**

```typescript
// Converted from src/playbooks/new-blueprint-issue.md
// Demonstrates programmatic playbook implementation

import { PlaybookEngine, ExecutionContext, TaskResult } from '../runtime';
import { GitHubAdapter } from '../adapters/github';
import { ClaudeAdapter } from '../adapters/claude';

export interface NewBlueprintIssueInputs {
  'init-issue-number'?: number;
}

export interface NewBlueprintIssueOutputs {
  issueUrl: string;
}

export class NewBlueprintIssuePlaybook {
  constructor(
    private github: GitHubAdapter,
    private claude: ClaudeAdapter
  ) {}

  async execute(inputs: NewBlueprintIssueInputs): Promise<NewBlueprintIssueOutputs> {
    // Step 1: Gather context
    let context = '';
    
    if (inputs['init-issue-number']) {
      // Fetch init issue with comments
      const issue = await this.github.getIssue(inputs['init-issue-number']);
      context += `Init Issue: ${issue.title}\n${issue.body}\n\nComments:\n`;
      for (const comment of issue.comments) {
        context += `- ${comment.body}\n`;
      }
      context += '\n';
    }

    // Read product vision and goals
    const productMd = await this.readFile('.xe/product.md');
    context += `Product Context:\n${productMd}\n\n`;

    // Read technical context
    const architectureMd = await this.readFile('.xe/architecture.md');
    context += `Technical Context:\n${architectureMd}\n\n`;

    // Step 2: Analyze requirements and draft content
    const draftPrompt = `You are creating a GitHub issue for blueprint creation. Analyze the following context and draft comprehensive blueprint issue content:

Context:
${context}

Requirements:
- Propose MVP capabilities vs future phases based on goals and complexity
- Describe high-level user journey through Phase 1 capabilities
- Include relevant constraints and priorities from init issue and context files

Output a complete GitHub issue body with:
- Title suggestion
- Description with phased implementation approach
- Primary user workflow
- Additional context sections

Be specific and actionable.`;

    const draftResponse = await this.claude.prompt(draftPrompt);
    const issueContent = draftResponse.content;

    // Step 3: Create issue
    const issueTitle = `Blueprint: ${this.extractTitleSuggestion(issueContent)}`;
    const issue = await this.github.createIssue({
      title: issueTitle,
      body: issueContent,
      labels: ['blueprint', 'product']
    });

    return {
      issueUrl: issue.url
    };
  }

  private async readFile(path: string): Promise<string> {
    // Implementation would read file from workspace
    return ''; // Placeholder
  }

  private extractTitleSuggestion(content: string): string {
    // Extract title from Claude response
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.startsWith('# ')) {
        return line.substring(2).trim();
      }
    }
    return 'Product Blueprint';
  }
}
```

This TypeScript example shows how the new-blueprint-issue playbook could be implemented programmatically, with proper error handling, type safety, and integration with GitHub and AI adapters.

#### 2. Execution Runtime

**Core orchestration engine:**

```typescript
// src/playbooks/runtime/engine.ts

export class PlaybookEngine {
  constructor(
    private registry: convention-based discovery,
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
    // Persist live run snapshots to `.xe/runs/run-{runId}.json`.
    // Rollout documents are authored as markdown under `.xe/rollouts/rollout-{rollout-id}.md`.
    const statePath = `.xe/runs/run-${context.runId}.json`;
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  }

  async loadRun(runId: string): Promise<ExecutionState | null> {
    const statePath = `.xe/runs/run-${runId}.json`;
    if (!fs.existsSync(statePath)) return null;

    const content = fs.readFileSync(statePath, 'utf-8');
    return JSON.parse(content);
  }

  async resume(runId: string): Promise<ExecutionResult> {
    const state = await this.loadState(runId);
    if (!state) throw new Error(`No saved state for execution: ${runId}`);

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

**Decision:** Simple file-based run snapshots for live executions under `.xe/runs/` named `run-{runId}.json` with completed runs archived to `.xe/runs/history/{YYYY}/{MM}/{DD}/`. Rollout plans and human-facing orchestrators remain markdown files under `.xe/rollouts/rollout-{rollout-id}.md`. This keeps run telemetry separate from canonical rollout documents to avoid confusion.

Run naming: `runId` should use the format `{yyyy}-{MM}-{dd}-{HHmm}_{platform}-{agent}_{playbook-name}_{index3}` (e.g. `2025-11-14-1530_claude-general_do-something_001`). Use `general` for the `agent` placeholder when the run is created by a non-specialized agent.

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

## Architecture Summary

### Key Design Decisions

1. **Separation of Concerns**
   - **playbook-definition**: Defines `Playbook`, `PlaybookStep`, `PlaybookAction` interfaces
   - **playbook-yaml**: Loads YAML files, produces `Playbook` instances
   - **playbook-template-engine**: Handles template interpolation and security
   - **playbook-engine**: Orchestrates execution (this feature)
   - **playbook-actions-***: Implement specific action types

2. **Action-Based Execution**
   - Steps specify `action` type and `config` object
   - Engine looks up action in `ActionRegistry`
   - Calls `action.execute(config)` with interpolated config
   - Stores result in context.variables for subsequent steps

3. **Template Delegation**
   - Engine calls `templateEngine.interpolateObject(step.config, context)`
   - Template engine resolves `{{variable}}` and `${{ expression }}`
   - Engine receives fully interpolated config, passes to action

4. **State Persistence**
   - Active runs: `.xe/runs/run-{runId}.json`
   - Archived runs: `.xe/runs/history/{YYYY}/{MM}/{DD}/run-{runId}.json`
   - Atomic writes prevent corruption
   - Git-compatible for multi-machine resume

5. **Lock Management**
   - Resource locks prevent concurrent conflicts
   - Lock files: `.xe/runs/locks/run-{runId}.lock`
   - TTL-based stale lock cleanup
   - Acquired after pre-flight validation

### Implementation Priorities

**Phase 1: Core Engine**
- PlaybookEngine class with run() and resume() methods
- ActionRegistry with registration and lookup
- Basic step execution loop
- State persistence integration
- Input validation

**Phase 2: Composition & Checkpoints**
- Playbook action for composition
- Checkpoint action for human approval
- Error policy evaluation
- Catch/finally blocks

**Phase 3: Advanced Features**
- Resource locking (LockManager)
- Parallel execution (optional)
- What-if/dry-run mode
- Authorization helper (executeIfAllowed)

**Phase 4: Testing & Polish**
- 90% code coverage
- Integration tests with mock actions
- Error handling edge cases
- Performance validation (<5% overhead)

## Next Steps

1. ✅ **Feature Spec** - Complete (spec.md updated with TypeScript API)
2. ⏭️  **Implementation Plan** - Create detailed plan with module breakdown
3. ⏭️  **Task Breakdown** - Create tasks for phased implementation
4. ⏭️  **Begin Implementation** - Start with core engine and registry

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
