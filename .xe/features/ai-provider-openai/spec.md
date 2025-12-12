---
id: ai-provider-openai
title: AI Provider - OpenAI
author: "@flanakin"
description: "OpenAI AI provider implementation"
dependencies:
  - ai-provider
---

<!-- markdownlint-disable single-title -->

# Feature: AI Provider - OpenAI

## Problem

Catalyst needs to integrate with OpenAI's GPT models for intelligent content generation, code analysis, and decision-making. Without an OpenAI provider, users cannot leverage OpenAI's models through Catalyst's unified AI interface.

## Goals

- Implement `AIProvider` interface for OpenAI platform
- Support headless execution via API key authentication
- Provide accurate token usage tracking

Explicit non-goals:

- This feature does NOT define the AIProvider interface (see `ai-provider`)
- This feature does NOT implement streaming (responses are collected before returning)

## Scenario

- As a **playbook author**, I need to use OpenAI for AI prompts in my workflows
  - Outcome: OpenAI provider seamlessly integrates with `ai-prompt` action

- As a **Catalyst user**, I need OpenAI to work in server-side scenarios without user interaction
  - Outcome: API key authentication enables headless execution

## Success Criteria

- Provider instantiation completes in <10ms
- API key authentication detected in <5ms
- Token usage accurately reported for all requests

## Requirements

### Functional Requirements

#### FR:openai: OpenAI Provider Implementation

- **FR:openai.interface**: Provider MUST implement `AIProvider` interface from `ai-provider`
  - `name` property MUST be `'openai'`
  - `capabilities` MUST include `'headless'`

- **FR:openai.sdk**: Provider MUST use `openai` SDK for API communication
  - Official OpenAI SDK
  - Handles message formatting and response parsing

- **FR:openai.execute**: `execute()` method MUST:
  - Accept `AIProviderRequest` and return `AIProviderResponse`
  - Map `systemPrompt` to OpenAI's system message role
  - Map `prompt` to user message role
  - Respect `maxTokens` parameter
  - Implement inactivity timeout via `inactivityTimeout` parameter
  - Support cancellation via `abortSignal`

- **FR:openai.models**: Provider MUST support OpenAI model selection
  - Use SDK's default model when not specified (no hardcoded default)
  - Accept model override via `AIProviderRequest.model`

#### FR:openai.auth: Authentication

- **FR:openai.auth.api-key**: Provider MUST support API key authentication
  - Check `OPENAI_API_KEY` environment variable
  - API key enables headless execution

- **FR:openai.auth.available**: `isAvailable()` MUST return true if:
  - `OPENAI_API_KEY` environment variable is set

- **FR:openai.auth.signin**: `signIn()` MUST:
  - Provide guidance for obtaining API key
  - Throw `AIProviderUnavailable` (no interactive flow available)

#### FR:openai.usage: Usage Tracking

- **FR:openai.usage.tokens**: Provider MUST extract token usage from SDK response
  - `inputTokens`: `prompt_tokens` from response
  - `outputTokens`: `completion_tokens` from response
  - `totalTokens`: `total_tokens` from response

#### FR:openai.errors: Error Handling

- **FR:openai.errors.auth**: Authentication errors MUST throw `AIProviderUnavailable`
  - Message indicates API key not configured or invalid
  - Guidance explains how to obtain and set API key

- **FR:openai.errors.rate-limit**: Rate limit errors MUST include retry guidance
  - Extract retry-after header if available

- **FR:openai.errors.model**: Invalid model errors MUST be descriptive

### Non-Functional Requirements

#### NFR:openai.performance: Performance

- **NFR:openai.performance.instantiation**: Provider instantiation MUST complete in <10ms
- **NFR:openai.performance.auth-check**: `isAvailable()` MUST complete in <5ms

## Key Entities

Entities owned by this feature:

- **OpenAIProvider**: Implementation of `AIProvider` for OpenAI platform
  - Uses openai SDK for API communication
  - API key authentication (headless)

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

- **openai**: Official OpenAI SDK
