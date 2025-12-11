---
id: ai-provider-openai
title: AI Provider - OpenAI Implementation Plan
author: "@flanakin"
description: "Plan for implementing OpenAI provider"
---

# Implementation Plan: AI Provider - OpenAI

## Overview

This feature implements the `AIProvider` interface for OpenAI's platform, enabling Catalyst to leverage GPT models for intelligent content generation, code analysis, and decision-making through a unified interface.

## Implementation Approach

### SDK Integration

Use the official `openai` npm package as the communication layer:

- Import OpenAI client from the SDK
- Initialize client with API key from environment
- Use SDK's chat completions API for message handling
- Let SDK handle request formatting and response parsing
- Leverage SDK's built-in error handling and retry logic

The SDK provides proper types, handles API versioning, and manages low-level HTTP concerns.

### Authentication Strategy

API key-based authentication enables headless execution:

- Check `OPENAI_API_KEY` environment variable in `isAvailable()`
- Pass API key to SDK client during initialization
- Return `true` from `isAvailable()` if key is present
- Throw `AIProviderUnavailable` from `signIn()` with guidance on obtaining API key

No interactive authentication flow exists for OpenAI (API key only), so `signIn()` provides instructions rather than performing actual authentication.

### Message Mapping

Map Catalyst's request structure to OpenAI's chat message format:

- `systemPrompt` maps to message with `role: 'system'`
- `prompt` maps to message with `role: 'user'`
- Both messages are included in the `messages` array
- System message comes first, followed by user message

This follows OpenAI's standard chat completion pattern.

### Model Selection

Defer to SDK defaults while supporting explicit overrides:

- If `AIProviderRequest.model` is provided, use it
- If not provided, let SDK use its default model
- Do not hardcode a fallback model in provider code
- Pass model parameter directly to SDK's chat completion call

This approach keeps the provider flexible as OpenAI updates their default models.

### Request Parameters

Map additional request parameters to SDK options:

- `maxTokens` maps to `max_tokens` in completion options
- `abortSignal` maps to SDK's `signal` option for cancellation
- `inactivityTimeout` requires custom timeout implementation around SDK call

The inactivity timeout tracks time between response chunks and cancels if exceeded.

### Token Usage Extraction

Extract usage statistics from SDK response:

- Access `response.usage` object from completion result
- Map `prompt_tokens` to `inputTokens`
- Map `completion_tokens` to `outputTokens`
- Map `total_tokens` to `totalTokens`
- Include all three in returned `AIUsageStats`

OpenAI consistently provides usage data in responses.

### Error Handling Strategy

Transform OpenAI SDK errors into Catalyst error types:

**Authentication Errors:**
- Catch API key missing/invalid errors
- Throw `AIProviderUnavailable` with clear message
- Include guidance: "Set OPENAI_API_KEY environment variable"
- Provide link to OpenAI API keys page

**Rate Limit Errors:**
- Detect rate limit status codes (429)
- Extract `retry-after` header if present
- Include retry timing in error message
- Suggest upgrading plan if consistently hitting limits

**Model Errors:**
- Catch invalid model errors
- Include valid model list in error message if available
- Suggest checking OpenAI documentation for model names

**Network/Timeout Errors:**
- Let SDK handle retries for transient failures
- Respect `abortSignal` for user cancellation
- Implement `inactivityTimeout` as separate concern

**General Errors:**
- Wrap unexpected errors in generic CatalystError
- Preserve original error message for debugging
- Include provider name in error context

### Performance Considerations

Meet performance requirements through efficient initialization:

**Provider Instantiation (<10ms):**
- Constructor only assigns properties
- No SDK initialization in constructor
- Lazy-initialize SDK client on first `execute()` call
- Environment variable reads are fast

**Availability Check (<5ms):**
- `isAvailable()` only checks environment variable
- No network calls or SDK initialization
- Simple boolean check with minimal overhead

### Testing Strategy

Follow TDD approach with comprehensive test coverage:

**Unit Tests:**
- Mock OpenAI SDK to avoid real API calls
- Test message mapping logic
- Test token usage extraction
- Test error transformation
- Test timeout behavior
- Test cancellation handling

**Integration Tests:**
- Skip by default (require real API key)
- Allow opt-in via environment variable
- Verify actual OpenAI API communication
- Test with real model responses

## Implementation Phases

### Phase 1: Test Infrastructure
Set up test file with SDK mocks and test utilities before writing provider code.

### Phase 2: Core Implementation
Implement provider class with all interface methods, following patterns from mock provider.

### Phase 3: Error Handling
Add comprehensive error transformation and handling for all failure modes.

### Phase 4: Integration
Register provider in catalog, verify discovery system picks it up automatically.

### Phase 5: Validation
Run full test suite, verify performance targets, test with real API key manually.

## Validation Criteria

- All tests pass with mocked SDK
- Provider instantiation completes in <10ms
- `isAvailable()` completes in <5ms
- Token usage accurately extracted from responses
- Error messages are clear and actionable
- Provider appears in catalog automatically
- Manual test with real API key succeeds
