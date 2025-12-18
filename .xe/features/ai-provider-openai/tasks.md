---
id: ai-provider-openai
title: AI Provider - OpenAI Tasks
author: "@flanakin"
description: "Implementation tasks for OpenAI provider"
---

# Tasks: AI Provider - OpenAI

**Input**: Design documents from `.xe/features/ai-provider-openai/`
**Prerequisites**: plan.md (required), spec.md (required)

## Step 1: Setup

- [x] T001: Install OpenAI SDK dependency
  - @req FR:ai-provider-openai/openai.sdk
  - Add `openai` package to package.json
  - Run `npm install`
  - Verify package installs successfully

## Step 2: Test Infrastructure (TDD)

- [x] T003: Create OpenAI provider test file
  - @req FR:ai-provider-openai/openai.interface
  - Create `tests/ai/providers/openai-provider.test.ts`
  - Import test utilities and types
  - Set up describe block structure

- [x] T004: Write provider instantiation tests
  - @req FR:ai-provider-openai/openai.interface
  - @req NFR:ai-provider-openai/openai.performance.instantiation
  - Test provider has correct name ('openai')
  - Test provider has correct capabilities (['headless'])
  - Test instantiation completes quickly (<10ms)

- [x] T005: Write isAvailable() tests
  - @req FR:ai-provider-openai/openai.auth.available
  - @req NFR:ai-provider-openai/openai.performance.auth-check
  - Test returns true when OPENAI_API_KEY is set
  - Test returns false when OPENAI_API_KEY is not set
  - Test completes quickly (<5ms)
  - Mock environment variables for isolation

- [x] T006: Write signIn() tests
  - @req FR:ai-provider-openai/openai.auth.signin
  - @req FR:ai-provider-openai/openai.errors.auth
  - Test throws AIProviderUnavailable
  - Test error includes guidance for obtaining API key
  - Test error message mentions OPENAI_API_KEY

- [x] T007: Write execute() message mapping tests
  - @req FR:ai-provider-openai/openai.execute
  - Mock OpenAI SDK client
  - Test systemPrompt maps to system message role
  - Test prompt maps to user message role
  - Test messages array has correct order (system, then user)
  - Verify SDK called with correct message structure

- [x] T008: Write execute() model selection tests
  - @req FR:ai-provider-openai/openai.models
  - Test uses request.model when provided
  - Test SDK receives model parameter correctly
  - Test handles undefined model (SDK default)

- [x] T009: Write execute() parameter mapping tests
  - @req FR:ai-provider-openai/openai.execute
  - Test maxTokens maps to SDK max_tokens
  - Test abortSignal maps to SDK signal option
  - Test inactivityTimeout enforced correctly
  - Test timeout cancels request if inactive too long

- [x] T010: Write execute() token usage tests
  - @req FR:ai-provider-openai/openai.usage.tokens
  - Mock SDK response with usage data
  - Test inputTokens extracted from prompt_tokens
  - Test outputTokens extracted from completion_tokens
  - Test totalTokens extracted from total_tokens
  - Test all three present in response.usage

- [x] T011: Write execute() response mapping tests
  - @req FR:ai-provider-openai/openai.execute
  - Test content extracted from SDK response
  - Test model name included in response
  - Test usage stats included in response
  - Test response structure matches AIProviderResponse

- [x] T012: Write authentication error tests
  - @req FR:ai-provider-openai/openai.errors.auth
  - Mock SDK to throw authentication error
  - Test throws AIProviderUnavailable
  - Test error message mentions API key
  - Test error includes setup guidance

- [x] T013: Write rate limit error tests
  - @req FR:ai-provider-openai/openai.errors.rate-limit
  - Mock SDK to throw rate limit error (429)
  - Test error includes retry guidance
  - Test extracts retry-after header if present
  - Test error message is actionable

- [x] T014: Write model error tests
  - @req FR:ai-provider-openai/openai.errors.model
  - Mock SDK to throw invalid model error
  - Test error message mentions invalid model
  - Test error is descriptive and actionable

- [x] T015: Write general error handling tests
  - @req FR:ai-provider-openai/openai.errors
  - Test network errors wrapped appropriately
  - Test timeout errors handled correctly
  - Test cancellation via abortSignal works
  - Test unexpected errors wrapped in CatalystError

## Step 3: Core Implementation

- [x] T016: Create OpenAI provider file
  - @req FR:ai-provider-openai/openai.interface
  - @req FR:ai-provider-openai/openai.sdk
  - Create `src/ai/providers/openai-provider.ts`
  - Import AIProvider interface and types
  - Import OpenAI SDK
  - Import error utilities

- [x] T017: Implement provider class structure
  - @req FR:ai-provider-openai/openai.interface
  - Define OpenAIProvider class implementing AIProvider
  - Set name property to 'openai'
  - Set capabilities to ['headless']
  - Add private fields for SDK client

- [x] T018: Implement isAvailable() method
  - @req FR:ai-provider-openai/openai.auth.available
  - @req NFR:ai-provider-openai/openai.performance.auth-check
  - Check OPENAI_API_KEY environment variable
  - Return true if present, false otherwise
  - Ensure completes in <5ms (simple check)

- [x] T019: Implement signIn() method
  - @req FR:ai-provider-openai/openai.auth.signin
  - @req FR:ai-provider-openai/openai.errors.auth
  - Throw AIProviderUnavailable error
  - Include message about API key requirement
  - Include guidance on obtaining key from OpenAI
  - Include instruction to set OPENAI_API_KEY

- [x] T020: Implement SDK client initialization
  - @req FR:ai-provider-openai/openai.sdk
  - @req FR:ai-provider-openai/openai.auth.api-key
  - Create private method to initialize OpenAI client
  - Read OPENAI_API_KEY from environment
  - Lazy-initialize on first execute() call
  - Cache client instance for reuse

- [x] T021: Implement execute() message mapping
  - @req FR:ai-provider-openai/openai.execute
  - Create messages array from request
  - Add system message from systemPrompt
  - Add user message from prompt
  - Ensure correct order (system first)

- [x] T022: Implement execute() model and parameter handling
  - @req FR:ai-provider-openai/openai.models
  - @req FR:ai-provider-openai/openai.execute
  - Extract model from request (if provided)
  - Map maxTokens to max_tokens
  - Map abortSignal to signal
  - Build SDK options object

- [x] T023: Implement execute() SDK call
  - @req FR:ai-provider-openai/openai.sdk
  - @req FR:ai-provider-openai/openai.execute
  - Call SDK chat completions API
  - Pass messages, model, and options
  - Await response
  - Extract completion content

- [x] T024: Implement execute() inactivity timeout
  - @req FR:ai-provider-openai/openai.execute
  - Wrap SDK call with timeout logic
  - Track time since last activity
  - Cancel if exceeds inactivityTimeout
  - Clean up timeout on completion

- [x] T025: Implement execute() token usage extraction
  - @req FR:ai-provider-openai/openai.usage.tokens
  - Extract usage object from SDK response
  - Map prompt_tokens to inputTokens
  - Map completion_tokens to outputTokens
  - Map total_tokens to totalTokens
  - Build AIUsageStats object

- [x] T026: Implement execute() response construction
  - @req FR:ai-provider-openai/openai.execute
  - Extract content from SDK response
  - Extract model from SDK response
  - Include usage stats
  - Return AIProviderResponse object

- [x] T027: Implement authentication error handling
  - @req FR:ai-provider-openai/openai.errors.auth
  - Catch SDK authentication errors
  - Throw AIProviderUnavailable
  - Include clear message about missing/invalid API key
  - Include setup instructions

- [x] T028: Implement rate limit error handling
  - @req FR:ai-provider-openai/openai.errors.rate-limit
  - Catch SDK rate limit errors (429)
  - Extract retry-after header if available
  - Include retry guidance in error message
  - Wrap in appropriate CatalystError

- [x] T029: Implement model error handling
  - @req FR:ai-provider-openai/openai.errors.model
  - Catch invalid model errors
  - Include model name in error message
  - Provide helpful guidance
  - Wrap in CatalystError

- [x] T030: Implement general error handling
  - @req FR:ai-provider-openai/openai.errors
  - Catch all other SDK errors
  - Wrap in CatalystError with context
  - Preserve original error message
  - Include provider name in error

- [x] T031: Add JSDoc documentation
  - @req FR:ai-provider-openai/openai.interface
  - Add class-level documentation
  - Document all public methods
  - Include @req tags for traceability
  - Add usage examples

## Step 4: Integration

- [x] T032: Export provider from index
  - @req FR:ai-provider-openai/openai.interface
  - Add OpenAIProvider to `src/ai/providers/index.ts`
  - Export provider class
  - Verify auto-discovery picks it up

- [x] T033: Verify provider catalog generation
  - @req FR:ai-provider-openai/openai.interface
  - Run provider registry generation
  - Verify openai-provider.ts discovered
  - Verify OpenAIProvider included in catalog
  - Check provider-catalog.ts contents

- [x] T034: Verify factory can create provider
  - @req FR:ai-provider-openai/openai.interface
  - Test createAIProvider('openai') works
  - Test provider appears in getAvailableAIProviders()
  - Verify integration with existing factory

## Step 5: Validation

- [x] T035: Run unit tests
  - @req FR:ai-provider-openai/openai.interface
  - Run `npm test` for OpenAI provider tests
  - Verify all new tests pass
  - Check test coverage is comprehensive
  - Fix any failing tests

- [x] T036: Run full test suite
  - @req FR:ai-provider-openai/openai.interface
  - Run complete test suite
  - Verify no regressions in existing tests
  - Ensure all 112+ tests still pass
  - Fix any broken tests

- [x] T037: Verify performance targets
  - @req NFR:ai-provider-openai/openai.performance.instantiation
  - @req NFR:ai-provider-openai/openai.performance.auth-check
  - Measure provider instantiation time (<10ms)
  - Measure isAvailable() execution time (<5ms)
  - Add performance regression tests if needed

- [ ] T038: Manual verification with real API key
  - @req FR:ai-provider-openai/openai.interface
  - @req FR:ai-provider-openai/openai.auth.api-key
  - Set OPENAI_API_KEY environment variable
  - Create simple test script
  - Execute real OpenAI API call
  - Verify response content is correct
  - Verify token usage is accurate
  - Test error scenarios (invalid key, etc.)

- [ ] T039: Update feature documentation
  - @req FR:ai-provider-openai/openai.interface
  - Update spec.md with any implementation notes
  - Mark requirements as implemented
  - Add usage examples if helpful
  - Document any caveats or limitations

## Dependencies

**Task Dependencies:**

- T001 (install SDK) must complete before T003-T015 (tests)
- T003 (test file) must complete before T004-T015 (individual tests)
- T004-T015 (tests) can run in parallel once T003 completes
- T016 (provider file) must complete before T017-T031 (implementation)
- T017 (class structure) must complete before T018-T031
- T018-T019 (simple methods) can be parallel
- T020 (SDK init) must complete before T021-T026
- T021-T026 (execute logic) have sequential dependencies
- T027-T030 (error handling) can be parallel after T026
- T031 (documentation) runs after implementation complete
- T032 (export) must complete before T033-T034
- T033-T034 (integration) can be parallel
- T035 (unit tests) must complete before T036 (full suite)
- T037 (performance) can run parallel with T036
- T038 (manual verify) runs after T036 passes
- T039 (docs update) runs last after validation

**External Dependencies:**

- `ai-provider` feature must be complete (types, factory, errors)
- `openai` npm package must be available
