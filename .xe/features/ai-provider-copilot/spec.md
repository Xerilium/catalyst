---
id: ai-provider-copilot
title: AI Provider - GitHub Copilot
author: "@flanakin"
description: "GitHub Copilot AI provider implementation via Copilot CLI"
dependencies:
  - ai-provider
---

<!-- markdownlint-disable single-title -->

# Feature: AI Provider - GitHub Copilot

## Problem

Catalyst needs to integrate with GitHub Copilot for users who have Copilot subscriptions. Without a Copilot provider, these users cannot leverage their existing Copilot access through Catalyst's unified AI interface.

## Goals

- Implement `AIProvider` interface for GitHub Copilot
- Support interactive execution via GitHub authentication
- Leverage existing Copilot CLI for communication

Explicit non-goals:

- This feature does NOT define the AIProvider interface (see `ai-provider`)
- This feature does NOT implement streaming (responses are collected before returning)
- This feature does NOT support headless execution (requires GitHub OAuth)

## Scenario

- As a **GitHub Copilot subscriber**, I want to use my existing subscription for Catalyst AI prompts
  - Outcome: Copilot provider leverages existing Copilot access

- As an **interactive user**, I need Copilot to authenticate via my GitHub account
  - Outcome: GitHub OAuth flow enables Copilot access

## Success Criteria

- Provider instantiation completes in <10ms
- GitHub authentication status detected in <100ms
- Copilot CLI invocation succeeds when authenticated

## Requirements

### Functional Requirements

#### FR:copilot: Copilot Provider Implementation

- **FR:copilot.interface**: Provider MUST implement `AIProvider` interface from `ai-provider`
  - `name` property MUST be `'copilot'`
  - `displayName` property MUST be `'Copilot'`
  - `capabilities` MUST be empty (interactive-only, no headless)

- **FR:copilot.commands**: Provider MUST define `commands` property for slash command generation
  - `path`: `.github/prompts`
  - `useNamespaces`: false
  - `separator`: `.`
  - `useFrontMatter`: false
  - `extension`: `prompt.md`

- **FR:copilot.cli**: Provider MUST use Copilot CLI for communication
  - Invokes `gh copilot` command
  - Requires GitHub CLI with Copilot extension

- **FR:copilot.execute**: `execute()` method MUST:
  - Accept `AIProviderRequest` and return `AIProviderResponse`
  - Construct prompt with system context and user prompt
  - Invoke Copilot CLI with constructed prompt
  - Parse CLI output as response content
  - Implement inactivity timeout via `inactivityTimeout` parameter
  - Support cancellation via `abortSignal`

- **FR:copilot.models**: Provider MUST handle model selection
  - Copilot CLI does not expose model selection
  - `model` parameter in request is acknowledged but not configurable
  - Response `model` should indicate `'copilot'`

#### FR:copilot.auth: Authentication

- **FR:copilot.auth.github**: Provider MUST use GitHub authentication
  - Check GitHub CLI authentication status
  - Verify Copilot extension is installed
  - Verify user has Copilot access

- **FR:copilot.auth.available**: `isAvailable()` MUST return true if:
  - GitHub CLI (`gh`) is installed
  - User is authenticated with `gh auth`
  - Copilot extension is installed
  - User has Copilot subscription access

- **FR:copilot.auth.signin**: `signIn()` MUST:
  - Trigger GitHub CLI authentication if not authenticated
  - Install Copilot extension if not installed
  - Throw `AIProviderUnavailable` if sign-in fails or no Copilot access

#### FR:copilot.usage: Usage Tracking

- **FR:copilot.usage.tokens**: Token tracking is LIMITED for Copilot
  - Copilot CLI does not expose token counts
  - `usage` field should be undefined or estimated

#### FR:copilot.errors: Error Handling

- **FR:copilot.errors.cli-missing**: Missing CLI errors MUST throw `AIProviderUnavailable`
  - Message indicates GitHub CLI not found
  - Guidance suggests installing GitHub CLI

- **FR:copilot.errors.extension-missing**: Missing extension errors MUST throw `AIProviderUnavailable`
  - Message indicates Copilot extension not installed
  - Guidance suggests running `gh extension install github/gh-copilot`

- **FR:copilot.errors.auth**: Authentication errors MUST throw `AIProviderUnavailable`
  - Message indicates not authenticated
  - Guidance suggests running `gh auth login`

- **FR:copilot.errors.no-access**: No Copilot access errors MUST throw `AIProviderUnavailable`
  - Message indicates no Copilot subscription
  - Guidance explains Copilot subscription requirement

### Non-Functional Requirements

#### NFR:copilot.performance: Performance

- **NFR:copilot.performance.instantiation**: Provider instantiation MUST complete in <10ms
- **NFR:copilot.performance.auth-check**: `isAvailable()` MUST complete in <500ms (CLI invocation)

## Key Entities

Entities owned by this feature:

- **CopilotProvider**: Implementation of `AIProvider` for GitHub Copilot
  - Uses GitHub CLI with Copilot extension
  - Interactive-only (requires GitHub OAuth)

Entities from other features:

- **AIProvider** (ai-provider): Interface this provider implements
- **AIProviderRequest** (ai-provider): Input structure
- **AIProviderResponse** (ai-provider): Output structure
- **CatalystError** (error-handling): Error class for failures

## Dependencies

**Internal Dependencies:**

- **ai-provider**: Provides `AIProvider` interface and factory registration

**External Dependencies:**

- **GitHub CLI (gh)**: Must be installed separately
- **gh-copilot extension**: GitHub CLI extension for Copilot
- **GitHub Copilot subscription**: User must have active Copilot access
