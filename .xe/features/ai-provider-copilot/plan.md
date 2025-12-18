---
id: ai-provider-copilot
title: AI Provider - GitHub Copilot Implementation Plan
author: "@flanakin"
description: "Plan for implementing GitHub Copilot AI provider via Copilot CLI"
---

# Implementation Plan: AI Provider - GitHub Copilot

## Overview

This feature implements the `AIProvider` interface for GitHub Copilot, enabling Catalyst users with Copilot subscriptions to leverage Copilot through Catalyst's unified AI interface. The implementation uses the GitHub CLI with the Copilot extension to communicate with Copilot's API.

## Implementation Approach

### CLI Integration Strategy

The provider will invoke GitHub Copilot through the `gh copilot` CLI command using Node.js `child_process`. This approach:

- Leverages existing GitHub authentication infrastructure
- Avoids implementing custom Copilot API clients
- Inherits GitHub CLI's authentication and error handling
- Provides interactive user experience through terminal

The execution flow:
1. Construct prompt from system context and user prompt
2. Spawn `gh copilot` process with prompt as input
3. Capture stdout for AI response
4. Capture stderr for error handling
5. Parse output and return structured response

### Authentication Validation

Before executing requests, the provider validates the runtime environment through a multi-step check process:

1. **GitHub CLI presence**: Check if `gh` command exists on PATH
2. **Authentication status**: Run `gh auth status` to verify user is logged in
3. **Extension availability**: Run `gh extension list` to confirm `gh-copilot` is installed
4. **Copilot access**: Attempt minimal `gh copilot` invocation to verify subscription access

These checks run during `isAvailable()` calls, with results potentially cached for performance. The `signIn()` method guides users through missing dependencies:
- Prompts CLI installation if missing
- Triggers `gh auth login` if not authenticated
- Runs `gh extension install github/gh-copilot` if extension missing
- Provides clear error messaging if no Copilot subscription detected

### Interactive-Only Model

GitHub Copilot requires GitHub OAuth authentication, which is fundamentally interactive. The provider reflects this limitation:

- `capabilities` array is empty (no `'headless'` capability)
- Headless environments (CI/CD) cannot use this provider
- Users must authenticate interactively at least once
- No API key or service account support

This aligns with Copilot's security model and subscription requirements.

### Command Configuration

The provider defines command configuration for slash command generation:

- `path`: `.github/prompts`
- `useNamespaces`: false (flat file structure)
- `separator`: `.` (e.g., `/catalyst.rollout`)
- `useFrontMatter`: false (no YAML front matter)
- `extension`: `prompt.md`

### Error Handling Strategy

The provider implements comprehensive error handling for CLI-based execution:

**CLI Missing Errors**: When `gh` command not found, throw `AIProviderUnavailable` with:
- Message: "GitHub CLI not found"
- Guidance: "Install GitHub CLI from https://cli.github.com"

**Extension Missing Errors**: When `gh-copilot` extension not installed, throw `AIProviderUnavailable` with:
- Message: "Copilot extension not installed"
- Guidance: "Run: gh extension install github/gh-copilot"

**Authentication Errors**: When `gh auth status` fails, throw `AIProviderUnavailable` with:
- Message: "Not authenticated with GitHub"
- Guidance: "Run: gh auth login"

**No Access Errors**: When authenticated but Copilot unavailable, throw `AIProviderUnavailable` with:
- Message: "No Copilot subscription detected"
- Guidance: "GitHub Copilot requires an active subscription"

**Execution Errors**: CLI invocation failures parse stderr for error details and throw appropriate errors with context.

### Token Tracking Limitations

The GitHub Copilot CLI does not expose token usage statistics in its output. The provider handles this constraint:

- Response `usage` field may be undefined
- Alternatively, estimate tokens using basic heuristics (characters / 4)
- Document limitation in provider capabilities
- Consider future enhancement if GitHub adds token reporting

This limitation is acceptable as Copilot billing is subscription-based, not usage-based.

### Timeout and Cancellation

The provider supports execution control through:

**Inactivity Timeout**: Monitor CLI process output. If no data received within `inactivityTimeout` milliseconds, terminate process and throw timeout error.

**Abort Signal**: When `abortSignal` fires, kill CLI process immediately and clean up resources.

Both mechanisms ensure responsive cancellation and prevent hung processes.

## Implementation Structure

File organization:

```
src/ai/providers/
  copilot-provider.ts          # CopilotProvider implementation

tests/ai/providers/
  copilot-provider.test.ts     # Unit tests
```

The provider follows the same structure as `mock-provider.ts`, implementing all `AIProvider` interface methods with Copilot-specific logic.

## Testing Strategy

Comprehensive test coverage following TDD:

1. **Unit tests** for provider behavior with mocked CLI
2. **Integration tests** verifying CLI command construction
3. **Error scenario tests** for all failure modes
4. **Availability tests** for environment validation

Tests use mocked `child_process` to avoid requiring actual GitHub CLI during test runs.

## Risk Mitigation

**Dependency on External CLI**: The provider requires GitHub CLI to be installed. Mitigation:
- Clear error messages guide installation
- `isAvailable()` validates environment before use
- Documentation lists prerequisites

**CLI API Changes**: GitHub may change CLI behavior. Mitigation:
- Minimal CLI command usage
- Comprehensive error handling
- Version compatibility notes in documentation

**Authentication Complexity**: OAuth flow may confuse users. Mitigation:
- Step-by-step guidance in error messages
- `signIn()` method orchestrates flow
- Documentation includes authentication walkthrough

## Future Enhancements

Potential improvements for future iterations:

- Token usage estimation with character-based heuristics
- Response caching for repeated prompts
- Streaming support if GitHub adds CLI streaming
- Model selection if GitHub exposes model options
- Background CLI process pool for faster response times
