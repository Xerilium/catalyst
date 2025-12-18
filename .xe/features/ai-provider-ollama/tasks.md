---
id: ai-provider-ollama
title: AI Provider - Ollama Tasks
author: "@flanakin"
description: "Implementation tasks for Ollama AI provider"
---

# Tasks: AI Provider - Ollama

**Input**: Design documents from `.xe/features/ai-provider-ollama/`
**Prerequisites**: spec.md (required), plan.md (required)

## Step 1: Setup

- [x] T001: Install dependencies
  - @req FR:ai-provider-ollama/ollama.sdk
  - Add `ollama` npm package to package.json
  - Run `npm install`
  - Verify SDK version compatibility

## Step 2: Test Suite (TDD Approach)

### Provider Interface Tests

- [x] T003: Write provider interface compliance tests
  - @req FR:ai-provider-ollama/ollama.interface
  - Test provider name is 'ollama'
  - Test capabilities include 'headless'
  - Test interface methods exist (execute, isAvailable, signIn)
  - Create: tests/ai/providers/ollama-provider.test.ts

- [x] T004: Write provider instantiation tests
  - @req NFR:ai-provider-ollama/ollama.performance.instantiation
  - Test provider instantiates in < 10ms
  - Test no errors during construction
  - Test default configuration applied

### Server Connection Tests

- [x] T005: Write server availability tests
  - @req FR:ai-provider-ollama/ollama.server.available
  - @req NFR:ai-provider-ollama/ollama.performance.server-check
  - Test isAvailable() returns true when server running
  - Test isAvailable() returns false when server not reachable
  - Test isAvailable() completes in < 100ms
  - Mock SDK for controlled testing

- [x] T006: Write server configuration tests
  - @req FR:ai-provider-ollama/ollama.server.url
  - Test default URL is http://localhost:11434
  - Test OLLAMA_HOST environment override works
  - Test connection uses configured URL

- [x] T007: Write signIn tests
  - @req FR:ai-provider-ollama/ollama.server.signin
  - Test signIn() verifies server is running
  - Test signIn() throws AIProviderUnavailable if server unreachable
  - Mock server unavailable scenario

### Request Execution Tests

- [x] T008: Write basic execution tests
  - @req FR:ai-provider-ollama/ollama.execute
  - Test execute() accepts AIProviderRequest
  - Test execute() returns AIProviderResponse
  - Test response contains content string
  - Mock SDK chat API

- [x] T009: Write message formatting tests
  - @req FR:ai-provider-ollama/ollama.execute
  - Test systemPrompt maps to system message
  - Test prompt maps to user message
  - Test message array format is correct
  - Verify SDK receives properly formatted messages

- [x] T010: Write model selection tests
  - @req FR:ai-provider-ollama/ollama.models
  - Test model from request is used when provided
  - Test default model used when not specified
  - Test model name appears in response
  - Mock different model scenarios

- [x] T011: Write maxTokens handling tests
  - @req FR:ai-provider-ollama/ollama.execute
  - Test maxTokens passed to SDK when provided
  - Test execution works without maxTokens
  - Verify SDK parameter mapping

### Token Usage Tests

- [x] T012: Write token extraction tests
  - @req FR:ai-provider-ollama/ollama.usage.tokens
  - Test inputTokens extracted from prompt_eval_count
  - Test outputTokens extracted from eval_count
  - Test totalTokens is sum of input and output
  - Mock responses with token counts

- [x] T013: Write missing token count tests
  - @req FR:ai-provider-ollama/ollama.usage.tokens
  - Test handles missing prompt_eval_count gracefully
  - Test handles missing eval_count gracefully
  - Test defaults to 0 when counts unavailable
  - Mock responses without token metadata

### Timeout and Cancellation Tests

- [x] T014: Write inactivity timeout tests
  - @req FR:ai-provider-ollama/ollama.execute
  - Test request respects inactivityTimeout parameter
  - Test timeout cancels long-running requests
  - Mock delayed responses

- [x] T015: Write abort signal tests
  - @req FR:ai-provider-ollama/ollama.execute
  - Test abortSignal cancels in-progress requests
  - Test cleanup happens on abort
  - Test AbortError propagates correctly
  - Mock cancellable SDK calls

### Error Handling Tests

- [x] T016: Write server error tests
  - @req FR:ai-provider-ollama/ollama.errors.server
  - Test connection refused throws AIProviderUnavailable
  - Test error message mentions Ollama server
  - Test error includes guidance about starting server
  - Test error mentions OLLAMA_HOST configuration
  - Mock network errors

- [x] T017: Write model error tests
  - @req FR:ai-provider-ollama/ollama.errors.model
  - Test model not found error is descriptive
  - Test error includes model name
  - Test error suggests 'ollama pull' command
  - Mock 404 model errors

- [x] T018: Write general error tests
  - @req FR:ai-provider-ollama/ollama.errors
  - Test SDK errors are wrapped properly
  - Test error details are preserved
  - Test unknown errors are handled gracefully
  - Mock various SDK error scenarios

## Step 3: Implementation

### Core Provider Implementation

- [x] T019: Implement provider class structure
  - @req FR:ai-provider-ollama/ollama.interface
  - Create src/ai/providers/ollama-provider.ts
  - Define OllamaProvider class implementing AIProvider
  - Set name property to 'ollama'
  - Set capabilities to ['headless']
  - Add SDK client initialization

- [x] T020: Implement server configuration
  - @req FR:ai-provider-ollama/ollama.server.url
  - Read OLLAMA_HOST environment variable
  - Default to http://localhost:11434
  - Initialize SDK client with configured host
  - Store configuration for debugging

- [x] T021: Implement isAvailable() method
  - @req FR:ai-provider-ollama/ollama.server.available
  - @req NFR:ai-provider-ollama/ollama.performance.server-check
  - Call SDK lightweight API (list or similar)
  - Catch and handle connection errors
  - Return boolean without throwing
  - Ensure < 100ms execution time

- [x] T022: Implement signIn() method
  - @req FR:ai-provider-ollama/ollama.server.signin
  - Call isAvailable() to check server
  - Throw AIProviderUnavailable if server not reachable
  - Include helpful error message and guidance
  - Return successfully if server is up

### Execute Method Implementation

- [x] T023: Implement message formatting
  - @req FR:ai-provider-ollama/ollama.execute
  - Convert systemPrompt to system message
  - Convert prompt to user message
  - Build message array for SDK
  - Handle empty or missing prompts

- [x] T024: Implement model selection
  - @req FR:ai-provider-ollama/ollama.models
  - Extract model from AIProviderRequest
  - Pass to SDK chat API
  - Allow SDK to use default if not specified
  - Include model name in response

- [x] T025: Implement SDK execution
  - @req FR:ai-provider-ollama/ollama.execute
  - Call SDK chat API with formatted messages
  - Pass maxTokens if provided
  - Extract content from SDK response
  - Build AIProviderResponse structure

- [x] T026: Implement token usage extraction
  - @req FR:ai-provider-ollama/ollama.usage.tokens
  - Extract prompt_eval_count as inputTokens
  - Extract eval_count as outputTokens
  - Calculate totalTokens as sum
  - Handle missing token counts (default to 0)
  - Add to response usage field

- [x] T027: Implement timeout handling
  - @req FR:ai-provider-ollama/ollama.execute
  - Apply inactivityTimeout to SDK call
  - Cancel request if timeout exceeded
  - Clean up resources on timeout
  - Throw appropriate timeout error

- [x] T028: Implement abort signal support
  - @req FR:ai-provider-ollama/ollama.execute
  - Pass abortSignal to SDK if supported
  - Implement manual cancellation if needed
  - Clean up on abort
  - Propagate abort error

### Error Handling Implementation

- [x] T029: Implement server error handling
  - @req FR:ai-provider-ollama/ollama.errors.server
  - Catch SDK connection errors
  - Throw AIProviderUnavailable with clear message
  - Include server URL in error
  - Add guidance about starting Ollama
  - Mention OLLAMA_HOST configuration option

- [x] T030: Implement model error handling
  - @req FR:ai-provider-ollama/ollama.errors.model
  - Catch model not found errors
  - Include requested model name in error
  - Suggest 'ollama pull {model}' command
  - Use appropriate CatalystError type

- [x] T031: Implement general error handling
  - @req FR:ai-provider-ollama/ollama.errors
  - Wrap all SDK errors in CatalystError
  - Preserve original error details
  - Add context to error messages
  - Log errors for debugging
  - Ensure errors don't leak sensitive info

## Step 4: Integration and Validation

- [x] T032: Register provider in catalog
  - @req FR:ai-provider-ollama/ollama.interface
  - Verify provider is auto-discovered by registry
  - Run provider catalog generation script
  - Confirm OllamaProvider appears in catalog
  - Test factory can instantiate provider

- [x] T033: Write integration tests
  - @req FR:ai-provider-ollama/ollama.execute
  - @req FR:ai-provider-ollama/ollama.models
  - @req FR:ai-provider-ollama/ollama.usage.tokens
  - Test with real local Ollama server (optional)
  - Test multiple models if available
  - Test full request/response cycle
  - Verify token counts with real responses
  - Document any model-specific behaviors

- [x] T034: Verify performance requirements
  - @req NFR:ai-provider-ollama/ollama.performance.instantiation
  - @req NFR:ai-provider-ollama/ollama.performance.server-check
  - Measure instantiation time (< 10ms target)
  - Measure isAvailable() time (< 100ms target)
  - Profile execute() for optimization opportunities
  - Document performance characteristics

- [x] T035: Run full test suite
  - @req FR:ai-provider-ollama/ollama.interface
  - @req FR:ai-provider-ollama/ollama.execute
  - @req FR:ai-provider-ollama/ollama.errors
  - Execute all unit tests
  - Verify 100% functional requirement coverage
  - Check all error scenarios tested
  - Ensure no regressions in existing provider tests
  - Verify build succeeds with new provider

- [ ] T036: Update documentation
  - @req FR:ai-provider-ollama/ollama.server.url
  - @req FR:ai-provider-ollama/ollama.models
  - Add usage examples to spec.md if needed
  - Document OLLAMA_HOST configuration
  - List tested models
  - Document known limitations
  - Add troubleshooting guidance

## Dependencies

**Task Dependencies:**

- T001 (dependencies) must complete before T003-T018 (tests)
- T003-T018 (all tests) must complete before T019-T031 (implementation)
- T019 (class structure) must complete before T020-T031
- T020 (configuration) must complete before T021-T022
- T021-T022 (server methods) can run in parallel
- T023-T026 (execute core) must run sequentially
- T027-T028 (timeout/abort) depend on T025
- T029-T031 (error handling) can run in parallel after core implementation
- T032 (catalog) depends on T019-T031 (all implementation)
- T033-T036 (validation) depend on T032 (catalog registration)
- T035 (test suite) runs after T033-T034
- T036 (docs) runs last after all validation passes

**External Dependencies:**

- ollama npm package (installed in T002)
- Ollama server (optional for integration tests in T033)
- ai-provider feature (provides interface and factory)
