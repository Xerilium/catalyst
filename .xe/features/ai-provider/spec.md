---
id: ai-provider
title: AI Provider
description: Unified AIProvider interface, build-time provider discovery, and native Agent Client Protocol support for headless and interactive AI execution.
dependencies:
  - error-handling
---

<!-- markdownlint-disable single-title -->

# Feature: AI Provider

## Purpose

Provide a unified interface for AI platform integrations, enabling build-time discovery of AI providers, supporting both headless (CI/CD) and interactive execution modes, and abstracting platform-specific details from consumers. This feature defines the provider contract only; it does NOT implement specific AI platforms or distribute Catalyst to them.

## Scenarios

### FR:provider: AI Provider Interface

AI platform integration developer needs a clear interface to integrate new AI platforms so that platform-specific implementations follow a precise contract.

- **FR:provider.interface** (P1): System MUST define `AIProvider` interface for platform-specific implementations

  ```typescript
  interface AIProvider {
    /** Unique provider identifier (e.g., 'claude', 'copilot') */
    readonly name: string;

    /** Display name for the AI platform (used in logs and output) */
    readonly displayName: string;

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

- **FR:provider.capability** (P1): System MUST define `AIProviderCapability` type for provider metadata

  ```typescript
  /** Provider capability - 'headless' indicates CI/CD compatibility */
  type AIProviderCapability = "headless";
  ```

- **FR:provider.request** (P1): System MUST define `AIProviderRequest` interface for provider input

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

- **FR:provider.response** (P1): System MUST define `AIProviderResponse` interface for provider output

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

- **FR:provider.usage** (P3): System MUST define `AIUsageStats` interface for token tracking

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

- ~~**FR:provider.command-config**~~: [deprecated: FR:ai-plugin/plugin]

- **FR:provider.instructions** (P2): `AIProvider` MAY expose an optional `instructions` property of type `AIProviderInstructionsConfig` declaring where the platform loads agent rules from
  - Providers with no repository instruction file surface omit it
  - Behavior for each `mode` is defined in `FR:init-agents/sync.mode`

### FR:factory: Provider Factory

Feature developer needs a unified way to execute AI prompts across different platforms so that provider selection is platform-agnostic.

- **FR:factory.create** (P1): System MUST provide `createAIProvider(name: string): AIProvider` factory function
  - Factory creates provider instance by name
  - Returns instantiated provider ready for use
  - MUST throw CatalystError with code 'AIProviderNotFound' for unknown providers
  - Error message MUST list available provider names
- **FR:factory.list** (P2): System MUST provide `getAvailableAIProviders(): string[]` function
  - Returns list of all provider names from catalog
- **FR:factory.headless** (P2): System MUST provide `getHeadlessProviders(): string[]` function
  - Returns list of provider names that support headless execution

### FR:catalog: Provider Catalog

CI/CD pipeline operator needs to know which providers can run without user interaction so that automated pipelines select appropriate providers.

- **FR:catalog.discovery** (P1): Build script MUST scan `*-provider.ts` files in providers directory
- **FR:catalog.generation** (P1): Build script MUST generate `provider-catalog.ts` with provider imports and catalog map
- **FR:catalog.integration** (P1): Build process MUST include provider registry generation before TypeScript compilation

### FR:acp: Agent Client Protocol

Catalyst user needs to run prompts through any agent that speaks the [Agent Client Protocol](https://agentclientprotocol.com) (ACP) so that adding an agent is configuration, not a new provider.

- **FR:acp.provider** (P1): System MUST provide an `acp` provider that runs prompts through a configured ACP agent
  > - @req FR:provider.interface
  - `name` MUST be `'acp'` and `capabilities` MUST be `['headless']`
  - Agent command MUST come from the `CATALYST_ACP_COMMAND` environment variable (e.g. `gemini --experimental-acp`), split on whitespace and spawned without a shell
  - `isAvailable()` MUST return true only when the command is set and its executable resolves
  - `signIn()` MUST throw `AIProviderUnavailable` when the command is missing or not launchable (sign-in happens in the agent itself)
- **FR:acp.protocol** (P1): Provider MUST speak ACP as newline-delimited JSON-RPC 2.0 over the agent's stdio
  - Implemented in-house; no Node.js dependency is required
  - `initialize` with protocol version 1 and no client capabilities
  - `session/new` with the current working directory and no MCP servers
  - `session/prompt` with a single text block of `systemPrompt` followed by `prompt` (ACP has no system prompt)
  - Agent output MUST be decoded as UTF-8 across chunk boundaries (a character split between two chunks stays intact)
- **FR:acp.execute** (P1): `execute()` MUST:
  - Concatenate `agent_message_chunk` text updates into `content`
  - Return when `session/prompt` resolves, reporting `model` as `request.model` or `'acp'`
  - Throw `AIProviderError` when the stop reason is `refusal` or the agent returns a JSON-RPC error
  - Throw `AIProviderUnavailable` when the agent cannot be launched
  - Throw `AIProviderError` with the stderr tail when the agent exits early
  - Terminate the agent process before returning or throwing
- **FR:acp.cancel** (P1): Provider MUST honor `abortSignal` and `inactivityTimeout`
  - Send `session/cancel` then terminate the agent
  - Any agent message resets the inactivity timer
  - Timeout throws `AIProviderTimeout`
- **FR:acp.client** (P1): Provider MUST NOT expose client capabilities to the agent
  - `session/request_permission` MUST be rejected (reject option, else `cancelled`)
  - Other agent-initiated requests (file system, terminal) MUST get a JSON-RPC `-32601` error
  - File and shell work stays in playbook actions

### FR:mock: Mock Provider

Feature developer needs a mock provider for testing so that AI features can be validated without real AI credentials.

- **FR:mock.provider** (P2): System MUST provide a mock provider named 'mock' for testing
  - MUST be included in the provider catalog
  - MUST support `['headless']` capability
  - Enables testing without real AI credentials
- **FR:mock.testing** (P3): Mock provider MUST support test utilities
  - `setResponse(response)` - configure mock response
  - `setError(error)` - configure mock to throw error
  - `getCalls()` - retrieve call history
  - `reset()` - clear state

### FR:errors: Error Handling

Feature developer needs clear error codes for provider failures so that problems can be diagnosed and fixed quickly.

- **FR:errors.not-found** (P1): System MUST define `AIProviderNotFound` error
  > - @req FR:error-handling/catalyst-error
  - Code: `AIProviderNotFound`
  - Message includes requested provider name
  - Guidance lists available providers
- **FR:errors.unavailable** (P2): System MUST define `AIProviderUnavailable` error
  - Code: `AIProviderUnavailable`
  - Message indicates provider cannot execute
  - Guidance suggests checking credentials or running sign-in

### Deprecated: Command Installation

- ~~**FR:commands**~~: [deprecated: FR:ai-plugin/skills]
- ~~**FR:commands.@playbook**~~: [deprecated: FR:cli-init/init.legacy]
- ~~**FR:commands.input**~~: [deprecated: FR:cli-init/init.legacy]
- ~~**FR:commands.discovery**~~: [deprecated: FR:ai-plugin/skills.@ai-skill]
- ~~**FR:commands.generate**~~: [deprecated: FR:ai-plugin/skills.generate]
- ~~**FR:commands.transform**~~: [deprecated: FR:ai-plugin/skills.transform]
- ~~**FR:commands.legacy**~~: [deprecated: FR:cli-init/init.legacy]
- ~~**FR:commands.gitignore-folder**~~: [deprecated: FR:cli-init/init.legacy.gitignore]
- ~~**FR:commands.gitignore-flat-new**~~: [deprecated: FR:cli-init/init.legacy.gitignore]
- ~~**FR:commands.gitignore-flat-merge**~~: [deprecated: FR:cli-init/init.legacy.gitignore]
- ~~**FR:commands.idempotent**~~: [deprecated: FR:cli-init/init.idempotent]

### Non-functional Requirements

**NFR:performance**: Performance

- **NFR:performance.instantiation** (P4): Provider instantiation MUST complete in <10ms
- **NFR:performance.factory** (P4): Factory lookup MUST complete in <1ms

**NFR:extensibility**: Extensibility

- **NFR:extensibility.discovery** (P2): New providers MUST be automatically discovered at build time
- **NFR:extensibility.interface** (P3): Provider interface MUST be stable across minor versions

## Data Model

- **FR:$instructions-config** (P2): **`AIProviderInstructionsConfig`** — Where a platform loads agent rules from and how content reaches that file
  - `path` (string) — Instruction file path relative to the project root; the file the platform loads with the highest precedence
  - `mode` (string) — How content reaches the file: `inline` writes the rules into the file, `import` writes a reference to the shared `AGENTS.md` so the content lives in one place
    - Allowed: inline, import
  - `importTarget` (string, optional) — Path the import references, relative to the instruction file. Required when `mode` is `import`

## Architecture Constraints

None

## External Dependencies

- **ACP agent** (`acp` provider only): The agent command named in `CATALYST_ACP_COMMAND`, installed and signed in separately like the Copilot and Cursor CLIs
