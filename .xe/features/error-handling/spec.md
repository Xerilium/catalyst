---
id: error-handling
title: Error Handling
author: "@flanakin"
description: "Base error handling utilities for consistent error reporting across Catalyst features"
dependencies: []
---

<!-- markdownlint-disable single-title -->

# Feature: Error Handling

## Problem

Features need consistent error handling with clear, actionable error messages that help users understand what went wrong and how to fix it. Without a shared error foundation, each feature implements its own error handling, leading to inconsistent error messages and duplicated error logic.

## Goals

- Provide standard interfaces for errors and error handling
- Support error chaining for debugging
- Ensure all errors provide clear "what happened" and "how to fix" messages

Explicit non-goals:

- Error logging infrastructure (handled by individual features)
- Error monitoring/telemetry (Phase 2+)
- Error recovery/retry logic (feature-specific)

## Scenario

- As a **Framework Developer**, I need to throw errors with specific codes and guidance
  - Outcome: Errors include a clear, concise code, descriptive message, and actionable guidance

- As a **Developer**, I need to handle specific error scenarios by error code
  - Outcome: Error codes can be matched in error policies

- As a **User**, I need clear error messages
  - Outcome: Errors include problem description and fix guidance

- As an **Engineer**, I need to trace error causes
  - Outcome: Errors support cause chaining

## Success Criteria

- Standard error interface with code, message, and cause
- Errors include problem description and fix guidance
- Error cause chaining works

## Requirements

### Functional Requirements

**FR:catalyst-error**: CatalystError Class

- **FR:catalyst-error.extends-error**: System MUST provide `CatalystError` class extending JavaScript `Error`
- **FR:catalyst-error.constructor**: Constructor MUST accept:
  - `message`: User-facing problem description (required)
  - `code`: Pascal-cased error code (required, e.g., 'PlaybookNotFound')
  - `guidance`: Actionable fix guidance (required)
  - `cause`: Optional underlying error for chaining
- **FR:catalyst-error.stack-traces**: MUST preserve stack traces
- **FR:catalyst-error.serialization**: MUST be JSON serializable (includes code, message, guidance, cause)

**FR:error-action**: ErrorAction Enum

- **FR:error-action.values**: System MUST provide `ErrorAction` string enum with the following values:
  - `Stop` – halts execution immediately (default)
  - `Suspend` – pauses execution (if supported; otherwise stops)
  - `Break` – breaks out of the current pipeline or loop
  - `Inquire` – prompts the user to decide how to proceed
  - `Continue` – displays the error to the user but continues execution
  - `SilentlyContinue` – suppresses the error and continues execution
  - `Ignore` – ignores the error without reporting it

**FR:error-policy-action**: ErrorPolicyAction Interface

- **FR:error-policy-action.interface**: System MUST provide `ErrorPolicyAction` interface with:
  - `retryCount?: number` – number of retries before taking action (optional, defaults to 0)
  - `action: ErrorAction` – the action to take after retries are exhausted (required)

**FR:error-policy**: ErrorPolicy Interface

- **FR:error-policy.interface**: System MUST provide `ErrorPolicy` interface as a dictionary with:
  - `default: ErrorPolicyAction` – fallback action for unmatched error codes (required)
  - `[errorCode: string]: ErrorPolicyAction` – per-code action overrides (optional)
- **FR:error-policy.pascal-cased**: Error code keys SHOULD be Pascal-cased strings
- **FR:error-policy.valid-codes**: Error code keys MUST be valid CatalystError codes

### Non-functional requirements

**NFR:performance** (P4): Performance

- **NFR:performance.instantiation** (P4): [deferred] Error instantiation <1ms
- **NFR:performance.serialization** (P4): [deferred] Error serialization <5ms

## Key Entities

- **CatalystError**: Error class with code, message, guidance, and optional cause
- **ErrorAction**: String enum for error handling actions
- **ErrorPolicyAction**: Interface specifying action and retry count
- **ErrorPolicy**: Dictionary interface mapping error codes to policy actions with required default

## Dependencies

**Feature Dependencies:**

None

**External Dependencies:**

- **Node.js >= 18**: Native Error class and stack traces
