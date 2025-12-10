---
id: playbook-actions-ai
title: Playbook Actions - AI
author: "@flanakin"
description: "Core AI action for playbook workflows with extensible provider architecture for AI platform integration"
dependencies:
  - playbook-definition
  - error-handling
---

<!-- markdownlint-disable single-title -->

# Feature: Playbook Actions - AI

## Problem

Playbooks need AI capabilities to generate content, analyze code, and make intelligent decisions within automated workflows. Without a unified AI integration layer, playbooks cannot leverage AI platforms effectively, and each AI platform would require separate action implementations with inconsistent interfaces.

## Goals

- Enable playbook authors to execute AI prompts with dynamic context from playbook variables
- Provide a unified interface for AI interactions that abstracts platform-specific details
- Support extensibility for multiple AI platforms through a provider architecture
- Ensure predictable AI output formats for downstream processing in playbook steps

Explicit non-goals:

- This feature does NOT implement platform-specific AI providers
- This feature does NOT provide streaming output to users (AI responses are collected before returning)

## Scenario

- As a **playbook author**, I need to execute AI prompts with dynamic context from playbook variables
  - Outcome: `ai-prompt` action seamlessly integrates AI capabilities into playbook execution flow with full variable access

- As a **playbook author**, I need predictable AI output formats for downstream processing
  - Outcome: Structured output validation ensures AI results are consumable by subsequent playbook steps

- As a **playbook author**, I need to switch between AI platforms without changing playbook logic
  - Outcome: Provider abstraction enables easy migration and optimization across different AI services

- As an **AI platform integration developer**, I need a clear interface to integrate new AI platforms
  - Outcome: `AIProvider` interface provides precise contract for platform-specific implementations

## Success Criteria

- 95% of AI prompt executions complete successfully with configured providers
- Provider instantiation completes in <10ms
- AI action execution overhead (excluding AI response time) is <100ms

## Requirements

### Functional Requirements

#### FR:provider: AI Provider Interface

- **FR:provider.interface**: System MUST define `AIProvider` interface for platform-specific implementations

  ```typescript
  interface AIProvider {
    /** Unique provider identifier (e.g., 'claude', 'gemini') */
    readonly name: string;

    /** Execute an AI prompt and return the response */
    execute(request: AIProviderRequest): Promise<AIProviderResponse>;

    /** Check if provider is available (credentials configured, etc.) */
    isAvailable(): Promise<boolean>;

    /** Interactive sign-in flow for providers that support it */
    signIn(): Promise<void>;
  }
  ```

- **FR:provider.request**: System MUST define `AIProviderRequest` interface for provider input

  ```typescript
  interface AIProviderRequest {
    /** Model identifier (provider-specific) */
    model?: string;
    /** System prompt defining AI persona/role */
    systemPrompt: string;
    /** The user prompt text */
    prompt: string;
    /** Maximum tokens for response */
    maxTokens?: number;
    /** Inactivity timeout in milliseconds - time without AI activity before cancellation */
    inactivityTimeout: number;
    /** Abort signal for cancellation */
    abortSignal?: AbortSignal;
  }
  ```

- **FR:provider.response**: System MUST define `AIProviderResponse` interface for provider output

  ```typescript
  interface AIProviderResponse {
    /** The AI response content (may be empty if outputFile was used) */
    content: string;
    /** Token usage statistics (optional) */
    usage?: AIUsageStats;
    /** Model that was used */
    model: string;
    /** Provider-specific metadata */
    metadata?: Record<string, unknown>;
  }
  ```

- **FR:provider.usage**: System MUST define `AIUsageStats` interface for token tracking

  ```typescript
  interface AIUsageStats {
    /** Input tokens consumed */
    inputTokens: number;
    /** Output tokens generated */
    outputTokens: number;
    /** Total tokens (input + output) */
    totalTokens: number;
    /** Estimated cost (optional) */
    cost?: number;
    /** Currency code for cost (e.g., 'USD', 'EUR'). Default: 'USD' */
    currency?: string;
  }
  ```

- **FR:provider.factory**: System MUST provide `createAIProvider(name: string): AIProvider` factory function
  - Factory creates provider instance by name
  - Returns instantiated provider ready for use
  - MUST throw CatalystError with code 'AIProviderNotFound' for unknown providers; error message MUST list available provider names

- **FR:provider.list**: System MUST provide `getAvailableAIProviders(): string[]` function
  - Returns list of all provider names from catalog

- **FR:provider.catalog**: System MUST generate provider catalog at build time
  - **FR:provider.catalog.discovery**: Build script MUST scan `*-provider.ts` files in providers directory
  - **FR:provider.catalog.generation**: Build script MUST generate `provider-catalog.ts` with provider imports and catalog map
  - **FR:provider.catalog.integration**: Build process MUST include provider registry generation before TypeScript compilation

- **FR:provider.mock**: System MUST provide a mock provider named 'mock' for testing playbooks without real AI
  - MUST be included in the provider catalog
  - Enables testing playbooks in isolation
  - Supports CI/CD pipelines without AI credentials

#### FR:ai-prompt: AI Prompt Action

- **FR:ai-prompt.config**: System MUST provide `ai-prompt` action implementing `PlaybookAction<AIPromptConfig>`

  ```typescript
  interface AIPromptConfig {
    /** The prompt text to send to the AI (supports template interpolation) */
    prompt: string;
    /** Role for AI persona - raw string, role name, or empty for default */
    role?: string;
    /** Context to make available to the AI as name-value pairs */
    context?: Record<string, unknown>;
    /** Description of expected return value; if empty, no value returned to step output */
    return?: string;
    /** Provider identifier (e.g., 'claude', 'gemini'). Default: 'claude' */
    provider?: string;
    /** Model to use (provider-specific, optional) */
    model?: string;
    /** Maximum tokens for AI response (optional, provider-specific default) */
    maxTokens?: number;
    /** Inactivity timeout in milliseconds. Default: 300000 (5 minutes) */
    inactivityTimeout?: number;
  }
  ```

- **FR:ai-prompt.interpolation**: Action MUST support template interpolation in ALL config properties
  - Template engine performs interpolation BEFORE action execution
  - Action receives config with variables already replaced
  - Enables dynamic values for `prompt`, `role`, `context`, `return`, `maxTokens`, etc.

- **FR:ai-prompt.role**: Action MUST support role-based AI persona configuration
  - **FR:ai-prompt.role.name**: When `role` matches a known role name (case-insensitive), map to corresponding system prompt:
    - `"Product Manager"` → "You are a strategic Product Manager. You define product requirements with precision, prioritize features based on business value and user impact, and ensure every decision aligns with measurable business goals. You think in terms of outcomes, not outputs."
    - `"Engineer"` → "You are an expert Software Engineer. You implement features with clean, maintainable code following established patterns and best practices. You prioritize correctness, performance, and technical quality. You write code that other engineers can understand and extend."
    - `"Architect"` → "You are a seasoned Software Architect. You design systems for scalability, maintainability, and long-term evolution. You make technical decisions with full awareness of trade-offs and ensure architectural consistency across the codebase."
  - **FR:ai-prompt.role.custom**: When `role` is non-empty but does not match a known role name, use the value directly as the system prompt text
  - **FR:ai-prompt.role.default**: When `role` is empty or not specified, use the playbook `owner` property value and apply role name mapping per FR:ai-prompt.role.name

- **FR:ai-prompt.context**: Action MUST assemble context for AI access
  - Context is a dictionary of name-value pairs where name describes the content and value is either a file path or literal content
  - **FR:ai-prompt.context.detection**: Action MUST detect whether each context value is a file path or literal content:
    - Multi-line strings (containing newlines) MUST be treated as literal content, never file paths
    - Single-line strings are checked as potential file paths; if the file exists, use it directly
    - If the file does not exist, treat the value as literal content
  - **FR:ai-prompt.context.files**: Context values that are not file paths MUST be written to temporary files to avoid formatting conflicts (context may contain Markdown, XML, JSON, or code)
  - **FR:ai-prompt.context.instruction**: Action MUST include file references in the prompt:

    ```text
    ## Context Files

    Review the following files for context before proceeding:
    - {name}: {file path}
    - {name}: {file path}
    ```

  - **FR:ai-prompt.context.position**: Context instructions MUST be prepended before the user's prompt text

- **FR:ai-prompt.return**: Action MUST support return value specification via file output
  - `return` property describes what should be returned to the playbook
  - **FR:ai-prompt.return.file**: When `return` is specified, action MUST:
    1. Create a temporary output file path
    2. Include in prompt instruction for AI to write output to that file:

       ```text
       ## Required Output

       {return value description}

       IMPORTANT: Write your output to: {output file path}
       ```

    3. After AI completion, read the output file contents as the step `value`
  - **FR:ai-prompt.return.empty**: When `return` is empty or not specified, no output file is created and no value is returned to the step output variable

- **FR:ai-prompt.provider-resolution**: Action MUST resolve provider using the following precedence:
  1. `provider` property in action config (if specified)
  2. Default provider: `claude`

- **FR:ai-prompt.timeout**: Action MUST enforce inactivity-based timeout
  - **FR:ai-prompt.timeout.default**: Default inactivity timeout MUST be 300000ms (5 minutes)
  - **FR:ai-prompt.timeout.activity**: Timeout timer MUST reset on any AI activity (token generation, tool use, thinking)
  - **FR:ai-prompt.timeout.cancel**: AI request MUST be cancelled only if no activity occurs within the timeout period
  - **FR:ai-prompt.timeout.error**: Timeout errors MUST throw CatalystError with code 'AIPromptTimeout'

- **FR:ai-prompt.validation**: Action MUST validate configuration before execution
  - **FR:ai-prompt.validation.prompt-missing**: Missing `prompt` property MUST throw CatalystError with code 'AIPromptMissing'
  - **FR:ai-prompt.validation.prompt-empty**: Empty `prompt` string MUST throw CatalystError with code 'AIPromptEmpty'
  - **FR:ai-prompt.validation.provider-unknown**: Unknown `provider` value MUST throw CatalystError with code 'AIProviderNotFound'; error MUST list available providers
  - **FR:ai-prompt.validation.timeout-invalid**: Invalid `inactivityTimeout` (<0) MUST throw CatalystError with code 'InvalidAITimeout'

- **FR:ai-prompt.result**: Action MUST return PlaybookActionResult
  - `code`: 'Success' on success, error code on failure
  - `message`: Human-readable execution status including provider used
  - `value`: Contents of output file when `return` is specified; null otherwise
  - `error`: CatalystError if execution failed, null otherwise

- **FR:ai-prompt.metadata**: `ai-prompt` action MUST declare static metadata for action catalog
  - `static readonly actionType = 'ai-prompt'`
  - `static readonly primaryProperty = 'prompt'` (enables shorthand syntax)

### Non-functional Requirements

#### NFR:perf: Performance

- **NFR:perf.instantiation**: Provider instantiation MUST complete in <10ms
- **NFR:perf.overhead**: Action execution overhead (excluding AI response time) MUST be <100ms

#### NFR:reliability: Reliability

- **NFR:reliability.timeout**: Timeout cancellation MUST properly abort in-flight AI requests
- **NFR:reliability.errors**: Provider errors MUST be caught and converted to CatalystError

#### NFR:test: Testability

- **NFR:test.isolation**: All components MUST be testable in isolation with mock provider
- **NFR:test.mockable**: Provider interface MUST be mockable for unit testing
- **NFR:test.coverage-success**: 90% code coverage for success paths
- **NFR:test.coverage-errors**: 100% coverage for error handling paths

#### NFR:maintain: Maintainability

- **NFR:maintain.separation**: Provider implementations MUST be in separate features
- **NFR:maintain.consistency**: Error codes MUST be consistent with other playbook action features
- **NFR:maintain.types**: Configuration interfaces MUST use TypeScript for type safety

## Key Entities

Entities owned by this feature:

- **AIPromptConfig**: Configuration interface for `ai-prompt` action
  - Properties: prompt (required), role, context, return, provider, model, maxTokens, inactivityTimeout
  - Used to configure AI prompt execution within playbooks

- **AIProvider**: Interface contract for AI platform implementations
  - Properties: name
  - Methods: execute(), isAvailable(), signIn()
  - Implemented by platform-specific provider classes

- **AIProviderRequest**: Input structure for provider execution
  - Properties: model, systemPrompt, prompt, maxTokens, inactivityTimeout, abortSignal
  - Passed to AIProvider.execute() method
  - Action assembles role, context, and return instructions into systemPrompt and prompt

- **AIProviderResponse**: Output structure from provider execution
  - Properties: content, usage, model, metadata
  - Returned from AIProvider.execute() method

- **AIUsageStats**: Token usage and cost tracking
  - Properties: inputTokens, outputTokens, totalTokens, cost, currency
  - Optional in AIProviderResponse for cost monitoring

- **AIPromptAction**: Implementation of `PlaybookAction<AIPromptConfig>`
  - Executes AI prompts via configured provider
  - Handles timeout, validation, and return value extraction from output file

Entities from other features:

- **PlaybookAction** (playbook-definition): Base interface all actions implement
- **PlaybookActionResult** (playbook-definition): Standard result structure
- **CatalystError** (error-handling): Standard error class with code and guidance

## TypeScript Examples

### Basic AI Prompt Usage

```typescript
import type { PlaybookStep } from '@xerilium/catalyst/playbooks';

// Simple prompt - uses default provider (claude) and playbook owner role
const analyzeStep: PlaybookStep = {
  name: 'analyze-code',
  action: 'ai-prompt',
  config: {
    prompt: 'Analyze the following code and identify potential issues.',
    context: {
      'file-content': '{{file-content}}'
    },
    return: 'A concise summary of issues found, formatted as a bulleted list.'
  }
};
```

### AI Prompt with Role Name

```typescript
import type { PlaybookStep } from '@xerilium/catalyst/playbooks';

// Using a role name - maps to predefined system prompt
const reviewStep: PlaybookStep = {
  name: 'security-review',
  action: 'ai-prompt',
  config: {
    role: 'Architect',  // Maps to architect system prompt
    prompt: 'Review the provided architecture for security vulnerabilities.',
    context: {
      'architecture': '{{architecture-doc}}',
      'threat-model': '{{threat-model}}'
    },
    return: 'A JSON array of security concerns, each with "issue", "severity", and "recommendation" fields.'
  }
};
```

### AI Prompt with Raw Role String

```typescript
import type { PlaybookStep } from '@xerilium/catalyst/playbooks';

// Using raw role string - passed directly as system prompt
const expertStep: PlaybookStep = {
  name: 'generate-implementation',
  action: 'ai-prompt',
  config: {
    role: 'You are a TypeScript expert specializing in functional programming patterns.',
    prompt: 'Implement the following interface with comprehensive error handling.',
    context: {
      'interface-definition': '{{spec-interface}}',
      'requirements': '{{spec-requirements}}'
    },
    return: 'The complete TypeScript implementation file.',
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    maxTokens: 4000
  }
};
```

## Dependencies

**Internal Dependencies:**

- **playbook-definition**: Provides `PlaybookAction`, `PlaybookActionResult` interfaces
- **error-handling**: Provides `CatalystError` and error handling framework

**External Dependencies:**

- **Node.js >= 18**: AbortController for timeout handling
