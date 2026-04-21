---
id: playbook-actions-ai
title: Playbook Actions - AI
description: AI action primitives for playbooks — prompts with dynamic context and predictable output formats.
dependencies:
  - playbook-definition
  - error-handling
  - ai-provider
---

<!-- markdownlint-disable single-title -->

# Feature: Playbook Actions - AI

## Purpose

Playbooks need AI capabilities to generate content, analyze code, and make intelligent decisions within automated workflows. This feature enables playbook authors to execute AI prompts with dynamic context from playbook variables and ensures predictable AI output formats for downstream processing in playbook steps. This feature does NOT provide streaming output to users (AI responses are collected before returning).

## Scenarios

### FR:ai-prompt: AI Prompt Action

Playbook author needs to execute AI prompts with dynamic context, predictable output formats, and platform-agnostic provider abstraction so that workflows can leverage AI capabilities seamlessly.

> **Note**: AI provider infrastructure (AIProvider interface, factory, catalog) is defined in the `ai-provider` feature.

- **FR:ai-prompt.config** (P1): System MUST provide `ai-prompt` action implementing `PlaybookAction<AIPromptConfig>`
  > - @req FR:playbook-definition/types.action.interface

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

- **FR:ai-prompt.interpolation** (P1): Action MUST support template interpolation in ALL config properties
  - Template engine performs interpolation BEFORE action execution
  - Action receives config with variables already replaced
  - Enables dynamic values for `prompt`, `role`, `context`, `return`, `maxTokens`, etc.

- **FR:ai-prompt.role** (P1): Action MUST support role-based AI persona configuration
  - **FR:ai-prompt.role.name** (P1): When `role` matches a known role name (case-insensitive), map to corresponding system prompt:
    - `"Product Manager"` → "You are a strategic Product Manager. You define product requirements with precision, prioritize features based on business value and user impact, and ensure every decision aligns with measurable business goals. You think in terms of outcomes, not outputs."
    - `"Engineer"` → "You are an expert Software Engineer. You implement features with clean, maintainable code following established patterns and best practices. You prioritize correctness, performance, and technical quality. You write code that other engineers can understand and extend."
    - `"Architect"` → "You are a seasoned Software Architect. You design systems for scalability, maintainability, and long-term evolution. You make technical decisions with full awareness of trade-offs and ensure architectural consistency across the codebase."
  - **FR:ai-prompt.role.custom** (P1): When `role` is non-empty but does not match a known role name, use the value directly as the system prompt text
  - **FR:ai-prompt.role.default** (P1): When `role` is empty or not specified, use the playbook `owner` property value and apply role name mapping per FR:ai-prompt.role.name

- **FR:ai-prompt.context** (P1): Action MUST assemble context for AI access
  - Context is a dictionary of name-value pairs where name describes the content and value is either a file path or literal content
  - **FR:ai-prompt.context.detection** (P1): Action MUST detect whether each context value is a file path or literal content:
    - Multi-line strings (containing newlines) MUST be treated as literal content, never file paths
    - Single-line strings are checked as potential file paths; if the file exists, use it directly
    - If the file does not exist, treat the value as literal content
  - **FR:ai-prompt.context.files** (P1): Context values that are not file paths MUST be written to temporary files to avoid formatting conflicts (context may contain Markdown, XML, JSON, or code)
  - **FR:ai-prompt.context.instruction** (P1): Action MUST include file references in the prompt:

    ```text
    ## Context Files

    Review the following files for context before proceeding:
    - {name}: {file path}
    - {name}: {file path}
    ```

  - **FR:ai-prompt.context.position** (P1): Context instructions MUST be prepended before the user's prompt text

- **FR:ai-prompt.return** (P1): Action MUST support return value specification via file output
  - `return` property describes what should be returned to the playbook
  - **FR:ai-prompt.return.file** (P1): When `return` is specified, action MUST:
    1. Create a temporary output file path
    2. Include in prompt instruction for AI to write output to that file:

       ```text
       ## Required Output

       {return value description}

       IMPORTANT: Write your output to: {output file path}
       ```

    3. After AI completion, read the output file contents as the step `value`
  - **FR:ai-prompt.return.empty** (P1): When `return` is empty or not specified, no output file is created and no value is returned to the step output variable

- **FR:ai-prompt.provider-resolution** (P1): Action MUST resolve provider using the following precedence:
  > - @req FR:ai-provider/provider.interface
  1. `provider` property in action config (if specified)
  2. Default provider: `claude`

- **FR:ai-prompt.timeout** (P2): Action MUST enforce inactivity-based timeout
  - **FR:ai-prompt.timeout.default** (P2): Default inactivity timeout MUST be 300000ms (5 minutes)
  - **FR:ai-prompt.timeout.activity** (P2): Timeout timer MUST reset on any AI activity (token generation, tool use, thinking)
  - **FR:ai-prompt.timeout.cancel** (P2): AI request MUST be cancelled only if no activity occurs within the timeout period
  - **FR:ai-prompt.timeout.error** (P2): Timeout errors MUST throw CatalystError with code 'AIPromptTimeout'

- **FR:ai-prompt.validation** (P2): Action MUST validate configuration before execution
  > - @req FR:error-handling/catalyst-error
  - **FR:ai-prompt.validation.prompt-missing** (P2): Missing `prompt` property MUST throw CatalystError with code 'AIPromptMissing'
  - **FR:ai-prompt.validation.prompt-empty** (P2): Empty `prompt` string MUST throw CatalystError with code 'AIPromptEmpty'
  - **FR:ai-prompt.validation.provider-unknown** (P2): Unknown `provider` value MUST throw CatalystError with code 'AIProviderNotFound'; error MUST list available providers
  - **FR:ai-prompt.validation.timeout-invalid** (P2): Invalid `inactivityTimeout` (<0) MUST throw CatalystError with code 'InvalidAITimeout'

- **FR:ai-prompt.result** (P1): Action MUST return PlaybookActionResult
  - `code`: 'Success' on success, error code on failure
  - `message`: Human-readable execution status including provider used
  - `value`: Contents of output file when `return` is specified; null otherwise
  - `error`: CatalystError if execution failed, null otherwise

- **FR:ai-prompt.metadata** (P3): `ai-prompt` action MUST declare static metadata for action catalog
  - `static readonly actionType = 'ai-prompt'`
  - `static readonly primaryProperty = 'prompt'` (enables shorthand syntax)

### Non-functional Requirements

**NFR:perf**: Performance

- **NFR:perf.instantiation**: Provider instantiation MUST complete in <10ms
- **NFR:perf.overhead**: Action execution overhead (excluding AI response time) MUST be <100ms

**NFR:reliability**: Reliability

- **NFR:reliability.timeout**: Timeout cancellation MUST properly abort in-flight AI requests
- **NFR:reliability.errors**: Provider errors MUST be caught and converted to CatalystError

**NFR:test**: Testability

- **NFR:test.isolation**: All components MUST be testable in isolation with mock provider
- **NFR:test.mockable**: Provider interface MUST be mockable for unit testing
- **NFR:test.coverage-success**: 90% code coverage for success paths
- **NFR:test.coverage-errors**: 100% coverage for error handling paths

**NFR:maintain**: Maintainability

- **NFR:maintain.separation**: Provider implementations MUST be in separate features
- **NFR:maintain.consistency**: Error codes MUST be consistent with other playbook action features
- **NFR:maintain.types**: Configuration interfaces MUST use TypeScript for type safety

## Architecture Constraints

None

## External Dependencies

- **Node.js >= 18**: AbortController for timeout handling
