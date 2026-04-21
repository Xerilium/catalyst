---
id: ai-provider-cursor
title: AI Provider - Cursor
description: Cursor AI integration via interactive Cursor authentication and the Cursor CLI.
dependencies:
  - ai-provider
---

<!-- markdownlint-disable single-title -->

# Feature: AI Provider - Cursor

## Purpose

Catalyst needs to integrate with Cursor AI for users who have Cursor subscriptions. The Cursor provider implements the `AIProvider` interface, supporting interactive execution via Cursor authentication and leveraging the Cursor CLI for communication.

Explicit non-goals:

- This feature does NOT define the AIProvider interface (see `ai-provider`)
- This feature does NOT implement streaming (responses are collected before returning)
- This feature does NOT support headless execution (requires Cursor authentication)

## Scenarios

### FR:cursor: Cursor Provider Implementation

Cursor subscriber wants to use their existing subscription for Catalyst AI prompts so that existing Cursor access is leveraged.

- **FR:cursor.interface** (P1): Provider MUST implement `AIProvider` interface from `ai-provider`
  > - @req FR:ai-provider/provider.interface
  - `name` property MUST be `'cursor'`
  - `displayName` property MUST be `'Cursor'`
  - `capabilities` MUST be empty (interactive-only, no headless)

- **FR:cursor.commands** (P2): Provider MUST define `commands` property for slash command generation
  - `path`: `.cursor/commands`
  - `useNamespaces`: true
  - `separator`: `/`
  - `useFrontMatter`: true
  - `extension`: `md`

- **FR:cursor.cli** (P1): Provider MUST use Cursor CLI for communication
  - Invokes `cursor` command
  - Requires Cursor IDE with CLI enabled

- **FR:cursor.execute** (P1): `execute()` method MUST:
  - Accept `AIProviderRequest` and return `AIProviderResponse`
  - Construct prompt with system context and user prompt
  - Invoke Cursor CLI with constructed prompt
  - Parse CLI output as response content
  - Implement inactivity timeout via `inactivityTimeout` parameter
  - Support cancellation via `abortSignal`

- **FR:cursor.models** (P2): Provider MUST handle model selection
  - Cursor CLI uses Cursor's configured model
  - `model` parameter in request is acknowledged but may not be configurable
  - Response `model` should indicate `'cursor'` or actual model if detectable

### FR:cursor.auth: Authentication

Interactive user needs Cursor to authenticate via their Cursor account so that Cursor access is enabled.

- **FR:cursor.auth.cursor** (P1): Provider MUST use Cursor authentication
  - Check Cursor CLI availability
  - Verify user is authenticated with Cursor account

- **FR:cursor.auth.available** (P1): `isAvailable()` MUST return true if:
  - Cursor CLI (`cursor`) is installed
  - User is authenticated with Cursor account
  - User has active Cursor subscription

- **FR:cursor.auth.signin** (P1): `signIn()` MUST:
  - Guide user to authenticate in Cursor IDE
  - Throw `AIProviderUnavailable` if sign-in fails or no Cursor access

### FR:cursor.usage: Usage Tracking

Catalyst user needs token usage reporting, though Cursor CLI provides limited visibility into consumption.

- **FR:cursor.usage.tokens** (P3): Token tracking is LIMITED for Cursor
  - Cursor CLI may not expose token counts
  - `usage` field should be undefined or estimated

### FR:cursor.errors: Error Handling

Catalyst user needs clear error messages and guidance so that CLI, authentication, and access failures can be resolved quickly.

- **FR:cursor.errors.cli-missing** (P2): Missing CLI errors MUST throw `AIProviderUnavailable`
  - Message indicates Cursor CLI not found
  - Guidance suggests installing Cursor IDE and enabling CLI

- **FR:cursor.errors.auth** (P2): Authentication errors MUST throw `AIProviderUnavailable`
  - Message indicates not authenticated
  - Guidance suggests logging in via Cursor IDE

- **FR:cursor.errors.no-access** (P2): No Cursor access errors MUST throw `AIProviderUnavailable`
  - Message indicates no Cursor subscription
  - Guidance explains Cursor subscription requirement

### Non-Functional Requirements

- **NFR:cursor.performance.instantiation** (P4): Provider instantiation MUST complete in <10ms
- **NFR:cursor.performance.auth-check** (P4): `isAvailable()` MUST complete in <500ms (CLI invocation)

## Architecture Constraints

None

## External Dependencies

- **Cursor IDE**: Must be installed with CLI enabled
- **Cursor subscription**: User must have active Cursor access
