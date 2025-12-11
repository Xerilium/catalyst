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

- [x] T001: Create feature documentation
  - Create `.xe/features/ai-provider-openai/` directory
  - Create `spec.md` with requirements
  - Create `plan.md` with implementation approach
  - Create `tasks.md` (this file)

- [ ] T002: Install OpenAI SDK dependency
  - @req FR:openai.sdk
  - Add `openai` package to package.json
  - Run `npm install`
  - Verify package installs successfully

## Step 2: Test Infrastructure (TDD)

- [ ] T003: Create OpenAI provider test file
  - @req FR:openai.interface
  - Create `tests/ai/providers/openai-provider.test.ts`
  - Import test utilities and types
  - Set up describe block structure

- [ ] T004: Write provider instantiation tests
  - @req FR:openai.interface
  - @req NFR:openai.performance.instantiation
  - Test provider has correct name ('openai')
  - Test provider has correct capabilities (['headless'])
  - Test instantiation completes quickly (<10ms)

- [ ] T005: Write isAvailable() tests
  - @req FR:openai.auth.available
  - @req NFR:openai.performance.auth-check
  - Test returns true when OPENAI_API_KEY is set
  - Test returns false when OPENAI_API_KEY is not set
  - Test completes quickly (<5ms)
  - Mock environment variables for isolation

- [ ] T006: Write signIn() tests
  - @req FR:openai.auth.signin
  - @req FR:openai.errors.auth
  - Test throws AIProviderUnavailable
  - Test error includes guidance for obtaining API key
  - Test error message mentions OPENAI_API_KEY

- [ ] T007: Write execute() message mapping tests
  - @req FR:openai.execute
  - Mock OpenAI SDK client
  - Test systemPrompt maps to system message role
  - Test prompt maps to user message role
  - Test messages array has correct order (system, then user)
  - Verify SDK called with correct message structure

- [ ] T008: Write execute() model selection tests
  - @req FR:openai.models
  - Test uses request.model when provided
  - Test SDK receives model parameter correctly
  - Test handles undefined model (SDK default)

- [ ] T009: Write execute() parameter mapping tests
  - @req FR:openai.execute
  - Test maxTokens maps to SDK max_tokens
  - Test abortSignal maps to SDK signal option
  - Test inactivityTimeout enforced correctly
  - Test timeout cancels request if inactive too long

- [ ] T010: Write execute() token usage tests
  - @req FR:openai.usage.tokens
  - Mock SDK response with usage data
  - Test inputTokens extracted from prompt_tokens
  - Test outputTokens extracted from completion_tokens
  - Test totalTokens extracted from total_tokens
  - Test all three present in response.usage

- [ ] T011: Write execute() response mapping tests
  - @req FR:openai.execute
  - Test content extracted from SDK response
  - Test model name included in response
  - Test usage stats included in response
  - Test response structure matches AIProviderResponse

- [ ] T012: Write authentication error tests
  - @req FR:openai.errors.auth
  - Mock SDK to throw authentication error
  - Test throws AIProviderUnavailable
  - Test error message mentions API key
  - Test error includes setup guidance

- [ ] T013: Write rate limit error tests
  - @req FR:openai.errors.rate-limit
  - Mock SDK to throw rate limit error (429)
  - Test error includes retry guidance
  - Test extracts retry-after header if present
  - Test error message is actionable

- [ ] T014: Write model error tests
  - @req FR:openai.errors.model
  - Mock SDK to throw invalid model error
  - Test error message mentions invalid model
  - Test error is descriptive and actionable

- [ ] T015: Write general error handling tests
  - Test network errors wrapped appropriately
  - Test timeout errors handled correctly
  - Test cancellation via abortSignal works
  - Test unexpected errors wrapped in CatalystError

## Step 3: Core Implementation

- [ ] T016: Create OpenAI provider file
  - @req FR:openai.interface
  - Create `src/playbooks/scripts/ai/providers/openai-provider.ts`
  - Import AIProvider interface and types
  - Import OpenAI SDK
  - Import error utilities

- [ ] T017: Implement provider class structure
  - @req FR:openai.interface
  - Define OpenAIProvider class implementing AIProvider
  - Set name property to 'openai'
  - Set capabilities to ['headless']
  - Add private fields for SDK client

- [ ] T018: Implement isAvailable() method
  - @req FR:openai.auth.available
  - Check OPENAI_API_KEY environment variable
  - Return true if present, false otherwise
  - Ensure completes in <5ms (simple check)

- [ ] T019: Implement signIn() method
  - @req FR:openai.auth.signin
  - @req FR:openai.errors.auth
  - Throw AIProviderUnavailable error
  - Include message about API key requirement
  - Include guidance on obtaining key from OpenAI
  - Include instruction to set OPENAI_API_KEY

- [ ] T020: Implement SDK client initialization
  - @req FR:openai.sdk
  - @req FR:openai.auth.api-key
  - Create private method to initialize OpenAI client
  - Read OPENAI_API_KEY from environment
  - Lazy-initialize on first execute() call
  - Cache client instance for reuse

- [ ] T021: Implement execute() message mapping
  - @req FR:openai.execute
  - Create messages array from request
  - Add system message from systemPrompt
  - Add user message from prompt
  - Ensure correct order (system first)

- [ ] T022: Implement execute() model and parameter handling
  - @req FR:openai.models
  - @req FR:openai.execute
  - Extract model from request (if provided)
  - Map maxTokens to max_tokens
  - Map abortSignal to signal
  - Build SDK options object

- [ ] T023: Implement execute() SDK call
  - @req FR:openai.sdk
  - Call SDK chat completions API
  - Pass messages, model, and options
  - Await response
  - Extract completion content

- [ ] T024: Implement execute() inactivity timeout
  - @req FR:openai.execute
  - Wrap SDK call with timeout logic
  - Track time since last activity
  - Cancel if exceeds inactivityTimeout
  - Clean up timeout on completion

- [ ] T025: Implement execute() token usage extraction
  - @req FR:openai.usage.tokens
  - Extract usage object from SDK response
  - Map prompt_tokens to inputTokens
  - Map completion_tokens to outputTokens
  - Map total_tokens to totalTokens
  - Build AIUsageStats object

- [ ] T026: Implement execute() response construction
  - @req FR:openai.execute
  - Extract content from SDK response
  - Extract model from SDK response
  - Include usage stats
  - Return AIProviderResponse object

- [ ] T027: Implement authentication error handling
  - @req FR:openai.errors.auth
  - Catch SDK authentication errors
  - Throw AIProviderUnavailable
  - Include clear message about missing/invalid API key
  - Include setup instructions

- [ ] T028: Implement rate limit error handling
  - @req FR:openai.errors.rate-limit
  - Catch SDK rate limit errors (429)
  - Extract retry-after header if available
  - Include retry guidance in error message
  - Wrap in appropriate CatalystError

- [ ] T029: Implement model error handling
  - @req FR:openai.errors.model
  - Catch invalid model errors
  - Include model name in error message
  - Provide helpful guidance
  - Wrap in CatalystError

- [ ] T030: Implement general error handling
  - Catch all other SDK errors
  - Wrap in CatalystError with context
  - Preserve original error message
  - Include provider name in error

- [ ] T031: Add JSDoc documentation
  - Add class-level documentation
  - Document all public methods
  - Include @req tags for traceability
  - Add usage examples

## Step 4: Integration

- [ ] T032: Export provider from index
  - Add OpenAIProvider to `src/playbooks/scripts/ai/providers/index.ts`
  - Export provider class
  - Verify auto-discovery picks it up

- [ ] T033: Verify provider catalog generation
  - @req FR:openai.interface
  - Run provider registry generation
  - Verify openai-provider.ts discovered
  - Verify OpenAIProvider included in catalog
  - Check provider-catalog.ts contents

- [ ] T034: Verify factory can create provider
  - Test createAIProvider('openai') works
  - Test provider appears in getAvailableAIProviders()
  - Verify integration with existing factory

## Step 5: Validation

- [ ] T035: Run unit tests
  - Run `npm test` for OpenAI provider tests
  - Verify all new tests pass
  - Check test coverage is comprehensive
  - Fix any failing tests

- [ ] T036: Run full test suite
  - Run complete test suite
  - Verify no regressions in existing tests
  - Ensure all 112+ tests still pass
  - Fix any broken tests

- [ ] T037: Verify performance targets
  - @req NFR:openai.performance.instantiation
  - @req NFR:openai.performance.auth-check
  - Measure provider instantiation time (<10ms)
  - Measure isAvailable() execution time (<5ms)
  - Add performance regression tests if needed

- [ ] T038: Manual verification with real API key
  - Set OPENAI_API_KEY environment variable
  - Create simple test script
  - Execute real OpenAI API call
  - Verify response content is correct
  - Verify token usage is accurate
  - Test error scenarios (invalid key, etc.)

- [ ] T039: Update feature documentation
  - Update spec.md with any implementation notes
  - Mark requirements as implemented
  - Add usage examples if helpful
  - Document any caveats or limitations

## Dependencies

**Task Dependencies:**

- T001 (setup docs) must complete before all other tasks
- T002 (install SDK) must complete before T003-T015 (tests)
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
