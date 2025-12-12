---
id: ai-provider-ollama
title: AI Provider - Ollama
author: "@flanakin"
description: "Ollama local AI provider implementation"
dependencies:
  - ai-provider
---

<!-- markdownlint-disable single-title -->

# Feature: AI Provider - Ollama

## Problem

Catalyst needs to support local AI model execution for users who want privacy, offline operation, or cost-free AI usage. Without an Ollama provider, users cannot leverage locally-hosted models through Catalyst's unified AI interface.

## Goals

- Implement `AIProvider` interface for Ollama local AI platform
- Support headless execution (no authentication required)
- Enable offline AI operation with local models

Explicit non-goals:

- This feature does NOT define the AIProvider interface (see `ai-provider`)
- This feature does NOT implement streaming (responses are collected before returning)
- This feature does NOT install or manage Ollama (must be pre-installed)

## Scenario

- As a **privacy-conscious user**, I need to run AI locally without sending data to cloud services
  - Outcome: Ollama provider executes all AI requests locally

- As a **Catalyst user**, I need local AI that works without cloud credentials
  - Outcome: Ollama requires only a running Ollama server

- As an **offline user**, I need AI capabilities without internet connectivity
  - Outcome: Ollama works entirely offline with downloaded models

## Success Criteria

- Provider instantiation completes in <10ms
- Ollama server detection completes in <100ms
- Works without any cloud credentials or API keys

## Requirements

### Functional Requirements

#### FR:ollama: Ollama Provider Implementation

- **FR:ollama.interface**: Provider MUST implement `AIProvider` interface from `ai-provider`
  - `name` property MUST be `'ollama'`
  - `capabilities` MUST include `'headless'`

- **FR:ollama.sdk**: Provider MUST use `ollama` SDK for local server communication
  - Official Ollama JavaScript SDK
  - Communicates with local Ollama server

- **FR:ollama.execute**: `execute()` method MUST:
  - Accept `AIProviderRequest` and return `AIProviderResponse`
  - Map `systemPrompt` to Ollama's system message format
  - Map `prompt` to user message
  - Respect `maxTokens` parameter if model supports it
  - Implement inactivity timeout via `inactivityTimeout` parameter
  - Support cancellation via `abortSignal`

- **FR:ollama.models**: Provider MUST support Ollama model selection
  - Use Ollama's default model when not specified
  - Accept model override via `AIProviderRequest.model`
  - Model must be pre-pulled in Ollama

#### FR:ollama.server: Server Connection

- **FR:ollama.server.url**: Provider MUST support configurable server URL
  - Default: `http://localhost:11434`
  - Override via `OLLAMA_HOST` environment variable

- **FR:ollama.server.available**: `isAvailable()` MUST return true if:
  - Ollama server is reachable at configured URL
  - Server responds to health check

- **FR:ollama.server.signin**: `signIn()` MUST:
  - Verify Ollama server is running
  - Throw `AIProviderUnavailable` if server not reachable

#### FR:ollama.usage: Usage Tracking

- **FR:ollama.usage.tokens**: Provider MUST extract token usage from Ollama response
  - `inputTokens`: `prompt_eval_count` from response
  - `outputTokens`: `eval_count` from response
  - `totalTokens`: Sum of input and output tokens
  - Note: Some models may not report token counts

#### FR:ollama.errors: Error Handling

- **FR:ollama.errors.server**: Server connection errors MUST throw `AIProviderUnavailable`
  - Message indicates Ollama server not reachable
  - Guidance suggests starting Ollama or checking OLLAMA_HOST

- **FR:ollama.errors.model**: Model not found errors MUST be descriptive
  - Message includes requested model name
  - Guidance suggests pulling the model with `ollama pull <model>`

### Non-Functional Requirements

#### NFR:ollama.performance: Performance

- **NFR:ollama.performance.instantiation**: Provider instantiation MUST complete in <10ms
- **NFR:ollama.performance.server-check**: `isAvailable()` MUST complete in <100ms

## Key Entities

Entities owned by this feature:

- **OllamaProvider**: Implementation of `AIProvider` for local Ollama server
  - Uses ollama SDK for local server communication
  - No authentication required (headless by nature)

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

- **ollama**: Official Ollama JavaScript SDK
- **Ollama server**: Must be installed and running separately
