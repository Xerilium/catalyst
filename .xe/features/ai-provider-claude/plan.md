---
id: ai-provider-claude
title: AI Provider - Claude Implementation Plan
author: "@flanakin"
description: "Implementation approach for Claude AI provider using Claude Agent SDK"
---

# Implementation Plan: AI Provider - Claude

## Overview

This feature implements the `AIProvider` interface for Claude AI, enabling Catalyst to leverage Anthropic's Claude models through the official Claude Agent SDK. The implementation prioritizes subscription-based authentication for interactive users while supporting API key fallback for headless scenarios.

## SDK Integration Approach

### Claude Agent SDK

The implementation will use `@anthropic-ai/claude-agent-sdk` as the primary integration point:

- SDK provides unified interface for both subscription and API key authentication
- Handles message formatting, request/response structure, and token tracking
- Manages authentication state and session lifecycle
- Provides built-in error handling and retry logic

The provider will act as an adapter between Catalyst's `AIProvider` interface and the SDK's API.

### Package Installation

Add `@anthropic-ai/claude-agent-sdk` to package.json dependencies. The SDK should be listed as a production dependency since it's required for runtime Claude integration.

## Authentication Strategy

### Two-Tier Priority System

The provider implements a two-tier authentication approach that matches real-world usage patterns:

**Tier 1: Subscription Authentication (Primary)**
- Check Claude subscription status using SDK's built-in authentication check
- This is the preferred method for interactive users with Claude subscriptions
- Provides seamless integration with user's existing Claude account
- `isAvailable()` returns true if subscription is active

**Tier 2: API Key Authentication (Fallback)**
- Check for `ANTHROPIC_API_KEY` environment variable
- Only evaluated if subscription authentication is not available
- Enables headless execution in CI/CD, server environments
- `isAvailable()` returns true if API key is present

### Sign-In Flow

The `signIn()` method triggers SDK's interactive authentication:
- Launches browser-based OAuth flow for subscription authentication
- Waits for user to complete authentication
- Stores authentication token via SDK's token management
- Throws `AIProviderUnavailable` if authentication fails or is cancelled

## Message Mapping Strategy

### Request Transformation

Transform `AIProviderRequest` to SDK's message format:

**System Prompt Mapping**:
- Map `systemPrompt` field to SDK's system message parameter
- System messages establish Claude's role and behavior constraints

**User Prompt Mapping**:
- Map `prompt` field to SDK's user message
- This contains the actual request with context and return instructions

**Parameter Mapping**:
- `model` → SDK's model parameter (use SDK default if not specified)
- `maxTokens` → SDK's max_tokens parameter
- `abortSignal` → SDK's cancellation mechanism

### Response Transformation

Transform SDK response to `AIProviderResponse`:

**Content Extraction**:
- Extract generated text from SDK response content blocks
- Combine multiple content blocks if present

**Token Usage Extraction**:
- Extract `input_tokens` → `inputTokens`
- Extract `output_tokens` → `outputTokens`
- Calculate `totalTokens` as sum of input and output

**Metadata Preservation**:
- Store SDK response ID, stop reason in metadata field
- Preserve model identifier used for the request

## Error Handling Approach

### Error Classification

Map SDK errors to appropriate Catalyst error types:

**Authentication Errors**:
- SDK authentication failures → `AIProviderUnavailable`
- Include guidance to run `signIn()` method
- Distinguish between missing credentials and invalid credentials

**Rate Limiting**:
- SDK rate limit errors → Preserve error with retry guidance
- Include wait time from SDK response headers if available
- Provide clear message about rate limit status

**Invalid Model**:
- SDK model not found errors → Descriptive error with model name
- Suggest valid model alternatives if available from SDK

**Request Errors**:
- Malformed request errors → Validation error with specific issue
- Timeout errors → Clear timeout message with inactivity duration

### Error Recovery Patterns

The provider will implement graceful degradation:
- Authentication errors: Suggest sign-in flow
- Rate limits: Include wait time and retry guidance
- Transient errors: Let SDK's retry logic handle automatically
- Fatal errors: Fail fast with clear error messages

## Performance Considerations

### Instantiation Optimization

Provider instantiation must complete in <10ms:
- Lazy-load SDK client (create on first use, not in constructor)
- Defer all I/O operations until method calls
- Cache SDK client instance for reuse across requests

### Authentication Check Optimization

`isAvailable()` must complete in <5ms:
- Check environment variable synchronously (no async I/O)
- Use SDK's cached authentication state (no network calls)
- Avoid filesystem operations in the hot path

### Request Execution

Optimize the execute path:
- Reuse SDK client instance across multiple requests
- Implement inactivity timeout using SDK's timeout mechanisms
- Support cancellation via AbortSignal passed to SDK

## Implementation Structure

### File Organization

Create single provider file:
- `src/ai/providers/claude-provider.ts`
  - ClaudeProvider class implementing AIProvider interface
  - Private helper methods for message mapping
  - Error transformation utilities

### Class Structure

The ClaudeProvider class will follow this structure:

- Readonly properties: name, displayName, capabilities, commands
- Private SDK client instance (lazy-loaded)
- Private authentication checking methods
- Public AIProvider interface methods: execute, isAvailable, signIn
- Private helper methods: message mapping, error handling, token extraction

### Command Configuration

The provider defines command configuration for slash command generation:

- `path`: `.claude/commands`
- `useNamespaces`: true (uses `catalyst/` directory)
- `separator`: `:` (e.g., `/catalyst:rollout`)
- `useFrontMatter`: true (preserves YAML front matter)
- `extension`: `md`

### Dependencies

Internal imports:
- AIProvider interface and types from `./types`
- CatalystError from error handling module

External imports:
- Claude Agent SDK client and types

## Validation Strategy

### Test Coverage Areas

Comprehensive test suite covering:
- Provider instantiation and configuration
- Authentication state checking (subscription and API key)
- Message mapping (request and response)
- Token usage extraction and calculation
- Error handling for all error types
- Cancellation and timeout behavior

### Integration Testing

Validate integration with:
- Mock SDK responses for deterministic testing
- Real SDK calls (optional, for CI with test API key)
- Playbook action integration via ai-prompt action

## Risk Mitigation

### Known Risks

**SDK API Changes**:
- Risk: Claude Agent SDK API may evolve
- Mitigation: Pin SDK version, test thoroughly before updates

**Authentication Complexity**:
- Risk: Two-tier auth adds complexity
- Mitigation: Clear priority order, extensive testing

**Token Tracking Accuracy**:
- Risk: Token counts must be accurate for cost tracking
- Mitigation: Direct extraction from SDK response (authoritative source)

### Rollback Strategy

If implementation issues arise:
- Provider can be removed from provider catalog without breaking other features
- Mock provider provides fallback for testing
- Other providers (future: Gemini, OpenAI) remain unaffected
