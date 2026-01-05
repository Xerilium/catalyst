---
id: ai-provider-claude
title: AI Provider - Claude Tasks
author: "@flanakin"
description: "Implementation tasks for Claude AI provider"
---

<!-- markdownlint-disable single-title -->

# Tasks: AI Provider - Claude

**Input**: Design documents from `.xe/features/ai-provider-claude/`
**Prerequisites**: spec.md, plan.md (required)

## Step 1: Setup and Dependencies

- [x] T001: Install Claude Agent SDK dependency
  - @req FR:ai-provider-claude/claude.sdk
  - Add `@anthropic-ai/claude-agent-sdk` to package.json dependencies
  - Run `npm install` to install the SDK
  - Verify SDK installation with TypeScript imports

## Step 2: Write Tests (TDD Approach)

### Authentication Tests

- [x] T002: Write test for provider instantiation
  - @req FR:ai-provider-claude/claude.interface
  - @req NFR:ai-provider-claude/claude.performance.instantiation
  - Test provider name is 'claude'
  - Test capabilities include 'headless'
  - Verify instantiation completes in <10ms

- [x] T003: Write tests for isAvailable() with subscription
  - @req FR:ai-provider-claude/claude.auth.subscription
  - @req FR:ai-provider-claude/claude.auth.available
  - @req NFR:ai-provider-claude/claude.performance.auth-check
  - Test returns true when SDK reports active subscription
  - Test returns false when subscription is not available
  - Verify completes in <5ms

- [x] T004: Write tests for isAvailable() with API key fallback
  - @req FR:ai-provider-claude/claude.auth.api-key
  - @req FR:ai-provider-claude/claude.auth.available
  - Test returns true when ANTHROPIC_API_KEY is set
  - Test returns false when no auth available
  - Test subscription is checked before API key

- [x] T005: Write tests for signIn() method
  - @req FR:ai-provider-claude/claude.auth.signin
  - @req FR:ai-provider-claude/claude.errors.auth
  - Test successful interactive sign-in flow
  - Test throws AIProviderUnavailable on failure
  - Test completes authentication with SDK

### Message Mapping Tests

- [x] T006: Write tests for request message mapping
  - @req FR:ai-provider-claude/claude.execute
  - Test systemPrompt maps to SDK system message
  - Test prompt maps to SDK user message
  - Test maxTokens parameter is passed correctly
  - Test model parameter override
  - Test abortSignal integration

- [x] T007: Write tests for response message mapping
  - @req FR:ai-provider-claude/claude.execute
  - Test content extraction from SDK response
  - Test model identifier is preserved
  - Test metadata is stored correctly
  - Test multiple content blocks are combined

- [x] T008: Write tests for SDK default model usage
  - @req FR:ai-provider-claude/claude.models
  - Test uses SDK default when model not specified
  - Test does not hardcode model name
  - Test respects model override from request

### Token Usage Tests

- [x] T009: Write tests for token usage extraction
  - @req FR:ai-provider-claude/claude.usage.tokens
  - Test inputTokens extracted from SDK response
  - Test outputTokens extracted from SDK response
  - Test totalTokens calculated as sum
  - Test usage object structure matches AIUsageStats

### Error Handling Tests

- [x] T010: Write tests for authentication errors
  - @req FR:ai-provider-claude/claude.errors.auth
  - Test SDK auth errors throw AIProviderUnavailable
  - Test error message indicates authentication failure
  - Test guidance suggests running sign-in

- [x] T011: Write tests for rate limit errors
  - @req FR:ai-provider-claude/claude.errors.rate-limit
  - Test rate limit errors include retry guidance
  - Test wait time is extracted when available
  - Test error message is descriptive

- [x] T012: Write tests for invalid model errors
  - @req FR:ai-provider-claude/claude.errors.model
  - Test invalid model errors are descriptive
  - Test error message includes requested model name
  - Test error provides helpful guidance

### Cancellation and Timeout Tests

- [x] T013: Write tests for abort signal handling
  - @req FR:ai-provider-claude/claude.execute
  - Test request is cancelled when abortSignal is triggered
  - Test SDK cancellation mechanism is invoked
  - Test appropriate error is thrown on cancellation

- [x] T014: Write tests for inactivity timeout
  - @req FR:ai-provider-claude/claude.execute
  - Test request times out after inactivity period
  - Test timeout error message is clear
  - Test timeout value is passed to SDK correctly

## Step 3: Implement Provider

### Core Implementation

- [x] T015: Create ClaudeProvider class skeleton
  - @req FR:ai-provider-claude/claude.interface
  - @req FR:ai-provider-claude/claude.commands
  - Create `src/ai/providers/claude-provider.ts`
  - Implement AIProvider interface
  - Add name property: `'claude'`
  - Add displayName property: `'Claude'`
  - Add capabilities property: `['headless']`
  - Add commands property with Claude-specific configuration
  - Add skeleton methods: execute, isAvailable, signIn

- [x] T016: Implement SDK client initialization
  - @req FR:ai-provider-claude/claude.sdk
  - Add private SDK client field
  - Implement lazy initialization pattern
  - Cache client instance for reuse

### Authentication Implementation

- [x] T017: Implement isAvailable() method
  - @req FR:ai-provider-claude/claude.auth.subscription
  - @req FR:ai-provider-claude/claude.auth.api-key
  - @req FR:ai-provider-claude/claude.auth.available
  - Check subscription status via SDK
  - Fall back to ANTHROPIC_API_KEY check
  - Return combined availability result

- [x] T018: Implement signIn() method
  - @req FR:ai-provider-claude/claude.auth.signin
  - @req FR:ai-provider-claude/claude.errors.auth
  - Trigger SDK interactive authentication flow
  - Wait for authentication completion
  - Throw AIProviderUnavailable on failure

### Message Mapping Implementation

- [x] T019: Implement request message mapping helper
  - @req FR:ai-provider-claude/claude.execute
  - Create private method to map AIProviderRequest to SDK format
  - Map systemPrompt to SDK system parameter
  - Map prompt to SDK user message
  - Map maxTokens, model, abortSignal parameters

- [x] T020: Implement response message mapping helper
  - @req FR:ai-provider-claude/claude.execute
  - Create private method to map SDK response to AIProviderResponse
  - Extract content from SDK response
  - Map model identifier
  - Store metadata

### Token Usage Implementation

- [x] T021: Implement token usage extraction helper
  - @req FR:ai-provider-claude/claude.usage.tokens
  - Create private method to extract token usage
  - Extract inputTokens from SDK response
  - Extract outputTokens from SDK response
  - Calculate totalTokens as sum

### Execution Implementation

- [x] T022: Implement execute() method
  - @req FR:ai-provider-claude/claude.execute
  - @req FR:ai-provider-claude/claude.models
  - Map request to SDK format
  - Call SDK API with mapped request
  - Map response back to AIProviderResponse
  - Extract and include token usage

### Error Handling Implementation

- [x] T023: Implement error transformation helper
  - @req FR:ai-provider-claude/claude.errors.auth
  - @req FR:ai-provider-claude/claude.errors.rate-limit
  - @req FR:ai-provider-claude/claude.errors.model
  - Create private method to transform SDK errors
  - Map authentication errors to AIProviderUnavailable
  - Handle rate limit errors with retry guidance
  - Handle invalid model errors with descriptive messages

- [x] T024: Add error handling to execute() method
  - @req FR:ai-provider-claude/claude.errors
  - Wrap SDK calls with try-catch
  - Transform SDK errors using error helper
  - Preserve error context and guidance
  - Ensure all errors are properly typed

## Step 4: Integration and Validation

### Provider Registration

- [x] T025: Register ClaudeProvider in provider catalog
  - @req FR:ai-provider-claude/claude.interface
  - Export ClaudeProvider from providers/index.ts
  - Ensure provider is discovered by generate-provider-registry script
  - Verify provider appears in available providers list

### Integration Testing

- [x] T026: Test integration with ai-prompt action
  - @req FR:ai-provider-claude/claude.interface
  - @req FR:ai-provider-claude/claude.execute
  - @req FR:ai-provider-claude/claude.usage.tokens
  - Create test playbook using claude provider
  - Verify provider is created via factory
  - Test end-to-end execution with mock SDK
  - Verify token usage is tracked correctly

### Build and Test Validation

- [x] T027: Verify all unit tests pass
  - @req FR:ai-provider-claude/claude
  - Run `npm test` for provider tests
  - Ensure 100% code coverage for provider
  - Fix any failing tests

- [x] T028: Verify build succeeds
  - @req FR:ai-provider-claude/claude.interface
  - Run `npm run build`
  - Verify no TypeScript errors
  - Verify provider catalog includes claude

- [x] T029: Run full test suite
  - @req FR:ai-provider-claude/claude
  - Run `npm test` for entire project
  - Verify all existing tests still pass
  - Verify no regressions in other features

## Dependencies

**Task Dependencies:**

- T001 (SDK install) must complete before all test tasks
- T002-T014 (all test tasks) should complete before implementation
- T015 (skeleton) must complete before T016-T024
- T016 (SDK client) must complete before T017-T022
- T017-T018 (auth) can run in parallel
- T019-T020 (message mapping) can run in parallel
- T021 (token usage) depends on T020
- T022 (execute) depends on T016, T019, T020, T021
- T023 (error helper) can run in parallel with T022
- T024 (error handling) depends on T022, T023
- T025 (registration) depends on all implementation tasks
- T026 (integration tests) depends on T025
- T027-T029 (validation) must run after all implementation complete

**External Dependencies:**

- ai-provider feature must be implemented first
- @anthropic-ai/claude-agent-sdk must be available in npm registry
