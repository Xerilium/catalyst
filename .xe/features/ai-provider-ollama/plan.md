---
id: ai-provider-ollama
title: AI Provider - Ollama Implementation Plan
author: "@flanakin"
description: "Plan for implementing Ollama local AI provider"
---

# Implementation Plan: AI Provider - Ollama

## Overview

This feature implements the AIProvider interface for Ollama, enabling Catalyst to use locally-hosted AI models for privacy, offline operation, and cost-free AI usage. Unlike cloud providers, Ollama runs entirely locally without authentication requirements.

## Architecture Approach

### Provider Implementation

The OllamaProvider class will implement the AIProvider interface with:
- Name: 'ollama'
- Capabilities: ['headless'] - no interactive authentication required
- Server communication via the official ollama JavaScript SDK
- Default server: localhost:11434, overridable via OLLAMA_HOST environment variable

### SDK Integration Strategy

Use the official ollama npm package for all server communication:
- Leverage the SDK's built-in request/response handling
- Use SDK's chat API for message formatting
- Rely on SDK for HTTP connection management and error handling
- The SDK handles the REST API communication with the local Ollama server

### Server Connection Approach

Connection configuration:
- Default host: http://localhost:11434 (Ollama's default port)
- Environment override: OLLAMA_HOST variable for custom server locations
- No authentication credentials needed - Ollama is headless by design
- Pass host configuration to the SDK client during instantiation

Server availability detection:
- Use SDK's list() or similar lightweight API call to verify connectivity
- Quick timeout for fast failure detection (100ms requirement)
- Return boolean availability status without throwing errors

### Model Selection Strategy

Model handling approach:
- Accept model name via AIProviderRequest.model parameter
- Use Ollama's default model when no model specified in request
- No model validation upfront - let the SDK fail naturally if model doesn't exist
- Preserve model name in response metadata for traceability

Note: Models must be pre-pulled using 'ollama pull' command before use.

### Message Formatting

Map AIProviderRequest to Ollama SDK chat format:
- System prompt maps to message with role: 'system'
- User prompt maps to message with role: 'user'
- Format as array: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }]
- Pass maxTokens as options if provided (Ollama parameter name may differ - check SDK docs)

### Token Usage Extraction

Extract token counts from Ollama response metadata:
- Input tokens: response.prompt_eval_count
- Output tokens: response.eval_count
- Total tokens: sum of input and output
- Handle missing token counts gracefully (some models don't report them)
- Default to 0 if token counts unavailable

### Timeout and Cancellation Handling

Implement request lifecycle management:
- Inactivity timeout: Use inactivityTimeout parameter from request
- AbortSignal support: Pass abortSignal to SDK if it supports cancellation
- If SDK doesn't support AbortSignal directly, wrap the call with timeout logic
- Clean up pending requests on abort or timeout

### Error Handling Strategy

Server connectivity errors:
- Catch SDK connection errors (ECONNREFUSED, network errors)
- Throw AIProviderUnavailable with clear message: "Ollama server not reachable"
- Include guidance: "Start Ollama server or check OLLAMA_HOST environment variable"

Model not found errors:
- Catch SDK model errors (404, model not loaded)
- Throw descriptive error with model name
- Include guidance: "Pull model using: ollama pull {modelName}"

Other errors:
- Preserve SDK error messages for debugging
- Wrap in appropriate CatalystError types
- Log detailed error information while keeping user messages clear

## Implementation Structure

File organization:
- Create: src/ai/providers/ollama-provider.ts
- Implements: AIProvider interface from types.ts
- Imports: AIProviderRequest, AIProviderResponse, AIUsageStats from types.ts
- Imports: CatalystError types from errors.ts
- Dependencies: ollama npm package (external)

The provider will be auto-discovered by the existing provider registry generation script.

## Testing Strategy

Tests will be organized in TDD fashion:
- Group 1: Provider interface compliance (name, capabilities, interface methods)
- Group 2: Server connection and availability checks
- Group 3: Request execution with various configurations
- Group 4: Message formatting and model selection
- Group 5: Token usage extraction
- Group 6: Error handling scenarios
- Group 7: Timeout and cancellation behavior

Use mock SDK or real local Ollama for integration tests.

## Validation Criteria

Success indicators:
- All provider interface methods implemented
- Provider instantiation < 10ms (no heavy initialization)
- isAvailable() check < 100ms (quick server ping)
- Successful execution with local Ollama server
- Token counts extracted correctly when available
- Clear error messages for common failure scenarios
- Tests pass with 100% coverage of functional requirements

## Risk Mitigation

Potential risks and mitigations:
- Risk: Ollama SDK breaking changes
  - Mitigation: Pin SDK version in package.json, test against specific version
- Risk: Server not running during tests
  - Mitigation: Mock SDK for unit tests, skip integration tests if server unavailable
- Risk: Token counts not available
  - Mitigation: Make token counts optional, handle missing gracefully
- Risk: Model-specific behavior differences
  - Mitigation: Test with multiple common models, document known limitations
