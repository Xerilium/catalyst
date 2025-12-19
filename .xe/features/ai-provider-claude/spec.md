---
id: ai-provider-claude
title: AI Provider - Claude
author: "@flanakin"
description: "Claude AI provider implementation using Claude Agent SDK"
dependencies:
  - ai-provider
---

<!-- markdownlint-disable single-title -->

# Feature: AI Provider - Claude

## Problem

Catalyst needs to integrate with Claude AI for intelligent content generation, code analysis, and decision-making within playbooks and other features. Without a Claude provider, users cannot leverage Anthropic's Claude models through Catalyst's unified AI interface.

## Goals

- Implement `AIProvider` interface for Claude AI platform
- Support interactive execution via Claude subscription (primary)
- Support headless execution via API key authentication (fallback)
- Provide accurate token usage tracking

Explicit non-goals:

- This feature does NOT define the AIProvider interface (see `ai-provider`)
- This feature does NOT implement streaming (responses are collected before returning)

## Scenario

- As a **playbook author**, I need to use Claude for AI prompts in my workflows
  - Outcome: Claude provider seamlessly integrates with `ai-prompt` action

- As an **interactive user**, I need Claude to work with my subscription
  - Outcome: Claude subscription authentication via Claude Agent SDK (primary auth method)

- As a **Catalyst user**, I need Claude to work in server-side scenarios without user interaction
  - Outcome: API key authentication enables headless execution as fallback

## Success Criteria

- Provider instantiation completes in <10ms
- Authentication status detected in <5ms
- Token usage accurately reported for all requests

## Requirements

### Functional Requirements

#### FR:claude: Claude Provider Implementation

- **FR:claude.interface**: Provider MUST implement `AIProvider` interface from `ai-provider`
  - `name` property MUST be `'claude'`
  - `displayName` property MUST be `'Claude'`
  - `capabilities` MUST include `'headless'`

- **FR:claude.commands**: Provider MUST define `commands` property for slash command generation
  - `path`: `.claude/commands`
  - `useNamespaces`: true
  - `separator`: `:`
  - `useFrontMatter`: true
  - `extension`: `md`

- **FR:claude.sdk**: Provider MUST use `@anthropic-ai/claude-agent-sdk` for API communication
  - SDK provides both subscription and API key authentication
  - SDK handles message formatting and response parsing

- **FR:claude.execute**: `execute()` method MUST:
  - Accept `AIProviderRequest` and return `AIProviderResponse`
  - Map `systemPrompt` to Claude's system message format
  - Map `prompt` to user message
  - Respect `maxTokens` parameter
  - Implement inactivity timeout via `inactivityTimeout` parameter
  - Support cancellation via `abortSignal`

- **FR:claude.models**: Provider MUST support Claude model selection
  - Use SDK's default model when not specified (no hardcoded default)
  - Accept model override via `AIProviderRequest.model`

#### FR:claude.auth: Authentication

- **FR:claude.auth.subscription**: Provider MUST prioritize subscription authentication
  - Use Claude Agent SDK's built-in subscription flow
  - Check subscription status first before falling back to API key

- **FR:claude.auth.api-key**: Provider MAY support API key authentication as fallback
  - Check `ANTHROPIC_API_KEY` environment variable
  - Only used when subscription is not available

- **FR:claude.auth.available**: `isAvailable()` MUST return true if:
  - Claude subscription is authenticated (SDK check), OR
  - `ANTHROPIC_API_KEY` environment variable is set

- **FR:claude.auth.signin**: `signIn()` MUST:
  - Trigger Claude Agent SDK's interactive authentication flow
  - Complete successfully when subscription is authenticated
  - Throw `AIProviderUnavailable` if sign-in fails

#### FR:claude.usage: Usage Tracking

- **FR:claude.usage.tokens**: Provider MUST extract token usage from SDK response
  - `inputTokens`: Tokens consumed by prompt
  - `outputTokens`: Tokens generated in response
  - `totalTokens`: Sum of input and output tokens

#### FR:claude.errors: Error Handling

- **FR:claude.errors.auth**: Authentication errors MUST throw `AIProviderUnavailable`
  - Message indicates authentication failure
  - Guidance suggests running sign-in

- **FR:claude.errors.rate-limit**: Rate limit errors MUST include retry guidance
  - Message indicates rate limit exceeded
  - Guidance includes wait time if available

- **FR:claude.errors.model**: Invalid model errors MUST be descriptive
  - Message includes requested model name

### Non-Functional Requirements

#### NFR:claude.performance: Performance

- **NFR:claude.performance.instantiation**: Provider instantiation MUST complete in <10ms
- **NFR:claude.performance.auth-check**: `isAvailable()` MUST complete in <5ms

## Key Entities

Entities owned by this feature:

- **ClaudeProvider**: Implementation of `AIProvider` for Claude platform
  - Uses Claude Agent SDK for API communication
  - Supports subscription (primary) and API key (fallback) authentication

Entities from other features:

- **AIProvider** (ai-provider): Interface this provider implements
- **AIProviderRequest** (ai-provider): Input structure
- **AIProviderResponse** (ai-provider): Output structure
- **AIUsageStats** (ai-provider): Token usage tracking
- **CatalystError** (error-handling): Error class for failures

## Dependencies

**Internal Dependencies:**

- **ai-provider**: Provides `AIProvider` interface and factory registration

**External Dependencies:**

- **@anthropic-ai/claude-agent-sdk**: Official Anthropic SDK for Claude
