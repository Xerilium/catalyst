---
id: ai-provider-cursor
title: AI Provider - Cursor
author: "@flanakin"
description: "Cursor AI provider implementation via Cursor CLI"
dependencies:
  - ai-provider
---

<!-- markdownlint-disable single-title -->

# Feature: AI Provider - Cursor

## Problem

Catalyst needs to integrate with Cursor AI for users who have Cursor subscriptions. Without a Cursor provider, these users cannot leverage their existing Cursor access through Catalyst's unified AI interface.

## Goals

- Implement `AIProvider` interface for Cursor AI
- Support interactive execution via Cursor authentication
- Leverage Cursor CLI for communication

Explicit non-goals:

- This feature does NOT define the AIProvider interface (see `ai-provider`)
- This feature does NOT implement streaming (responses are collected before returning)
- This feature does NOT support headless execution (requires Cursor authentication)

## Scenario

- As a **Cursor subscriber**, I want to use my existing subscription for Catalyst AI prompts
  - Outcome: Cursor provider leverages existing Cursor access

- As an **interactive user**, I need Cursor to authenticate via my Cursor account
  - Outcome: Cursor authentication flow enables access

## Success Criteria

- Provider instantiation completes in <10ms
- Cursor authentication status detected in <100ms
- Cursor CLI invocation succeeds when authenticated

## Requirements

### Functional Requirements

#### FR:cursor: Cursor Provider Implementation

- **FR:cursor.interface**: Provider MUST implement `AIProvider` interface from `ai-provider`
  - `name` property MUST be `'cursor'`
  - `capabilities` MUST be empty (interactive-only, no headless)

- **FR:cursor.cli**: Provider MUST use Cursor CLI for communication
  - Invokes `cursor` command
  - Requires Cursor IDE with CLI enabled

- **FR:cursor.execute**: `execute()` method MUST:
  - Accept `AIProviderRequest` and return `AIProviderResponse`
  - Construct prompt with system context and user prompt
  - Invoke Cursor CLI with constructed prompt
  - Parse CLI output as response content
  - Implement inactivity timeout via `inactivityTimeout` parameter
  - Support cancellation via `abortSignal`

- **FR:cursor.models**: Provider MUST handle model selection
  - Cursor CLI uses Cursor's configured model
  - `model` parameter in request is acknowledged but may not be configurable
  - Response `model` should indicate `'cursor'` or actual model if detectable

#### FR:cursor.auth: Authentication

- **FR:cursor.auth.cursor**: Provider MUST use Cursor authentication
  - Check Cursor CLI availability
  - Verify user is authenticated with Cursor account

- **FR:cursor.auth.available**: `isAvailable()` MUST return true if:
  - Cursor CLI (`cursor`) is installed
  - User is authenticated with Cursor account
  - User has active Cursor subscription

- **FR:cursor.auth.signin**: `signIn()` MUST:
  - Guide user to authenticate in Cursor IDE
  - Throw `AIProviderUnavailable` if sign-in fails or no Cursor access

#### FR:cursor.usage: Usage Tracking

- **FR:cursor.usage.tokens**: Token tracking is LIMITED for Cursor
  - Cursor CLI may not expose token counts
  - `usage` field should be undefined or estimated

#### FR:cursor.errors: Error Handling

- **FR:cursor.errors.cli-missing**: Missing CLI errors MUST throw `AIProviderUnavailable`
  - Message indicates Cursor CLI not found
  - Guidance suggests installing Cursor IDE and enabling CLI

- **FR:cursor.errors.auth**: Authentication errors MUST throw `AIProviderUnavailable`
  - Message indicates not authenticated
  - Guidance suggests logging in via Cursor IDE

- **FR:cursor.errors.no-access**: No Cursor access errors MUST throw `AIProviderUnavailable`
  - Message indicates no Cursor subscription
  - Guidance explains Cursor subscription requirement

### Non-Functional Requirements

#### NFR:cursor.performance: Performance

- **NFR:cursor.performance.instantiation**: Provider instantiation MUST complete in <10ms
- **NFR:cursor.performance.auth-check**: `isAvailable()` MUST complete in <500ms (CLI invocation)

## Key Entities

Entities owned by this feature:

- **CursorProvider**: Implementation of `AIProvider` for Cursor AI
  - Uses Cursor CLI for communication
  - Interactive-only (requires Cursor authentication)

Entities from other features:

- **AIProvider** (ai-provider): Interface this provider implements
- **AIProviderRequest** (ai-provider): Input structure
- **AIProviderResponse** (ai-provider): Output structure
- **CatalystError** (error-handling): Error class for failures

## Dependencies

**Internal Dependencies:**

- **ai-provider**: Provides `AIProvider` interface and factory registration

**External Dependencies:**

- **Cursor IDE**: Must be installed with CLI enabled
- **Cursor subscription**: User must have active Cursor access

## Open Questions

1. **Cursor CLI Interface**: What is the exact CLI interface for programmatic AI access in Cursor? The implementation will need to adapt based on available commands.

2. **Authentication Flow**: How does Cursor CLI detect authentication status? May need to check config files or run a test command.
