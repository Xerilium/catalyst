---
id: error-handling
title: Error Handling
description: Shared error classes and interfaces so every feature reports errors with a code, message, and fix guidance.
dependencies: []
---

<!-- markdownlint-disable single-title -->

# Feature: Error Handling

## Purpose

Catalyst needs consistent error handling with clear, actionable error messages that help users understand what went wrong and how to fix it. The error-handling feature provides shared error classes and interfaces so every feature reports errors uniformly — with a code, a message, and fix guidance.

Explicit non-goals:

- Error logging infrastructure (handled by individual features)
- Error monitoring/telemetry (Phase 2+)
- Error recovery/retry logic (feature-specific)

## Scenarios

### FR:catalyst-error: CatalystError Class

Framework developer needs a standard error class with codes and guidance so that errors are consistent and actionable across all features.

- **FR:catalyst-error.extends-error** (P1): System MUST provide `CatalystError` class extending JavaScript `Error`
- **FR:catalyst-error.constructor** (P1): Constructor MUST accept:
  - `message`: User-facing problem description (required)
  - `code`: Pascal-cased error code (required, e.g., 'PlaybookNotFound')
  - `guidance`: Actionable fix guidance (required)
  - `cause`: Optional underlying error for chaining
- **FR:catalyst-error.stack-traces** (P1): MUST preserve stack traces
- **FR:catalyst-error.serialization** (P2): MUST be JSON serializable (includes code, message, guidance, cause)

### FR:error-action: ErrorAction Enum

Developer needs to handle specific error scenarios by error code so that error codes can be matched in error policies.

- **FR:error-action.values** (P1): System MUST provide `ErrorAction` string enum with the following values:
  - `Stop` – halts execution immediately (default)
  - `Suspend` – pauses execution (if supported; otherwise stops)
  - `Break` – breaks out of the current pipeline or loop
  - `Inquire` – prompts the user to decide how to proceed
  - `Continue` – displays the error to the user but continues execution
  - `SilentlyContinue` – suppresses the error and continues execution
  - `Ignore` – ignores the error without reporting it

### FR:error-policy-action: ErrorPolicyAction Interface

Developer needs to specify retry behavior before escalating so that transient failures can be retried automatically.

- **FR:error-policy-action.interface** (P1): System MUST provide `ErrorPolicyAction` interface with:
  - `retryCount?: number` – number of retries before taking action (optional, defaults to 0)
  - `action: ErrorAction` – the action to take after retries are exhausted (required)

### FR:error-policy: ErrorPolicy Interface

Engineer needs to configure per-code error handling so that different error types get appropriate responses.

- **FR:error-policy.interface** (P1): System MUST provide `ErrorPolicy` interface as a dictionary with:
  - `default: ErrorPolicyAction` – fallback action for unmatched error codes (required)
  - `[errorCode: string]: ErrorPolicyAction` – per-code action overrides (optional)
- **FR:error-policy.pascal-cased** (P3): Error code keys SHOULD be Pascal-cased strings
- **FR:error-policy.valid-codes** (P2): Error code keys MUST be valid CatalystError codes

### Non-functional Requirements

- **NFR:performance.instantiation** (P4): [deferred] Error instantiation <1ms
- **NFR:performance.serialization** (P4): [deferred] Error serialization <5ms

## Architecture Constraints

None

## External Dependencies

- **Node.js >= 18**: Native Error class and stack traces
