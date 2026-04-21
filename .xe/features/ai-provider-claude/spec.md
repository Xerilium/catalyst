---
id: ai-provider-claude
title: AI Provider - Claude
dependencies:
  - ai-provider
---

<!-- markdownlint-disable single-title -->

# Feature: AI Provider - Claude

## Purpose

Catalyst needs to integrate with Claude AI for intelligent content generation, code analysis, and decision-making within playbooks and other features. The Claude provider implements the `AIProvider` interface, supporting interactive execution via Claude subscription (primary) and headless execution via API key authentication (fallback), with accurate token usage tracking.

Explicit non-goals:

- This feature does NOT define the AIProvider interface (see `ai-provider`)
- This feature does NOT implement streaming (responses are collected before returning)

## Scenarios

### FR:claude: Claude Provider Implementation

Playbook author needs Claude AI integration in workflows so that intelligent content generation and code analysis can be automated.

- **FR:claude.interface** (P1): Provider MUST implement `AIProvider` interface from `ai-provider`
  > - @req FR:ai-provider/provider.interface
  - `name` property MUST be `'claude'`
  - `displayName` property MUST be `'Claude'`
  - `capabilities` MUST include `'headless'`

- **FR:claude.commands** (P2): Provider MUST define `commands` property for slash command generation
  - `path`: `.claude/commands`
  - `useNamespaces`: true
  - `separator`: `:`
  - `useFrontMatter`: true
  - `extension`: `md`

- **FR:claude.sdk** (P1): Provider MUST use `@anthropic-ai/claude-agent-sdk` for API communication
  - SDK provides both subscription and API key authentication
  - SDK handles message formatting and response parsing

- **FR:claude.execute** (P1): `execute()` method MUST:
  - Accept `AIProviderRequest` and return `AIProviderResponse`
  - Map `systemPrompt` to Claude's system message format
  - Map `prompt` to user message
  - Respect `maxTokens` parameter
  - Implement inactivity timeout via `inactivityTimeout` parameter
  - Support cancellation via `abortSignal`

- **FR:claude.models** (P2): Provider MUST support Claude model selection
  - Use SDK's default model when not specified (no hardcoded default)
  - Accept model override via `AIProviderRequest.model`

### FR:claude.auth: Authentication

Interactive user needs Claude to work with their subscription, and Catalyst users need headless execution via API key as a fallback.

- **FR:claude.auth.subscription** (P1): [deferred] Provider MUST prioritize subscription authentication
  - Use Claude Agent SDK's built-in subscription flow
  - Check subscription status first before falling back to API key

- **FR:claude.auth.api-key** (P1): Provider MAY support API key authentication as fallback
  - Check `ANTHROPIC_API_KEY` environment variable
  - Only used when subscription is not available

- **FR:claude.auth.available** (P1): `isAvailable()` MUST return true if:
  - Claude subscription is authenticated (SDK check), OR
  - `ANTHROPIC_API_KEY` environment variable is set

- **FR:claude.auth.signin** (P1): `signIn()` MUST:
  - Trigger Claude Agent SDK's interactive authentication flow
  - Complete successfully when subscription is authenticated
  - Throw `AIProviderUnavailable` if sign-in fails

### FR:claude.usage: Usage Tracking

Catalyst user needs accurate token usage reporting so that consumption can be monitored and optimized.

- **FR:claude.usage.tokens** (P3): Provider MUST extract token usage from SDK response
  - `inputTokens`: Tokens consumed by prompt
  - `outputTokens`: Tokens generated in response
  - `totalTokens`: Sum of input and output tokens

### FR:claude.errors: Error Handling

Catalyst user needs clear error messages and guidance so that authentication and runtime failures can be resolved quickly.

- **FR:claude.errors.auth** (P2): Authentication errors MUST throw `AIProviderUnavailable`
  - Message indicates authentication failure
  - Guidance suggests running sign-in

- **FR:claude.errors.rate-limit** (P2): Rate limit errors MUST include retry guidance
  - Message indicates rate limit exceeded
  - Guidance includes wait time if available

- **FR:claude.errors.model** (P2): Invalid model errors MUST be descriptive
  - Message includes requested model name

### Non-Functional Requirements

- **NFR:claude.performance.instantiation** (P4): Provider instantiation MUST complete in <10ms
- **NFR:claude.performance.auth-check** (P4): `isAvailable()` MUST complete in <5ms

## Architecture Constraints

None

## External Dependencies

- **@anthropic-ai/claude-agent-sdk**: Official Anthropic SDK for Claude
