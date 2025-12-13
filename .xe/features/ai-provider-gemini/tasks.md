---
id: ai-provider-gemini
title: AI Provider - Gemini Tasks
author: "@flanakin"
description: "Implementation tasks for Google Gemini AI provider"
---

# Tasks: AI Provider - Gemini

**Input**: Design documents from `.xe/features/ai-provider-gemini/`
**Prerequisites**: spec.md (required), plan.md (required)

## Step 1: Setup

- [ ] T001: Create feature documentation structure
  - @req FR:gemini
  - Verify `.xe/features/ai-provider-gemini/` directory exists
  - Verify `spec.md` exists and is complete
  - Verify `plan.md` exists and is complete
  - Create `tasks.md` (this file)

- [ ] T002: Install @google/genai SDK
  - @req FR:gemini.sdk
  - Run `npm install @google/genai`
  - Verify package.json includes dependency
  - Document SDK version used

## Step 2: Unit Tests (TDD Phase)

- [ ] T003: Create test file structure
  - Create `tests/ai/providers/gemini-provider.test.ts`
  - Import necessary types and test utilities
  - Set up describe blocks for test organization

- [ ] T004: Write provider interface conformance tests
  - @req FR:gemini.interface
  - Test `name` property equals `'gemini'`
  - Test `capabilities` includes `'headless'`
  - Test constructor completes without errors

- [ ] T005: Write isAvailable() tests
  - @req FR:gemini.auth.available
  - @req NFR:gemini.performance.auth-check
  - Test returns true when GOOGLE_API_KEY is set
  - Test returns true when GEMINI_API_KEY is set
  - Test returns false when neither environment variable is set
  - Test GOOGLE_API_KEY takes precedence over GEMINI_API_KEY
  - Test performance requirement (<5ms)

- [ ] T006: Write signIn() tests
  - @req FR:gemini.auth.signin
  - @req FR:gemini.errors.auth
  - Test throws AIProviderUnavailable error
  - Test error message includes guidance on obtaining API key
  - Test error message references GOOGLE_API_KEY and GEMINI_API_KEY
  - Test error message includes link to Google AI Studio

- [ ] T007: Write execute() basic functionality tests
  - @req FR:gemini.execute
  - @req FR:gemini.interface
  - Test accepts AIProviderRequest and returns AIProviderResponse
  - Test response contains content string
  - Test response contains model string
  - Test handles minimal request (systemPrompt + prompt only)

- [ ] T008: Write message mapping tests
  - @req FR:gemini.execute
  - Test systemPrompt maps to Gemini system instruction format
  - Test prompt maps to user message content
  - Test both systemPrompt and prompt are passed to SDK
  - Test empty systemPrompt is handled correctly

- [ ] T009: Write model selection tests
  - @req FR:gemini.models
  - Test uses SDK default when model not specified
  - Test uses AIProviderRequest.model when provided
  - Test model name is included in response

- [ ] T010: Write maxTokens parameter tests
  - @req FR:gemini.execute
  - Test maxTokens is passed to SDK as maxOutputTokens
  - Test undefined maxTokens uses SDK default
  - Test explicit maxTokens value is respected

- [ ] T011: Write token usage extraction tests
  - @req FR:gemini.usage.tokens
  - Test inputTokens extracted from SDK response
  - Test outputTokens extracted from SDK response
  - Test totalTokens calculated as sum of input and output
  - Test usage is undefined when metadata unavailable
  - Test usage object structure matches AIUsageStats

- [ ] T012: Write authentication error handling tests
  - @req FR:gemini.errors.auth
  - Test missing API key throws AIProviderUnavailable
  - Test invalid API key throws AIProviderUnavailable
  - Test error message includes configuration guidance
  - Test error message references both environment variable options

- [ ] T013: Write rate limit error handling tests
  - @req FR:gemini.errors.rate-limit
  - Test rate limit errors throw descriptive CatalystError
  - Test error message includes retry guidance
  - Test error preserves original error details

- [ ] T014: Write invalid model error handling tests
  - @req FR:gemini.errors.model
  - Test invalid model name throws descriptive CatalystError
  - Test error message suggests valid alternatives
  - Test error message references documentation

- [ ] T015: Write AbortSignal cancellation tests
  - @req FR:gemini.execute
  - Test execute() respects abortSignal parameter
  - Test aborted request throws appropriate error
  - Test aborted request cleans up resources

- [ ] T016: Write inactivity timeout tests
  - @req FR:gemini.execute
  - Test execute() implements inactivityTimeout parameter
  - Test request aborted after timeout period
  - Test timeout error is descriptive
  - Test timeout cleanup prevents resource leaks

- [ ] T017: Write instantiation performance tests
  - @req NFR:gemini.performance.instantiation
  - Test provider instantiation completes in <10ms
  - Test constructor has no side effects
  - Test constructor makes no API calls

## Step 3: Implementation

- [ ] T018: Create GeminiProvider class structure
  - @req FR:gemini.interface
  - Create `src/ai/providers/gemini-provider.ts`
  - Define GeminiProvider class implementing AIProvider
  - Add name property as `'gemini'`
  - Add capabilities property with `['headless']`
  - Add JSDoc comments with @req tags

- [ ] T019: Implement constructor
  - @req FR:gemini.interface
  - @req NFR:gemini.performance.instantiation
  - Create lightweight constructor (no SDK init)
  - No environment variable validation
  - No API calls or I/O operations

- [ ] T020: Implement isAvailable() method
  - @req FR:gemini.auth.available
  - @req NFR:gemini.performance.auth-check
  - Check GOOGLE_API_KEY environment variable first
  - Check GEMINI_API_KEY environment variable as fallback
  - Return true if either is set
  - Complete in <5ms (simple boolean check)

- [ ] T021: Implement signIn() method
  - @req FR:gemini.auth.signin
  - @req FR:gemini.errors.auth
  - Throw AIProviderUnavailable error
  - Include guidance on obtaining API key from Google AI Studio
  - Reference GOOGLE_API_KEY and GEMINI_API_KEY environment variables
  - Include documentation links

- [ ] T022: Implement execute() SDK initialization
  - @req FR:gemini.sdk
  - @req FR:gemini.auth.api-key
  - Initialize @google/genai SDK client
  - Retrieve API key from environment (GOOGLE_API_KEY > GEMINI_API_KEY)
  - Handle missing API key with AIProviderUnavailable error
  - Create model instance with appropriate configuration

- [ ] T023: Implement message mapping
  - @req FR:gemini.execute
  - Map AIProviderRequest.systemPrompt to system instruction
  - Map AIProviderRequest.prompt to user message content
  - Format messages according to SDK requirements
  - Handle empty or undefined systemPrompt gracefully

- [ ] T024: Implement model selection
  - @req FR:gemini.models
  - Use AIProviderRequest.model if provided
  - Otherwise use SDK default model (no hardcoded fallback)
  - Pass model name to SDK client

- [ ] T025: Implement parameter mapping
  - @req FR:gemini.execute
  - Map maxTokens to SDK's maxOutputTokens parameter
  - Handle undefined maxTokens (use SDK default)
  - Pass configuration to SDK request

- [ ] T026: Implement response parsing
  - @req FR:gemini.execute
  - Extract content from SDK response
  - Extract model name from SDK response
  - Build AIProviderResponse object
  - Handle missing or malformed responses

- [ ] T027: Implement token usage extraction
  - @req FR:gemini.usage.tokens
  - Extract usageMetadata from SDK response
  - Map promptTokenCount to inputTokens
  - Map candidatesTokenCount to outputTokens
  - Calculate totalTokens as sum
  - Handle missing usage metadata (return undefined)

- [ ] T028: Implement authentication error handling
  - @req FR:gemini.errors.auth
  - Catch SDK authentication errors
  - Wrap in AIProviderUnavailable error
  - Include configuration guidance
  - Reference environment variable options

- [ ] T029: Implement rate limit error handling
  - @req FR:gemini.errors.rate-limit
  - Catch SDK rate limit errors
  - Wrap in descriptive CatalystError
  - Include retry guidance and quota information
  - Preserve original error details

- [ ] T030: Implement invalid model error handling
  - @req FR:gemini.errors.model
  - Catch SDK invalid model errors
  - Wrap in descriptive CatalystError
  - Suggest valid model names
  - Reference documentation

- [ ] T031: Implement AbortSignal support
  - @req FR:gemini.execute
  - Pass abortSignal to SDK request
  - Handle cancellation gracefully
  - Clean up resources on abort
  - Throw descriptive error on cancellation

- [ ] T032: Implement inactivity timeout
  - @req FR:gemini.execute
  - Wrap SDK call with timeout logic
  - Abort request after inactivityTimeout period
  - Throw descriptive timeout error
  - Clean up resources on timeout

- [ ] T033: Add comprehensive JSDoc comments
  - Document class purpose and usage
  - Document each method with @param and @returns
  - Add @req tags referencing spec requirements
  - Include usage examples
  - Document error conditions

## Step 4: Integration and Registry

- [ ] T034: Verify provider registry auto-discovery
  - @req FR:gemini.interface
  - Run provider registry generation script
  - Verify GeminiProvider is discovered
  - Verify provider-catalog.ts includes gemini
  - Test factory can instantiate GeminiProvider

- [ ] T035: Create integration test file
  - Create `tests/ai/providers/gemini-provider.integration.test.ts`
  - Mark tests as requiring GOOGLE_API_KEY or GEMINI_API_KEY
  - Set up test fixtures and helpers

- [ ] T036: Write integration test for successful request
  - @req FR:gemini.execute
  - @req FR:gemini.usage.tokens
  - Test real API call with valid credentials
  - Verify response contains expected content
  - Verify token usage is populated
  - Verify usage values are reasonable

- [ ] T037: Write integration test for model selection
  - @req FR:gemini.models
  - Test with explicit model parameter
  - Test with SDK default model
  - Verify correct model used in response

- [ ] T038: Write integration test for error scenarios
  - @req FR:gemini.errors
  - Test with invalid API key
  - Test with invalid model name
  - Verify error messages are descriptive

## Step 5: Validation and Documentation

- [ ] T039: Run all unit tests
  - Execute `npm test -- gemini-provider.test.ts`
  - Verify all tests pass
  - Review test coverage (aim for 100%)
  - Fix any failing tests

- [ ] T040: Run all integration tests (with API key)
  - Set GOOGLE_API_KEY or GEMINI_API_KEY environment variable
  - Execute integration tests
  - Verify real API interactions work
  - Document any API quirks discovered

- [ ] T041: Verify performance requirements
  - @req NFR:gemini.performance.instantiation
  - @req NFR:gemini.performance.auth-check
  - Measure provider instantiation time (<10ms)
  - Measure isAvailable() execution time (<5ms)
  - Document performance results

- [ ] T042: Test with ai-prompt action
  - Create test playbook using gemini provider
  - Run playbook with ai-prompt action
  - Verify end-to-end integration works
  - Test with various prompt configurations

- [ ] T043: Run full test suite
  - Execute `npm test`
  - Verify no regressions in other tests
  - Verify provider registry tests pass
  - Fix any broken tests

- [ ] T044: Update provider documentation (if needed)
  - Document Gemini provider in README or docs
  - Include setup instructions (API key)
  - Include usage examples
  - Document supported models

## Dependencies

**Task Dependencies:**

- T001 (setup) must complete before all other tasks
- T002 (SDK install) must complete before T018-T033 (implementation)
- T003 (test structure) must complete before T004-T017 (unit tests)
- T004-T017 (unit tests) should complete before T018-T033 (implementation) for TDD
- T018 (class structure) must complete before T019-T033
- T022 (SDK init) must complete before T023-T027
- T023-T027 (core logic) must complete before T028-T032 (error handling)
- T033 (JSDoc) can run in parallel with T034-T038
- T034 (registry) must complete before T042 (playbook test)
- T035 (integration test structure) must complete before T036-T038
- T039 (unit tests pass) must complete before T040-T043
- T040-T042 can run in parallel
- T043 (full suite) must complete before T044 (docs)
- T044 (docs) runs last

**External Dependencies:**

- ai-provider feature must be implemented (already exists)
- @google/genai SDK must be available (installed in T002)
