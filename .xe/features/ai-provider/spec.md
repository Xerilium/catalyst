---
id: ai-provider
title: AI Provider
author: "@flanakin"
description: "Core AI provider infrastructure for platform-agnostic AI integration"
dependencies:
  - error-handling
---

<!-- markdownlint-disable single-title -->

# Feature: AI Provider

## Problem

AI capabilities are needed across multiple Catalyst features (playbook actions, blueprint agents, autonomous reviews). Without a centralized provider infrastructure, each feature would implement its own AI integration, leading to duplicated code, inconsistent interfaces, and difficulty supporting new AI platforms.

## Goals

- Provide a unified interface for AI platform integrations
- Enable build-time discovery of AI providers
- Support both headless (CI/CD) and interactive execution modes
- Abstract platform-specific details from consumers

Explicit non-goals:

- This feature does NOT implement specific AI providers (see `ai-provider-{name}` features)
- This feature does NOT define action interfaces (see `playbook-actions-ai`)

## Scenario

- As an **AI platform integration developer**, I need a clear interface to integrate new AI platforms
  - Outcome: `AIProvider` interface provides precise contract for platform-specific implementations

- As a **feature developer**, I need a unified way to execute AI prompts across different platforms
  - Outcome: Provider factory enables platform-agnostic AI usage

- As a **CI/CD pipeline operator**, I need to know which providers can run without user interaction
  - Outcome: Provider capabilities metadata indicates headless support

## Success Criteria

- Provider instantiation completes in <10ms
- New providers are automatically discovered at build time
- All provider implementations pass interface compliance tests

## Requirements

### Functional Requirements

#### FR:provider: AI Provider Interface

- **FR:provider.interface**: System MUST define `AIProvider` interface for platform-specific implementations

  ```typescript
  interface AIProvider {
    /** Unique provider identifier (e.g., 'claude', 'gemini') */
    readonly name: string;

    /** Provider capabilities (empty = interactive-only) */
    readonly capabilities: AIProviderCapability[];

    /** Execute an AI prompt and return the response */
    execute(request: AIProviderRequest): Promise<AIProviderResponse>;

    /** Check if provider is available (credentials configured, etc.) */
    isAvailable(): Promise<boolean>;

    /** Interactive sign-in flow for providers that support it */
    signIn(): Promise<void>;
  }
  ```

- **FR:provider.capability**: System MUST define `AIProviderCapability` type for provider metadata

  ```typescript
  /** Provider capability - 'headless' indicates CI/CD compatibility */
  type AIProviderCapability = 'headless';
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
    /** The AI response content */
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

#### FR:factory: Provider Factory

- **FR:factory.create**: System MUST provide `createAIProvider(name: string): AIProvider` factory function
  - Factory creates provider instance by name
  - Returns instantiated provider ready for use
  - MUST throw CatalystError with code 'AIProviderNotFound' for unknown providers
  - Error message MUST list available provider names

- **FR:factory.list**: System MUST provide `getAvailableAIProviders(): string[]` function
  - Returns list of all provider names from catalog

- **FR:factory.headless**: System MUST provide `getHeadlessProviders(): string[]` function
  - Returns list of provider names that support headless execution

#### FR:catalog: Provider Catalog

- **FR:catalog.discovery**: Build script MUST scan `*-provider.ts` files in providers directory
- **FR:catalog.generation**: Build script MUST generate `provider-catalog.ts` with provider imports and catalog map
- **FR:catalog.integration**: Build process MUST include provider registry generation before TypeScript compilation

#### FR:mock: Mock Provider

- **FR:mock.provider**: System MUST provide a mock provider named 'mock' for testing
  - MUST be included in the provider catalog
  - MUST support `['headless']` capability
  - Enables testing without real AI credentials

- **FR:mock.testing**: Mock provider MUST support test utilities
  - `setResponse(response)` - configure mock response
  - `setError(error)` - configure mock to throw error
  - `getCalls()` - retrieve call history
  - `reset()` - clear state

#### FR:errors: Error Handling

- **FR:errors.not-found**: System MUST define `AIProviderNotFound` error
  - Code: `AIProviderNotFound`
  - Message includes requested provider name
  - Guidance lists available providers

- **FR:errors.unavailable**: System MUST define `AIProviderUnavailable` error
  - Code: `AIProviderUnavailable`
  - Message indicates provider cannot execute
  - Guidance suggests checking credentials or running sign-in

### Non-Functional Requirements

#### NFR:performance: Performance

- **NFR:performance.instantiation**: Provider instantiation MUST complete in <10ms
- **NFR:performance.factory**: Factory lookup MUST complete in <1ms

#### NFR:extensibility: Extensibility

- **NFR:extensibility.discovery**: New providers MUST be automatically discovered at build time
- **NFR:extensibility.interface**: Provider interface MUST be stable across minor versions

## Technical Approach

### Directory Structure

```
src/ai/
  types.ts              # AIProvider, AIProviderRequest, AIProviderResponse, etc.
  errors.ts             # AIProviderErrors factory
  providers/
    factory.ts            # createAIProvider(), getAvailableAIProviders()
    provider-catalog.ts   # AUTO-GENERATED: Provider catalog
    mock-provider.ts      # MockAIProvider for testing
    index.ts              # Public exports
scripts/
  generate-provider-registry.ts  # Build script for catalog generation
tests/ai/providers/
  mock-provider.test.ts
  factory.test.ts
```

### Build Integration

Provider catalog generation is integrated into the build process:

1. `scripts/generate-provider-registry.ts` scans `*-provider.ts` files
2. Extracts provider name from class instance
3. Generates `provider-catalog.ts` with imports and catalog map
4. TypeScript compilation follows

## Dependencies

**Internal Dependencies:**

- **error-handling**: Provides `CatalystError` and error handling framework

**External Dependencies:**

- None (core infrastructure)
