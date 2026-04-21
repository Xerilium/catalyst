---
id: ai-provider-openai
title: AI Provider - OpenAI
dependencies:
  - ai-provider
---

<!-- markdownlint-disable single-title -->

# Feature: AI Provider - OpenAI

## Purpose

Catalyst needs to integrate with OpenAI's GPT models for intelligent content generation, code analysis, and decision-making. The OpenAI provider implements the `AIProvider` interface, supporting headless execution via API key authentication with accurate token usage tracking.

Explicit non-goals:

- This feature does NOT define the AIProvider interface (see `ai-provider`)
- This feature does NOT implement streaming (responses are collected before returning)

## Scenarios

### FR:openai: OpenAI Provider Implementation

Playbook author needs OpenAI integration in workflows so that intelligent content generation and code analysis can be automated.

- **FR:openai.interface** (P1): Provider MUST implement `AIProvider` interface from `ai-provider`
  > - @req FR:ai-provider/provider.interface
  - `name` property MUST be `'openai'`
  - `capabilities` MUST include `'headless'`

- **FR:openai.sdk** (P1): Provider MUST use `openai` SDK for API communication
  - Official OpenAI SDK
  - Handles message formatting and response parsing

- **FR:openai.execute** (P1): `execute()` method MUST:
  - Accept `AIProviderRequest` and return `AIProviderResponse`
  - Map `systemPrompt` to OpenAI's system message role
  - Map `prompt` to user message role
  - Respect `maxTokens` parameter
  - Implement inactivity timeout via `inactivityTimeout` parameter
  - Support cancellation via `abortSignal`

- **FR:openai.models** (P2): Provider MUST support OpenAI model selection
  - Use SDK's default model when not specified (no hardcoded default)
  - Accept model override via `AIProviderRequest.model`

### FR:openai.auth: Authentication

Catalyst user needs OpenAI to work in server-side scenarios without user interaction so that API key authentication enables headless execution.

- **FR:openai.auth.api-key** (P1): Provider MUST support API key authentication
  - Check `OPENAI_API_KEY` environment variable
  - API key enables headless execution

- **FR:openai.auth.available** (P1): `isAvailable()` MUST return true if:
  - `OPENAI_API_KEY` environment variable is set

- **FR:openai.auth.signin** (P1): `signIn()` MUST:
  - Provide guidance for obtaining API key
  - Throw `AIProviderUnavailable` (no interactive flow available)

### FR:openai.usage: Usage Tracking

Catalyst user needs accurate token usage reporting so that consumption can be monitored and optimized.

- **FR:openai.usage.tokens** (P3): Provider MUST extract token usage from SDK response
  - `inputTokens`: `prompt_tokens` from response
  - `outputTokens`: `completion_tokens` from response
  - `totalTokens`: `total_tokens` from response

### FR:openai.errors: Error Handling

Catalyst user needs clear error messages and guidance so that authentication and runtime failures can be resolved quickly.

- **FR:openai.errors.auth** (P2): Authentication errors MUST throw `AIProviderUnavailable`
  - Message indicates API key not configured or invalid
  - Guidance explains how to obtain and set API key

- **FR:openai.errors.rate-limit** (P2): Rate limit errors MUST include retry guidance
  - Extract retry-after header if available

- **FR:openai.errors.model** (P2): Invalid model errors MUST be descriptive

### Non-Functional Requirements

- **NFR:openai.performance.instantiation** (P4): Provider instantiation MUST complete in <10ms
- **NFR:openai.performance.auth-check** (P4): `isAvailable()` MUST complete in <5ms

## Architecture Constraints

None

## External Dependencies

- **openai**: Official OpenAI SDK
