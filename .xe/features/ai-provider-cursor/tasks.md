---
id: ai-provider-cursor
title: AI Provider - Cursor - Tasks
author: "@flanakin"
description: "Implementation tasks for Cursor AI provider"
---

# Tasks: AI Provider - Cursor

**Input**: Design documents from `.xe/features/ai-provider-cursor/`
**Prerequisites**: plan.md (required), spec.md

## Step 1: Test Setup

- [ ] T001: Create test file structure
  - @req FR:cursor.interface
  - Create `tests/ai/providers/cursor-provider.test.ts`
  - Import test utilities (describe, it, expect, beforeEach, afterEach)
  - Import mocking utilities for child_process

- [ ] T002: Setup child_process mocks
  - @req FR:cursor.cli
  - Create mock utilities for spawn/exec
  - Setup mock stdout/stderr streams
  - Create helper for simulating CLI responses

## Step 2: Core Provider Tests (Write First)

- [ ] T003: Write provider instantiation tests
  - @req FR:cursor.interface
  - @req NFR:cursor.performance.instantiation
  - Test provider name is 'cursor'
  - Test capabilities array is empty (interactive-only)
  - Test instantiation completes in <10ms

- [ ] T004: Write basic execute() tests
  - @req FR:cursor.execute
  - @req FR:cursor.cli
  - Test execute() accepts AIProviderRequest
  - Test execute() returns AIProviderResponse
  - Test prompt construction from system + user prompts
  - Test CLI invocation with correct arguments
  - Test stdout parsing into response content

- [ ] T005: Write model handling tests
  - @req FR:cursor.models
  - Test model parameter is accepted
  - Test response includes model identifier
  - Test default model when not specified

- [ ] T006: Write usage tracking tests
  - @req FR:cursor.usage.tokens
  - Test usage field present when CLI provides data
  - Test usage field undefined when CLI doesn't provide data
  - Test token count parsing from CLI output (if available)

## Step 3: Authentication Tests (Write First)

- [ ] T007: Write isAvailable() tests
  - @req FR:cursor.auth.available
  - @req NFR:cursor.performance.auth-check
  - Test returns true when CLI exists and user authenticated
  - Test returns false when CLI missing
  - Test returns false when user not authenticated
  - Test returns false when no Cursor subscription
  - Test completes in <500ms

- [ ] T008: Write signIn() tests
  - @req FR:cursor.auth.signin
  - @req FR:cursor.auth.cursor
  - Test provides guidance for Cursor IDE authentication
  - Test throws AIProviderUnavailable on failure
  - Test handles CLI missing scenario

## Step 4: Error Handling Tests (Write First)

- [ ] T009: Write CLI missing error tests
  - @req FR:cursor.errors.cli-missing
  - Test ENOENT error throws AIProviderUnavailable
  - Test error message includes CLI installation guidance
  - Test error indicates Cursor CLI not found

- [ ] T010: Write authentication error tests
  - @req FR:cursor.errors.auth
  - Test auth error throws AIProviderUnavailable
  - Test error message includes sign-in guidance
  - Test error indicates authentication required

- [ ] T011: Write no access error tests
  - @req FR:cursor.errors.no-access
  - Test subscription error throws AIProviderUnavailable
  - Test error message includes subscription guidance
  - Test error indicates Cursor subscription required

- [ ] T012: Write timeout error tests
  - @req FR:cursor.execute
  - Test inactivityTimeout parameter respected
  - Test process killed when timeout expires
  - Test timeout error thrown with appropriate message

- [ ] T013: Write cancellation tests
  - @req FR:cursor.execute
  - Test abortSignal cancellation terminates process
  - Test cancellation throws appropriate error
  - Test process cleanup after cancellation

## Step 5: Core Provider Implementation

- [ ] T014: Create cursor-provider.ts file
  - @req FR:cursor.interface
  - Create `src/ai/providers/cursor-provider.ts`
  - Import AIProvider interface and types
  - Import error factories
  - Add file header comment with @req tag

- [ ] T015: Implement provider class structure
  - @req FR:cursor.interface
  - Define CursorProvider class implementing AIProvider
  - Set name property to 'cursor'
  - Set capabilities to empty array
  - Add constructor (minimal initialization)

- [ ] T016: Implement basic execute() method
  - @req FR:cursor.execute
  - @req FR:cursor.cli
  - Construct prompt from systemPrompt + prompt
  - Invoke cursor CLI using child_process
  - Capture stdout/stderr
  - Parse output into AIProviderResponse
  - Return response with content and model

- [ ] T017: Implement model handling
  - @req FR:cursor.models
  - Accept model parameter from request
  - Pass to CLI if supported (or document limitation)
  - Set response model to 'cursor' or actual model

- [ ] T018: Implement usage tracking
  - @req FR:cursor.usage.tokens
  - Parse token counts from CLI output if available
  - Return undefined usage if CLI doesn't provide data
  - Add comment documenting limitation

## Step 6: Authentication Implementation

- [ ] T019: Implement CLI availability check
  - @req FR:cursor.auth.available
  - @req FR:cursor.cli
  - Check if cursor command exists in PATH
  - Use which/where command or attempt spawn
  - Cache result for performance

- [ ] T020: Implement authentication verification
  - @req FR:cursor.auth.cursor
  - @req FR:cursor.auth.available
  - Verify user authenticated with Cursor
  - Check CLI auth status (command or config file)
  - Handle subscription validation

- [ ] T021: Implement isAvailable() method
  - @req FR:cursor.auth.available
  - @req NFR:cursor.performance.auth-check
  - Combine CLI check and auth verification
  - Return true only if both pass
  - Optimize for <500ms performance

- [ ] T022: Implement signIn() method
  - @req FR:cursor.auth.signin
  - Provide clear guidance for Cursor IDE authentication
  - Log instructions to console
  - Throw AIProviderUnavailable if sign-in not possible

## Step 7: Error Handling Implementation

- [ ] T023: Implement CLI missing error handling
  - @req FR:cursor.errors.cli-missing
  - Catch ENOENT from spawn/exec
  - Throw AIProviderUnavailable with guidance
  - Include installation instructions

- [ ] T024: Implement authentication error handling
  - @req FR:cursor.errors.auth
  - Parse CLI auth error patterns
  - Throw AIProviderUnavailable with sign-in guidance
  - Distinguish from other errors

- [ ] T025: Implement no access error handling
  - @req FR:cursor.errors.no-access
  - Parse CLI subscription error patterns
  - Throw AIProviderUnavailable with subscription guidance
  - Include link to Cursor website

- [ ] T026: Implement timeout handling
  - @req FR:cursor.execute
  - Setup inactivity timer based on request parameter
  - Kill child process when timeout expires
  - Throw timeout error with clear message
  - Clean up process resources

- [ ] T027: Implement cancellation handling
  - @req FR:cursor.execute
  - Monitor abortSignal from request
  - Kill process when signal fires
  - Throw cancellation error
  - Clean up process resources

## Step 8: Integration and Polish

- [ ] T028: Add provider to exports
  - Update `src/ai/providers/index.ts`
  - Export CursorProvider class
  - Ensure type exports included

- [ ] T029: Update provider catalog generation
  - Verify `scripts/generate-provider-registry.ts` detects cursor-provider.ts
  - Run catalog generation script
  - Verify cursor appears in provider-catalog.ts

- [ ] T030: Add provider documentation
  - Add JSDoc comments to all public methods
  - Document CLI requirements
  - Document authentication flow
  - Document known limitations (token tracking, CLI interface)
  - Add usage example in class comment

- [ ] T031: Document open questions in code
  - Add TODO comments for CLI interface unknowns
  - Document assumptions about CLI behavior
  - Note areas requiring updates when CLI documented
  - Add inline comments for complex logic

## Step 9: Validation

- [ ] T032: Run all tests
  - Execute `npm test -- cursor-provider`
  - Verify 100% test coverage
  - Fix any failing tests
  - Ensure performance requirements met

- [ ] T033: Test error scenarios comprehensively
  - Test with cursor CLI missing
  - Test with authentication failures
  - Test timeout behavior
  - Test cancellation handling
  - Verify error messages are helpful

- [ ] T034: Run full test suite
  - Execute `npm test`
  - Verify no regressions in other tests
  - Ensure provider registry includes cursor
  - Verify build succeeds

- [ ] T035: Manual testing (if CLI available)
  - Test with actual Cursor CLI if available
  - Verify authentication detection works
  - Test actual prompt execution
  - Validate timeout behavior with real processes
  - Document any CLI interface discoveries

## Dependencies

**Task Dependencies:**

- T001-T002 (test setup) must complete before T003-T013 (test writing)
- T003-T013 (all tests) should complete before T014-T027 (implementation)
- T014 (file creation) must complete before T015-T027
- T015 (class structure) must complete before T016-T022
- T016 (basic execute) must complete before T017-T018, T026-T027
- T019-T020 (CLI/auth checks) must complete before T021 (isAvailable)
- T023-T025 (error handlers) can be implemented in parallel
- T026-T027 (timeout/cancellation) can be implemented in parallel
- T028-T031 (integration) must run after all implementation
- T032-T035 (validation) must run after integration

**External Dependencies:**

- Cursor IDE with CLI (optional, for manual testing)
- child_process Node.js API
- Test mocking utilities (jest/vitest)

## Notes

### TDD Approach

This task list follows Test-Driven Development:
1. All tests written FIRST (T001-T013)
2. Implementation follows tests (T014-T027)
3. Tests guide implementation design
4. Validation confirms tests pass (T032-T035)

### Open Questions

Implementation may need to adapt based on:
- Actual Cursor CLI interface discovery
- Authentication detection mechanism
- Token counting availability
- Platform-specific behavior

These unknowns are documented in tasks T031 and T035 for ongoing resolution.

### Performance Targets

- Provider instantiation: <10ms (@req NFR:cursor.performance.instantiation)
- Authentication check: <500ms (@req NFR:cursor.performance.auth-check)
