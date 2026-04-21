---
id: ai-provider-copilot
title: AI Provider - GitHub Copilot
dependencies:
  - ai-provider
---

<!-- markdownlint-disable single-title -->

# Feature: AI Provider - GitHub Copilot

## Purpose

Catalyst needs to integrate with GitHub Copilot for users who have Copilot subscriptions. The Copilot provider implements the `AIProvider` interface, supporting interactive execution via GitHub authentication and leveraging the existing Copilot CLI for communication.

Explicit non-goals:

- This feature does NOT define the AIProvider interface (see `ai-provider`)
- This feature does NOT implement streaming (responses are collected before returning)
- This feature does NOT support headless execution (requires GitHub OAuth)

## Scenarios

### FR:copilot: Copilot Provider Implementation

GitHub Copilot subscriber wants to use their existing subscription for Catalyst AI prompts so that existing Copilot access is leveraged.

- **FR:copilot.interface** (P1): Provider MUST implement `AIProvider` interface from `ai-provider`
  > - @req FR:ai-provider/provider.interface
  - `name` property MUST be `'copilot'`
  - `displayName` property MUST be `'Copilot'`
  - `capabilities` MUST be empty (interactive-only, no headless)

- **FR:copilot.commands** (P2): Provider MUST define `commands` property for slash command generation
  - `path`: `.github/prompts`
  - `useNamespaces`: false
  - `separator`: `.`
  - `useFrontMatter`: false
  - `extension`: `prompt.md`

- **FR:copilot.cli** (P1): Provider MUST use Copilot CLI for communication
  - Invokes `gh copilot` command
  - Requires GitHub CLI with Copilot extension

- **FR:copilot.execute** (P1): `execute()` method MUST:
  - Accept `AIProviderRequest` and return `AIProviderResponse`
  - Construct prompt with system context and user prompt
  - Invoke Copilot CLI with constructed prompt
  - Parse CLI output as response content
  - Implement inactivity timeout via `inactivityTimeout` parameter
  - Support cancellation via `abortSignal`

- **FR:copilot.models** (P2): Provider MUST handle model selection
  - Copilot CLI does not expose model selection
  - `model` parameter in request is acknowledged but not configurable
  - Response `model` should indicate `'copilot'`

### FR:copilot.auth: Authentication

Interactive user needs Copilot to authenticate via their GitHub account so that Copilot access is enabled through GitHub OAuth.

- **FR:copilot.auth.github** (P1): Provider MUST use GitHub authentication
  - Check GitHub CLI authentication status
  - Verify Copilot extension is installed
  - Verify user has Copilot access

- **FR:copilot.auth.available** (P1): `isAvailable()` MUST return true if:
  - GitHub CLI (`gh`) is installed
  - User is authenticated with `gh auth`
  - Copilot extension is installed
  - User has Copilot subscription access

- **FR:copilot.auth.signin** (P1): `signIn()` MUST:
  - Trigger GitHub CLI authentication if not authenticated
  - Install Copilot extension if not installed
  - Throw `AIProviderUnavailable` if sign-in fails or no Copilot access

### FR:copilot.usage: Usage Tracking

Catalyst user needs token usage reporting, though Copilot CLI provides limited visibility into consumption.

- **FR:copilot.usage.tokens** (P3): Token tracking is LIMITED for Copilot
  - Copilot CLI does not expose token counts
  - `usage` field should be undefined or estimated

### FR:copilot.errors: Error Handling

Catalyst user needs clear error messages and guidance so that CLI, extension, authentication, and access failures can be resolved quickly.

- **FR:copilot.errors.cli-missing** (P2): Missing CLI errors MUST throw `AIProviderUnavailable`
  - Message indicates GitHub CLI not found
  - Guidance suggests installing GitHub CLI

- **FR:copilot.errors.extension-missing** (P2): Missing extension errors MUST throw `AIProviderUnavailable`
  - Message indicates Copilot extension not installed
  - Guidance suggests running `gh extension install github/gh-copilot`

- **FR:copilot.errors.auth** (P2): Authentication errors MUST throw `AIProviderUnavailable`
  - Message indicates not authenticated
  - Guidance suggests running `gh auth login`

- **FR:copilot.errors.no-access** (P2): No Copilot access errors MUST throw `AIProviderUnavailable`
  - Message indicates no Copilot subscription
  - Guidance explains Copilot subscription requirement

### Non-Functional Requirements

- **NFR:copilot.performance.instantiation** (P4): Provider instantiation MUST complete in <10ms
- **NFR:copilot.performance.auth-check** (P4): `isAvailable()` MUST complete in <500ms (CLI invocation)

## Architecture Constraints

None

## External Dependencies

- **GitHub CLI (gh)**: Must be installed separately
- **gh-copilot extension**: GitHub CLI extension for Copilot
- **GitHub Copilot subscription**: User must have active Copilot access
