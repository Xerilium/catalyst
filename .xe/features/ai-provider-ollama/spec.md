---
id: ai-provider-ollama
title: AI Provider - Ollama
description: Local/offline AI execution via Ollama with no authentication required.
dependencies:
  - ai-provider
---

<!-- markdownlint-disable single-title -->

# Feature: AI Provider - Ollama

## Purpose

Catalyst needs to support local AI model execution for users who want privacy, offline operation, or cost-free AI usage. The Ollama provider implements the `AIProvider` interface, supporting headless execution with no authentication required, enabling offline AI operation with local models.

Explicit non-goals:

- This feature does NOT define the AIProvider interface (see `ai-provider`)
- This feature does NOT implement streaming (responses are collected before returning)
- This feature does NOT install or manage Ollama (must be pre-installed)

## Scenarios

### FR:ollama: Ollama Provider Implementation

Privacy-conscious user needs to run AI locally without sending data to cloud services so that all AI requests execute locally.

- **FR:ollama.interface** (P1): Provider MUST implement `AIProvider` interface from `ai-provider`
  > - @req FR:ai-provider/provider.interface
  - `name` property MUST be `'ollama'`
  - `capabilities` MUST include `'headless'`

- **FR:ollama.sdk** (P1): Provider MUST use `ollama` SDK for local server communication
  - Official Ollama JavaScript SDK
  - Communicates with local Ollama server

- **FR:ollama.execute** (P1): `execute()` method MUST:
  - Accept `AIProviderRequest` and return `AIProviderResponse`
  - Map `systemPrompt` to Ollama's system message format
  - Map `prompt` to user message
  - Respect `maxTokens` parameter if model supports it
  - Implement inactivity timeout via `inactivityTimeout` parameter
  - Support cancellation via `abortSignal`

- **FR:ollama.models** (P2): Provider MUST support Ollama model selection
  - Use Ollama's default model when not specified
  - Accept model override via `AIProviderRequest.model`
  - Model must be pre-pulled in Ollama

### FR:ollama.server: Server Connection

Catalyst user needs local AI that works without cloud credentials so that only a running Ollama server is required.

- **FR:ollama.server.url** (P2): Provider MUST support configurable server URL
  - Default: `http://localhost:11434`
  - Override via `OLLAMA_HOST` environment variable

- **FR:ollama.server.available** (P1): `isAvailable()` MUST return true if:
  - Ollama server is reachable at configured URL
  - Server responds to health check

- **FR:ollama.server.signin** (P1): `signIn()` MUST:
  - Verify Ollama server is running
  - Throw `AIProviderUnavailable` if server not reachable

### FR:ollama.usage: Usage Tracking

Catalyst user needs token usage reporting so that local model consumption can be monitored.

- **FR:ollama.usage.tokens** (P3): Provider MUST extract token usage from Ollama response
  - `inputTokens`: `prompt_eval_count` from response
  - `outputTokens`: `eval_count` from response
  - `totalTokens`: Sum of input and output tokens
  - Note: Some models may not report token counts

### FR:ollama.errors: Error Handling

Catalyst user needs clear error messages and guidance so that server and model failures can be resolved quickly.

- **FR:ollama.errors.server** (P2): Server connection errors MUST throw `AIProviderUnavailable`
  - Message indicates Ollama server not reachable
  - Guidance suggests starting Ollama or checking OLLAMA_HOST

- **FR:ollama.errors.model** (P2): Model not found errors MUST be descriptive
  - Message includes requested model name
  - Guidance suggests pulling the model with `ollama pull <model>`

### Non-Functional Requirements

- **NFR:ollama.performance.instantiation** (P4): Provider instantiation MUST complete in <10ms
- **NFR:ollama.performance.server-check** (P4): `isAvailable()` MUST complete in <100ms

## Architecture Constraints

None

## External Dependencies

- **ollama**: Official Ollama JavaScript SDK
- **Ollama server**: Must be installed and running separately
