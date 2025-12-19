---
id: ai-provider-cursor
title: AI Provider - Cursor - Implementation Plan
author: "@flanakin"
description: "Plan for implementing Cursor AI provider via Cursor CLI"
---

# Implementation Plan: AI Provider - Cursor

## Overview

This feature implements the `AIProvider` interface for Cursor AI, enabling Catalyst users with Cursor subscriptions to leverage their existing Cursor access. The implementation wraps the Cursor CLI for programmatic AI interaction.

## Architecture Approach

### CLI Integration Strategy

The Cursor provider will integrate with Cursor through its CLI interface using Node.js `child_process`:

1. **Command Execution**: Use `spawn()` or `exec()` to invoke `cursor` command
2. **Prompt Construction**: Combine system prompt and user prompt into CLI-compatible format
3. **Output Parsing**: Capture stdout/stderr and parse as response content
4. **Process Management**: Handle process lifecycle, timeouts, and cancellation

### Authentication Detection

Authentication status will be determined through:

1. **CLI Availability Check**: Verify `cursor` command exists in PATH
2. **Authentication Verification**: Attempt a lightweight command to detect auth status
   - May involve checking for specific output patterns
   - Could inspect Cursor configuration files if CLI provides no direct check
3. **Subscription Validation**: Ensure user has active Cursor access

Open question: The exact CLI interface is unknown. Implementation may need to:
- Discover available Cursor CLI commands through documentation or experimentation
- Adapt based on what Cursor CLI actually exposes for programmatic access
- Potentially use alternative approaches (config file inspection, test prompts)

### Interactive-Only Design

Unlike headless providers (Claude, OpenAI), Cursor requires interactive authentication:

- **No headless capability**: `capabilities` array will be empty
- **Interactive sign-in**: `signIn()` guides user to authenticate in Cursor IDE
- **Session management**: Rely on Cursor CLI maintaining authentication state

### Command Configuration

The provider defines command configuration for slash command generation:

- `path`: `.cursor/commands`
- `useNamespaces`: true (uses `catalyst/` directory)
- `separator`: `/` (e.g., `/catalyst/rollout`)
- `useFrontMatter`: true (preserves YAML front matter)
- `extension`: `md`

### Token Tracking Limitations

Cursor CLI may not expose detailed token counts:

- **Best effort tracking**: Return usage stats if CLI provides them
- **Undefined fallback**: Set `usage` to undefined if unavailable
- **Estimation approach**: Could estimate based on input/output length if needed
- **Documentation**: Clearly document limited token tracking in code comments

## Error Handling Strategy

### CLI Missing Error

When `cursor` command is not found:
- Throw `AIProviderUnavailable` with clear message
- Guidance: "Install Cursor IDE and enable CLI access"
- Detection: Handle `ENOENT` error from spawn/exec

### Authentication Errors

When user is not authenticated:
- Throw `AIProviderUnavailable` with clear message
- Guidance: "Sign in to Cursor IDE using your Cursor account"
- Detection: Parse CLI error output for auth-related messages

### No Access Errors

When user lacks Cursor subscription:
- Throw `AIProviderUnavailable` with clear message
- Guidance: "Cursor subscription required. Visit cursor.com for details"
- Detection: Parse CLI error output for subscription-related messages

### Timeout Handling

Implement inactivity timeout through:
- Process-level timeout using `setTimeout()`
- Kill child process when timeout expires
- Respect `abortSignal` for cancellation

## Implementation Phases

### Phase 1: Core Provider Structure

Create `cursor-provider.ts` implementing:
- `AIProvider` interface
- Constructor (no initialization needed)
- Basic properties: `name = 'cursor'`, `capabilities = []`

### Phase 2: CLI Integration

Implement `execute()` method:
- Spawn `cursor` CLI with constructed prompt
- Capture stdout/stderr
- Parse output into `AIProviderResponse`
- Handle process errors

### Phase 3: Authentication

Implement `isAvailable()` and `signIn()`:
- Check CLI existence
- Verify authentication status
- Provide sign-in guidance

### Phase 4: Error Handling

Add comprehensive error handling:
- CLI missing errors
- Authentication failures
- Subscription validation
- Timeout management
- Cancellation support

### Phase 5: Testing

Write comprehensive tests:
- Mock child_process for unit tests
- Test all error scenarios
- Verify timeout behavior
- Test cancellation handling

## Open Questions and Risks

### Critical Unknowns

1. **Cursor CLI Interface**: What commands does Cursor CLI expose for AI interaction?
   - Risk: May not have programmatic AI access
   - Mitigation: Research Cursor documentation, experiment with CLI, consider alternatives

2. **Authentication Detection**: How to check if user is signed in?
   - Risk: No reliable way to detect auth status
   - Mitigation: Attempt test prompt, check config files, document limitations

3. **Token Counting**: Does CLI expose usage statistics?
   - Risk: No token tracking available
   - Mitigation: Return undefined usage, document limitation

### Implementation Risks

- **CLI Interface Changes**: Cursor could change CLI behavior in updates
  - Mitigation: Version detection, graceful degradation

- **Platform Differences**: CLI behavior may vary across OS
  - Mitigation: Test on macOS, Windows, Linux

- **Process Management**: Child process handling complexity
  - Mitigation: Use battle-tested patterns, comprehensive timeout testing

## Validation Criteria

1. **Instantiation Performance**: Provider creation completes in <10ms
2. **Auth Check Performance**: `isAvailable()` completes in <500ms
3. **CLI Execution**: Successfully invokes Cursor CLI when available
4. **Error Handling**: All error scenarios throw appropriate CatalystError
5. **Timeout Behavior**: Inactivity timeout properly kills process
6. **Cancellation**: AbortSignal cancellation terminates execution
7. **Test Coverage**: 100% code coverage with unit tests

## Dependencies

**Internal:**
- `ai-provider`: AIProvider interface, types, error factories

**External:**
- Cursor IDE installed with CLI enabled
- Active Cursor subscription

**Node.js APIs:**
- `child_process`: For CLI invocation
- `fs/promises`: For potential config file checks (if needed)

## Testing Strategy

### Unit Tests

Mock `child_process` to test:
- Successful execution flow
- CLI missing scenarios
- Authentication failures
- Timeout behavior
- Cancellation handling
- Output parsing

### Integration Tests

If Cursor CLI is available:
- Test actual CLI invocation (optional, may require credentials)
- Verify authentication flow
- Test with real prompts

### Error Scenario Tests

Comprehensive error testing:
- ENOENT (CLI missing)
- Auth error output patterns
- Subscription error patterns
- Process timeout
- Signal cancellation
