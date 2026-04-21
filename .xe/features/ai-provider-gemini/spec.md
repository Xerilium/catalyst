---
id: ai-provider-gemini
title: AI Provider - Gemini
dependencies:
  - ai-provider
---

<!-- markdownlint-disable single-title -->

# Feature: AI Provider - Gemini

## Purpose

Catalyst needs to integrate with Google's Gemini AI for intelligent content generation, code analysis, and decision-making. The Gemini provider implements the `AIProvider` interface, supporting headless execution via API key authentication with accurate token usage tracking.

Explicit non-goals:

- This feature does NOT define the AIProvider interface (see `ai-provider`)
- This feature does NOT implement streaming (responses are collected before returning)

## Scenarios

### FR:gemini: Gemini Provider Implementation

Playbook author needs Gemini AI integration in workflows so that intelligent content generation and code analysis can be automated.

- **FR:gemini.interface** (P1): Provider MUST implement `AIProvider` interface from `ai-provider`
  > - @req FR:ai-provider/provider.interface
  - `name` property MUST be `'gemini'`
  - `capabilities` MUST include `'headless'`

- **FR:gemini.sdk** (P1): Provider MUST use `@google/genai` SDK for API communication
  - Official Google SDK for Gemini API
  - Handles message formatting and response parsing

- **FR:gemini.execute** (P1): `execute()` method MUST:
  - Accept `AIProviderRequest` and return `AIProviderResponse`
  - Map `systemPrompt` to Gemini's system instruction format
  - Map `prompt` to user content
  - Respect `maxTokens` parameter
  - Implement inactivity timeout via `inactivityTimeout` parameter
  - Support cancellation via `abortSignal`

- **FR:gemini.models** (P2): Provider MUST support Gemini model selection
  - Use SDK's default model when not specified (no hardcoded default)
  - Accept model override via `AIProviderRequest.model`

### FR:gemini.auth: Authentication

Catalyst user needs Gemini to work in server-side scenarios without user interaction so that API key authentication enables headless execution.

- **FR:gemini.auth.api-key** (P1): Provider MUST support API key authentication
  - Check `GOOGLE_API_KEY` environment variable
  - Alternative: `GEMINI_API_KEY` environment variable
  - API key enables headless execution

- **FR:gemini.auth.available** (P1): `isAvailable()` MUST return true if:
  - `GOOGLE_API_KEY` or `GEMINI_API_KEY` environment variable is set

- **FR:gemini.auth.signin** (P1): `signIn()` MUST:
  - Provide guidance for obtaining API key
  - Throw `AIProviderUnavailable` (no interactive flow available)

### FR:gemini.usage: Usage Tracking

Catalyst user needs accurate token usage reporting so that consumption can be monitored and optimized.

- **FR:gemini.usage.tokens** (P3): Provider MUST extract token usage from SDK response
  - `inputTokens`: Tokens consumed by prompt
  - `outputTokens`: Tokens generated in response
  - `totalTokens`: Sum of input and output tokens

### FR:gemini.errors: Error Handling

Catalyst user needs clear error messages and guidance so that authentication and runtime failures can be resolved quickly.

- **FR:gemini.errors.auth** (P2): Authentication errors MUST throw `AIProviderUnavailable`
  - Message indicates API key not configured
  - Guidance explains how to obtain and set API key

- **FR:gemini.errors.rate-limit** (P2): Rate limit errors MUST include retry guidance

- **FR:gemini.errors.model** (P2): Invalid model errors MUST be descriptive

### Non-Functional Requirements

- **NFR:gemini.performance.instantiation** (P4): Provider instantiation MUST complete in <10ms
- **NFR:gemini.performance.auth-check** (P4): `isAvailable()` MUST complete in <5ms

## Architecture Constraints

None

## External Dependencies

- **@google/genai**: Official Google SDK for Gemini API
