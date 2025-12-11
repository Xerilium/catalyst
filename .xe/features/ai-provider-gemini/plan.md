---
id: ai-provider-gemini
title: AI Provider - Gemini Implementation Plan
author: "@flanakin"
description: "Plan for implementing Google Gemini AI provider"
---

# Implementation Plan: AI Provider - Gemini

## Overview

This feature implements the AIProvider interface for Google's Gemini AI platform, enabling Catalyst to leverage Google's AI models through a unified interface. The implementation follows established patterns from the mock-provider and integrates with the @google/genai SDK.

## Implementation Approach

### SDK Integration

The implementation will use the official @google/genai SDK as the primary interface to Google's Gemini API. This SDK provides:

- Native TypeScript support with full type definitions
- Built-in message formatting and response parsing
- Automatic handling of Gemini-specific request/response structures
- Native support for system instructions and content formatting

Rather than building low-level HTTP requests, we leverage the SDK's high-level API to simplify implementation and ensure compatibility with Google's API evolution.

### Authentication Strategy

The provider will support headless execution through API key authentication, checking environment variables in order of preference:

1. GOOGLE_API_KEY - Primary environment variable (aligns with Google's standard naming)
2. GEMINI_API_KEY - Alternative environment variable (more specific to Gemini)

The isAvailable() method performs a fast check (<5ms requirement) by simply verifying environment variable presence. No API calls are made during availability checks to maintain performance requirements.

For signIn(), since Gemini does not support interactive OAuth flows in the same way as Claude, the method will throw AIProviderUnavailable with guidance on:

- Where to obtain an API key (Google AI Studio)
- How to set the environment variable
- Links to official documentation

### Message Mapping Strategy

Gemini's SDK uses a different message structure than the generic AIProvider interface. The mapping strategy:

**System Prompt Handling:**
- AIProviderRequest.systemPrompt maps to Gemini's systemInstruction parameter
- This is passed as a configuration option when creating the model instance
- System instructions provide context for the entire conversation

**User Prompt Handling:**
- AIProviderRequest.prompt maps to the user message content
- Formatted as a single user message in the conversation
- No complex multi-turn conversation handling needed (single-shot requests)

**Model Selection:**
- Use AIProviderRequest.model if provided
- Otherwise, rely on SDK's default model selection (no hardcoded fallback)
- This ensures forward compatibility as Google updates their default model

**Token Limits:**
- Map AIProviderRequest.maxTokens to the SDK's maxOutputTokens parameter
- Controls the maximum length of generated responses

### Cancellation and Timeout Handling

The implementation must support request cancellation and inactivity timeouts:

**AbortSignal Integration:**
- AIProviderRequest.abortSignal propagates to SDK calls
- Enables external cancellation (e.g., user interruption, playbook timeout)

**Inactivity Timeout:**
- AIProviderRequest.inactivityTimeout defines maximum idle time
- Implementation approach: wrap SDK call with timeout logic
- If no response activity within timeout period, abort the request
- Clean up resources and throw descriptive timeout error

### Token Usage Extraction

Gemini's SDK returns usage metadata in the response structure. The extraction strategy:

- Access response.usageMetadata from SDK response
- Map promptTokenCount to AIUsageStats.inputTokens
- Map candidatesTokenCount to AIUsageStats.outputTokens
- Calculate totalTokens as sum of input and output
- Cost calculation not included initially (requires pricing lookup)

If usage metadata is unavailable (unlikely but possible), return undefined for usage field rather than synthetic values.

### Error Handling Strategy

The implementation will translate Gemini SDK errors to Catalyst's error model:

**Authentication Errors:**
- SDK throws when API key is missing or invalid
- Catch and wrap in AIProviderUnavailable
- Include guidance on obtaining and configuring API key
- Reference both GOOGLE_API_KEY and GEMINI_API_KEY options

**Rate Limit Errors:**
- SDK may throw rate limit errors during high usage
- Catch and wrap in descriptive CatalystError
- Include retry guidance (backoff strategy, quotas)
- Preserve original error details in metadata

**Invalid Model Errors:**
- SDK throws when model name is not recognized
- Catch and wrap in descriptive CatalystError
- Include list of valid model names if available
- Suggest checking documentation

**General API Errors:**
- Catch unexpected SDK errors
- Wrap in CatalystError with descriptive message
- Include original error in guidance for debugging
- Preserve stack traces for troubleshooting

### Performance Considerations

The implementation must meet strict performance requirements:

**Instantiation (<10ms):**
- Constructor should only set properties
- No SDK initialization or API calls
- No environment variable validation
- Defer all I/O operations to execute()

**Availability Check (<5ms):**
- Simple environment variable presence check
- No API calls or network requests
- No SDK initialization
- Return cached result if called multiple times

**Execution Performance:**
- Primary latency is network round-trip to Gemini API
- SDK handles connection pooling and request optimization
- No additional overhead from Catalyst wrapper

## Testing Strategy

The implementation follows Test-Driven Development (TDD) principles:

### Unit Tests Phase

Write comprehensive unit tests before implementation:

1. Provider interface conformance (name, capabilities)
2. Constructor behavior (fast, no side effects)
3. isAvailable() environment variable checks
4. signIn() error throwing with guidance
5. execute() message mapping and response handling
6. Token usage extraction
7. Error handling for all error types
8. Cancellation via AbortSignal
9. Inactivity timeout handling

Use mocks to isolate the provider from the actual Gemini SDK during testing.

### Implementation Phase

Implement the provider to pass all unit tests:

1. GeminiProvider class structure
2. SDK integration and initialization
3. Message mapping logic
4. Response parsing and usage extraction
5. Error handling and translation
6. Timeout and cancellation support

### Integration Testing

Validate with real Gemini API calls (requires API key):

1. Successful request/response cycle
2. Token usage accuracy
3. Model selection behavior
4. Error handling with actual API errors

### Validation

Final checks:

1. All unit tests pass
2. Provider registry includes Gemini
3. Integration with ai-prompt action works
4. Performance requirements met
5. Documentation complete

## Risk Mitigation

**SDK Version Compatibility:**
- Pin @google/genai version in package.json
- Test with specific SDK version
- Document SDK version requirements
- Plan for SDK updates separately

**API Changes:**
- Google may change API behavior
- SDK abstracts most API details
- Monitor SDK release notes
- Update implementation when SDK changes

**Token Counting Accuracy:**
- Usage metadata from SDK should be accurate
- Validate against known test cases
- Document any discrepancies found
- Report issues to Google if SDK has bugs

**Environment Variable Conflicts:**
- Multiple tools may use GOOGLE_API_KEY
- Document precedence (GOOGLE_API_KEY > GEMINI_API_KEY)
- Consider validation in isAvailable()

## Dependencies

**Internal:**
- ai-provider feature (AIProvider interface, types, errors)
- error-handling (CatalystError base class)

**External:**
- @google/genai SDK (official Google package)

## Success Metrics

Implementation is complete when:

1. All unit tests pass (100% coverage)
2. Integration tests validate real API calls
3. Provider instantiation <10ms
4. isAvailable() check <5ms
5. Provider registry auto-discovers GeminiProvider
6. Works with ai-prompt action in playbooks
7. Error messages are clear and actionable
