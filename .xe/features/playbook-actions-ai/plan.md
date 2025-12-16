---
id: playbook-actions-ai
title: Playbook Actions - AI
author: "@flanakin"
description: "Implementation plan for the AI prompt action"
dependencies:
  - playbook-definition
  - error-handling
  - ai-provider
---

# Implementation Plan: Playbook Actions - AI

**Spec**: [Feature spec](./spec.md)

---

## Summary

This feature implements the `ai-prompt` playbook action for integrating AI capabilities into Catalyst workflows. The action is implemented as a TypeScript class implementing `PlaybookAction<AIPromptConfig>` from playbook-definition. It handles role-based system prompt generation, context file assembly, return value extraction via output files, and inactivity-based timeout management.

**Design rationale**: Reference `research.md` for detailed analysis of AI SDK capabilities, authentication patterns, and provider implementation guidance.

---

## Technical Context

This feature implementation plan extends the technical architecture defined in `.xe/architecture.md`.

**Feature-specific technical details:**

- **Primary Components**: AIPromptAction class, role mapping utilities, context assembly utilities
- **Data Structures**: AIPromptConfig interface (AIProviderRequest/Response/UsageStats are in ai-provider)
- **Dependencies**: playbook-definition (PlaybookAction interface), error-handling (CatalystError), ai-provider (AIProvider interface, factory), Node.js fs/path for temp files
- **Configuration**: Role mappings for Product Manager, Engineer, Architect; default provider 'claude'; default inactivity timeout 300000ms
- **Performance Goals**: Provider instantiation <10ms, action overhead <100ms (excluding AI response time)
- **Testing Framework**: Jest with ts-jest, 90% code coverage target, 100% for error paths
- **Key Constraints**: Context written to temp files to avoid formatting conflicts; return values extracted from output files; inactivity-based timeout (not wall-clock)

---

## Project Structure

```
src/playbooks/actions/ai/
  types.ts                # AIPromptConfig interface
  errors.ts               # AIPromptErrors factory
  roles.ts                # Role name to system prompt mapping
  context.ts              # Context file assembly utilities
  ai-prompt-action.ts     # Main action implementation
  index.ts                # Public API exports
tests/actions/ai/
  ai-prompt-action.test.ts        # Action tests
  roles.test.ts                   # Role mapping tests
  context.test.ts                 # Context assembly tests
  integration.test.ts             # Integration tests
```

---

## Data Model

**Entities owned by this feature:**

- **AIPromptConfig**: Configuration for ai-prompt action
  - `prompt`: string (required, supports interpolation)
  - `role`: string (optional, role name or custom system prompt)
  - `context`: Record<string, unknown> (optional, name-value pairs)
  - `return`: string (optional, describes expected output)
  - `provider`: string (optional, default: 'claude')
  - `model`: string (optional, provider-specific)
  - `maxTokens`: number (optional, provider-specific default)
  - `inactivityTimeout`: number (optional, default: 300000ms)

**Entities from ai-provider feature:**

- **AIProviderRequest**: Input to AIProvider.execute()
- **AIProviderResponse**: Output from AIProvider.execute()
- **AIUsageStats**: Token usage tracking

**Entities from other features:**

- **PlaybookAction<TConfig>** (playbook-definition): Interface for action implementations
- **PlaybookActionResult** (playbook-definition): Standard result structure
- **CatalystError** (error-handling): Error class with code and guidance

---

## Contracts

### AIPromptAction Class

**Signature:**

```typescript
class AIPromptAction implements PlaybookAction<AIPromptConfig> {
  static readonly actionType = 'ai-prompt';
  readonly primaryProperty = 'prompt';

  constructor();

  async execute(config: AIPromptConfig, context: PlaybookContext): Promise<PlaybookActionResult>;
}
```

**Purpose:** Executes AI prompts using configured provider with role-based system prompts and context file assembly

**Parameters:**

- `config` (AIPromptConfig): Action configuration with prompt, role, context, return, provider, etc.
- `context` (PlaybookContext): Playbook execution context including owner for default role

**Returns:** PlaybookActionResult with code='Success', value=output file contents (if return specified), usage stats in metadata

**Errors/Exceptions:**

- 'AIPromptMissing': Missing prompt property
- 'AIPromptEmpty': Empty prompt string
- 'AIProviderNotFound': Unknown provider name
- 'InvalidAITimeout': Invalid inactivityTimeout value
- 'AIPromptTimeout': Inactivity timeout exceeded
- 'AIProviderUnavailable': Provider not available (credentials, etc.)

**Examples:**

```typescript
const action = new AIPromptAction();

// Basic usage with default provider and playbook owner role
const result = await action.execute({
  prompt: 'Analyze this code for security issues.',
  context: { 'source-code': fileContent },
  return: 'A list of security vulnerabilities found.'
}, { owner: 'Engineer' });
// result.value = contents of output file
```

### AIProvider Interface

**Signature:**

```typescript
interface AIProvider {
  readonly name: string;
  execute(request: AIProviderRequest): Promise<AIProviderResponse>;
  isAvailable(): Promise<boolean>;
  signIn(): Promise<void>;
}
```

**Purpose:** Contract for AI platform implementations

**Parameters:**

- `request` (AIProviderRequest): System prompt, user prompt, model, maxTokens, timeout, abort signal

**Returns:** AIProviderResponse with content, usage stats, model used

**Errors/Exceptions:**

- Provider-specific errors wrapped in CatalystError

### createAIProvider Factory

**Signature:**

```typescript
function createAIProvider(name: string): AIProvider;
function getAvailableAIProviders(): string[];
```

**Purpose:** Factory for instantiating AI providers by name

**Parameters:**

- `name` (string): Provider identifier (e.g., 'claude', 'mock')

**Returns:** AIProvider instance ready for use

**Errors/Exceptions:**

- 'AIProviderNotFound': Provider name not in catalog; error lists available providers

**Examples:**

```typescript
// Get mock provider for testing
const provider = createAIProvider('mock');

// List available providers
const available = getAvailableAIProviders(); // ['mock', 'claude', ...]
```

---

## Implementation Approach

### 1. Type Definitions

**Config Interfaces** (`types.ts`):

```typescript
export interface AIPromptConfig {
  prompt: string;
  role?: string;
  context?: Record<string, unknown>;
  return?: string;
  provider?: string;
  model?: string;
  maxTokens?: number;
  inactivityTimeout?: number;
}
```

**Provider Interfaces** (`providers/types.ts`):

```typescript
export interface AIProvider {
  readonly name: string;
  execute(request: AIProviderRequest): Promise<AIProviderResponse>;
  isAvailable(): Promise<boolean>;
  signIn(): Promise<void>;
}

export interface AIProviderRequest {
  model?: string;
  systemPrompt: string;
  prompt: string;
  maxTokens?: number;
  inactivityTimeout: number;
  abortSignal?: AbortSignal;
}

export interface AIProviderResponse {
  content: string;
  usage?: AIUsageStats;
  model: string;
  metadata?: Record<string, unknown>;
}

export interface AIUsageStats {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost?: number;
  currency?: string;
}
```

### 2. Role Mapping

**Role Mapping** (`roles.ts`):

Define known role names and their system prompt mappings:

```typescript
const ROLE_MAPPINGS: Record<string, string> = {
  'product manager': 'You are a strategic Product Manager. You define product requirements with precision, prioritize features based on business value and user impact, and ensure every decision aligns with measurable business goals. You think in terms of outcomes, not outputs.',
  'engineer': 'You are an expert Software Engineer. You implement features with clean, maintainable code following established patterns and best practices. You prioritize correctness, performance, and technical quality. You write code that other engineers can understand and extend.',
  'architect': 'You are a seasoned Software Architect. You design systems for scalability, maintainability, and long-term evolution. You make technical decisions with full awareness of trade-offs and ensure architectural consistency across the codebase.'
};

export function resolveSystemPrompt(role: string | undefined, playbookOwner: string): string {
  // 1. If role is empty/undefined, use playbookOwner
  const effectiveRole = role?.trim() || playbookOwner;

  // 2. Check if effectiveRole matches a known role name (case-insensitive)
  const normalizedRole = effectiveRole.toLowerCase();
  if (ROLE_MAPPINGS[normalizedRole]) {
    return ROLE_MAPPINGS[normalizedRole];
  }

  // 3. Use effectiveRole directly as system prompt (custom role)
  return effectiveRole;
}
```

### 3. Context Assembly

**Context File Assembly** (`context.ts`):

1. For each entry in context dictionary:
   - Create temp file with unique name: `{temp-dir}/catalyst-context-{name}-{uuid}.txt`
   - Write value to file (stringify if not string)
   - Track file path

2. Generate context instruction block:

```typescript
export async function assembleContext(
  context: Record<string, unknown> | undefined
): Promise<{ instruction: string; cleanupFiles: string[] }> {
  if (!context || Object.keys(context).length === 0) {
    return { instruction: '', cleanupFiles: [] };
  }

  const cleanupFiles: string[] = [];
  const fileEntries: string[] = [];

  for (const [name, value] of Object.entries(context)) {
    const filePath = path.join(os.tmpdir(), `catalyst-context-${name}-${randomUUID()}.txt`);
    const content = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    await fs.writeFile(filePath, content, 'utf-8');
    cleanupFiles.push(filePath);
    fileEntries.push(`- ${name}: ${filePath}`);
  }

  const instruction = `## Context Files

Review the following files for context before proceeding:
${fileEntries.join('\n')}

`;

  return { instruction, cleanupFiles };
}
```

### 4. Return Value Handling

**Output File Management**:

1. When `return` is specified:
   - Create temp output file path: `{temp-dir}/catalyst-output-{uuid}.txt`
   - Append return instruction to prompt

2. After AI completion:
   - Read output file contents
   - Return as step value
   - Clean up temp file

```typescript
export function assembleReturnInstruction(
  returnDesc: string | undefined
): { instruction: string; outputFile: string | null } {
  if (!returnDesc?.trim()) {
    return { instruction: '', outputFile: null };
  }

  const outputFile = path.join(os.tmpdir(), `catalyst-output-${randomUUID()}.txt`);

  const instruction = `
## Required Output

${returnDesc}

IMPORTANT: Write your output to: ${outputFile}
`;

  return { instruction, outputFile };
}
```

### 5. AIPromptAction Implementation

**Algorithm:**

1. **Validate configuration**
   - Check prompt exists and is non-empty string
   - Validate inactivityTimeout if provided (>= 0)
   - Validate provider if specified (defer to factory for unknown provider error)

2. **Resolve system prompt**
   - Call `resolveSystemPrompt(config.role, context.owner)`
   - Returns mapped role or custom system prompt

3. **Assemble context**
   - Call `assembleContext(config.context)`
   - Get context instruction and cleanup file list

4. **Assemble return instruction**
   - Call `assembleReturnInstruction(config.return)`
   - Get return instruction and output file path

5. **Build final prompt**
   - Combine: context instruction + user prompt + return instruction

6. **Create provider**
   - Call `createAIProvider(config.provider || 'claude')`
   - Throws 'AIProviderNotFound' if unknown

7. **Execute AI request**
   - Build AIProviderRequest with systemPrompt, prompt, model, maxTokens, inactivityTimeout
   - Set up AbortController for timeout
   - Call `provider.execute(request)`
   - Handle inactivity timeout (reset timer on activity)

8. **Extract return value**
   - If output file specified: read file contents as value
   - If no output file: value is null

9. **Cleanup**
   - Delete context temp files
   - Delete output temp file

10. **Return result**
    - Build PlaybookActionResult with code='Success', value, usage in metadata

### 6. MockAIProvider Implementation

**Purpose:** Enable testing without real AI credentials

```typescript
export class MockAIProvider implements AIProvider {
  readonly name = 'mock';

  private response: string | AIProviderResponse = 'Mock response';
  private error: CatalystError | null = null;
  private calls: AIProviderRequest[] = [];

  setResponse(response: string | AIProviderResponse): void {
    this.response = response;
    this.error = null;
  }

  setError(error: CatalystError): void {
    this.error = error;
  }

  getCalls(): AIProviderRequest[] {
    return [...this.calls];
  }

  reset(): void {
    this.response = 'Mock response';
    this.error = null;
    this.calls = [];
  }

  async execute(request: AIProviderRequest): Promise<AIProviderResponse> {
    this.calls.push({ ...request });

    if (this.error) {
      throw this.error;
    }

    if (typeof this.response === 'string') {
      return {
        content: this.response,
        model: request.model || 'mock-model',
        usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 }
      };
    }

    return this.response;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async signIn(): Promise<void> {
    // No-op for mock
  }
}
```

### 7. Provider Factory and Build-time Catalog

**Build-time Provider Discovery** (`scripts/generate-provider-registry.ts`):

The provider catalog is generated at build time (similar to the action registry). This enables automatic discovery of providers without manual registration.

1. Build script scans `src/playbooks/actions/ai/providers/*-provider.ts`
2. For each provider file:
   - Dynamically imports the module
   - Finds exported classes implementing `AIProvider` interface
   - Instantiates to extract `name` property
   - Validates name format (lowercase alphanumeric with hyphens)
3. Generates `provider-catalog.ts`:
   - Import statements for all discovered providers
   - `PROVIDER_CATALOG: Record<string, ProviderConstructor>` map

**Generated Catalog** (`providers/provider-catalog.ts`):

```typescript
// AUTO-GENERATED - DO NOT EDIT MANUALLY
import type { AIProvider } from './types';
import { MockAIProvider } from './mock-provider';

export type ProviderConstructor = new () => AIProvider;

export const PROVIDER_CATALOG: Record<string, ProviderConstructor> = {
  'mock': MockAIProvider
};
```

**Factory Implementation** (`providers/factory.ts`):

```typescript
import { PROVIDER_CATALOG } from './provider-catalog';

export function createAIProvider(name: string): AIProvider {
  // Special handling for mock provider singleton (for test state sharing)
  if (name === 'mock') {
    return getMockProvider();
  }

  const ProviderClass = PROVIDER_CATALOG[name];
  if (!ProviderClass) {
    throw AIProviderErrors.notFound(name, Object.keys(PROVIDER_CATALOG));
  }
  return new ProviderClass();
}

export function getAvailableAIProviders(): string[] {
  return Object.keys(PROVIDER_CATALOG);
}
```

**Adding New Providers:**

To add a new AI provider (e.g., Claude):

1. Create `claude-provider.ts` implementing `AIProvider` interface
2. Run `npm run build` or `tsx scripts/generate-provider-registry.ts`
3. Provider is automatically discovered and added to catalog

### 8. Error Handling

**Error Factories** (`errors.ts`):

```typescript
export const AIPromptErrors = {
  promptMissing: () => new CatalystError(
    'AI prompt action requires prompt property',
    'AIPromptMissing',
    'Provide a prompt string in the ai-prompt action configuration'
  ),

  promptEmpty: () => new CatalystError(
    'AI prompt cannot be empty',
    'AIPromptEmpty',
    'Provide a non-empty prompt string'
  ),

  timeoutInvalid: (value: number) => new CatalystError(
    `Invalid inactivity timeout: ${value}`,
    'InvalidAITimeout',
    'Timeout must be a non-negative number in milliseconds'
  ),

  timeout: (timeoutMs: number) => new CatalystError(
    `AI request timed out after ${timeoutMs}ms of inactivity`,
    'AIPromptTimeout',
    'Increase inactivityTimeout or check if AI is responding'
  )
};

export const AIProviderErrors = {
  notFound: (name: string, available: string[]) => new CatalystError(
    `AI provider "${name}" not found`,
    'AIProviderNotFound',
    `Available providers: ${available.join(', ')}`
  ),

  unavailable: (name: string, reason: string) => new CatalystError(
    `AI provider "${name}" is not available: ${reason}`,
    'AIProviderUnavailable',
    `Run provider sign-in or check credentials`
  )
};
```

### 9. Dependencies

- playbook-definition: PlaybookAction interface, PlaybookActionResult, PlaybookContext
- error-handling: CatalystError class

### 10. Testing Strategy

**Unit Tests:**

- Role mapping (known roles, custom roles, default from owner)
- Context assembly (single value, multiple values, empty, cleanup)
- Return instruction assembly (with return, without return)
- Config validation (missing prompt, empty prompt, invalid timeout)
- MockAIProvider (setResponse, setError, getCalls, reset)
- Factory (valid provider, unknown provider, list providers)

**Integration Tests:**

- Full action execution with mock provider
- Context file creation and cleanup
- Output file extraction and cleanup
- Timeout handling
- Error propagation

**Performance Tests:**

- Provider instantiation <10ms
- Action overhead <100ms

**Coverage Targets:**

- 90% overall code coverage
- 100% error handling paths
- 100% configuration validation paths

### 11. Documentation Plan

**Target Audience**: Playbook authors (developers using Catalyst framework)

**Documentation Type**: User guide and API reference

**File Location**: `docs/playbooks/actions/ai-prompt.md`

**Content Outline:**

1. Overview
   - What is the ai-prompt action
   - When to use it
   - Provider architecture

2. Basic Usage
   - Simple prompt execution
   - Default provider and role

3. Roles
   - Using role names (Product Manager, Engineer, Architect)
   - Custom system prompts
   - Default role from playbook owner

4. Context
   - Passing context variables
   - File content as context
   - How context is made available to AI

5. Return Values
   - Specifying expected output
   - Extracting return values
   - Using return values in subsequent steps

6. Advanced Configuration
   - Custom providers
   - Model selection
   - Token limits
   - Timeout configuration

7. Error Handling
   - Common errors and solutions
   - Timeout handling

**Code Examples**: 10+ examples covering basic usage, roles, context, return values, and advanced patterns

---

## Usage Examples

### Example 1: Basic AI Prompt

```typescript
const action = new AIPromptAction();

const result = await action.execute({
  prompt: 'Summarize the key points from this document.',
  context: {
    'document': documentContent
  },
  return: 'A bulleted list of 5-10 key points.'
}, { owner: 'Product Manager' });

console.log(result.value); // Contents of output file
```

### Example 2: Code Generation with Custom Role

```typescript
const action = new AIPromptAction();

const result = await action.execute({
  role: 'You are a TypeScript expert specializing in test-driven development.',
  prompt: 'Write unit tests for the following function.',
  context: {
    'function': functionCode,
    'requirements': testRequirements
  },
  return: 'Complete Jest test file with all edge cases covered.',
  maxTokens: 4000
}, { owner: 'Engineer' });
```

### Example 3: Using Mock Provider for Testing

```typescript
import { createAIProvider, MockAIProvider } from './providers';

// Get mock provider
const provider = createAIProvider('mock') as MockAIProvider;

// Configure mock response
provider.setResponse('Generated code: function hello() { return "world"; }');

// Run action (will use mock response)
const action = new AIPromptAction();
const result = await action.execute({
  prompt: 'Generate a hello function',
  return: 'The function implementation'
}, { owner: 'Engineer' });

// Verify calls
const calls = provider.getCalls();
expect(calls).toHaveLength(1);
expect(calls[0].prompt).toContain('Generate a hello function');
```
