---
id: ai-provider-gemini
title: AI Provider - Gemini
author: "@flanakin"
description: "Google Gemini AI provider implementation"
dependencies:
  - ai-provider
---

<!-- markdownlint-disable single-title -->

# Feature: AI Provider - Gemini

## Problem

Catalyst needs to integrate with Google's Gemini AI for intelligent content generation, code analysis, and decision-making. Without a Gemini provider, users cannot leverage Google's AI models through Catalyst's unified AI interface.

## Goals

- Implement `AIProvider` interface for Google Gemini platform
- Support headless execution via API key authentication
- Provide accurate token usage tracking

Explicit non-goals:

- This feature does NOT define the AIProvider interface (see `ai-provider`)
- This feature does NOT implement streaming (responses are collected before returning)

## Scenario

- As a **playbook author**, I need to use Gemini for AI prompts in my workflows
  - Outcome: Gemini provider seamlessly integrates with `ai-prompt` action

- As a **Catalyst user**, I need Gemini to work in server-side scenarios without user interaction
  - Outcome: API key authentication enables headless execution

## Success Criteria

- Provider instantiation completes in <10ms
- API key authentication detected in <5ms
- Token usage accurately reported for all requests

## Requirements

### Functional Requirements

#### FR:gemini: Gemini Provider Implementation

- **FR:gemini.interface**: Provider MUST implement `AIProvider` interface from `ai-provider`
  - `name` property MUST be `'gemini'`
  - `capabilities` MUST include `'headless'`

- **FR:gemini.sdk**: Provider MUST use `@google/genai` SDK for API communication
  - Official Google SDK for Gemini API
  - Handles message formatting and response parsing

- **FR:gemini.execute**: `execute()` method MUST:
  - Accept `AIProviderRequest` and return `AIProviderResponse`
  - Map `systemPrompt` to Gemini's system instruction format
  - Map `prompt` to user content
  - Respect `maxTokens` parameter
  - Implement inactivity timeout via `inactivityTimeout` parameter
  - Support cancellation via `abortSignal`

- **FR:gemini.models**: Provider MUST support Gemini model selection
  - Use SDK's default model when not specified (no hardcoded default)
  - Accept model override via `AIProviderRequest.model`

#### FR:gemini.auth: Authentication

- **FR:gemini.auth.api-key**: Provider MUST support API key authentication
  - Check `GOOGLE_API_KEY` environment variable
  - Alternative: `GEMINI_API_KEY` environment variable
  - API key enables headless execution

- **FR:gemini.auth.available**: `isAvailable()` MUST return true if:
  - `GOOGLE_API_KEY` or `GEMINI_API_KEY` environment variable is set

- **FR:gemini.auth.signin**: `signIn()` MUST:
  - Provide guidance for obtaining API key
  - Throw `AIProviderUnavailable` (no interactive flow available)

#### FR:gemini.usage: Usage Tracking

- **FR:gemini.usage.tokens**: Provider MUST extract token usage from SDK response
  - `inputTokens`: Tokens consumed by prompt
  - `outputTokens`: Tokens generated in response
  - `totalTokens`: Sum of input and output tokens

#### FR:gemini.errors: Error Handling

- **FR:gemini.errors.auth**: Authentication errors MUST throw `AIProviderUnavailable`
  - Message indicates API key not configured
  - Guidance explains how to obtain and set API key

- **FR:gemini.errors.rate-limit**: Rate limit errors MUST include retry guidance

- **FR:gemini.errors.model**: Invalid model errors MUST be descriptive

### Non-Functional Requirements

#### NFR:gemini.performance: Performance

- **NFR:gemini.performance.instantiation**: Provider instantiation MUST complete in <10ms
- **NFR:gemini.performance.auth-check**: `isAvailable()` MUST complete in <5ms

## Key Entities

Entities owned by this feature:

- **GeminiProvider**: Implementation of `AIProvider` for Google Gemini platform
  - Uses @google/genai SDK for API communication
  - API key authentication (headless)

Entities from other features:

- **AIProvider** (ai-provider): Interface this provider implements
- **AIProviderRequest** (ai-provider): Input structure
- **AIProviderResponse** (ai-provider): Output structure
- **AIUsageStats** (ai-provider): Token usage tracking
- **CatalystError** (error-handling): Error class for failures

## Dependencies

**Internal Dependencies:**

- **ai-provider**: Provides `AIProvider` interface and factory registration

**External Dependencies:**

- **@google/genai**: Official Google SDK for Gemini API
