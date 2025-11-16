---
id: error-handling
title: Error Handling
author: "@flanakin"
description: "Base error classes and utilities for consistent error reporting across Catalyst features"
dependencies: []
---

<!-- markdownlint-disable single-title -->

# Feature: Error Handling

## Problem

Features need consistent error handling with clear, actionable error messages that help users understand what went wrong and how to fix it. Without a shared error foundation, each feature implements its own error handling, leading to inconsistent error messages and duplicated error logic.

## Goals

- Provide a CatalystError class with explicit, descriptive error codes
- Enable features to throw errors with unique codes and actionable guidance
- Support error cause chaining for debugging complex failures
- Ensure all errors provide clear "what happened" and "how to fix" messages
- Scale gracefully - adding new error scenarios doesn't require new classes

Explicit non-goals:

- Multiple error subclasses (adds complexity without value)
- Error logging infrastructure (handled by individual features)
- Error monitoring/telemetry (Phase 2+)
- Error recovery/retry logic (feature-specific)

## Scenario

- As a **Framework Developer**, I need to throw errors with specific error codes and guidance messages
  - Outcome: Errors include explicit PascalCased code (e.g., "PlaybookNotFound"), user-facing message, and actionable guidance

- As a **Developer**, I need to catch and handle specific error scenarios by code
  - Outcome: Error codes are unique, descriptive strings that can be matched in error policies

- As a **User**, I need clear error messages that tell me what went wrong and how to fix it
  - Outcome: All errors include both problem description and fix guidance

- As an **Engineer**, I need to trace error causes through multiple layers
  - Outcome: Errors support cause chaining (error.cause) for debugging

## Success Criteria

- All features use CatalystError with explicit, descriptive codes
- Error codes are unique, PascalCased strings (e.g., "InvalidInput", "GitHubAuthFailed")
- Error messages include both "what happened" and "how to fix" guidance
- Error cause chaining works for nested errors
- Zero features implement custom error classes - single CatalystError scales to all scenarios

## Design principles

**Fail fast with clear guidance**
> Errors stop execution immediately with specific, actionable messages. Never silently continue. Messages include explicit error code, problem description, and fix guidance.

**Single class, explicit codes**
> One CatalystError class with descriptive codes scales better than multiple subclasses. Codes are PascalCased, human-readable strings that clearly identify the failure scenario.

## Requirements

### Functional Requirements

**FR-1**: CatalystError Class

- **FR-1.1**: System MUST provide single `CatalystError` class extending JavaScript `Error`
- **FR-1.2**: `CatalystError` constructor MUST accept:
  - `message`: User-facing problem description (required)
  - `code`: PascalCased error code (required, e.g., 'PlaybookNotFound', 'InvalidInput')
  - `guidance`: Actionable fix guidance for user (required)
  - `cause`: Optional underlying error for chaining
- **FR-1.3**: `CatalystError` MUST preserve stack traces for debugging
- **FR-1.4**: `CatalystError` MUST be JSON serializable for logging (includes code, message, guidance, cause)
- **FR-1.5**: Error codes MUST be unique, descriptive PascalCased strings
- **FR-1.6**: System MUST NOT provide error subclasses - single CatalystError handles all scenarios

### Non-functional requirements

- **NFR-1**: Simplicity
  - **NFR-1.1**: CatalystError implementation MUST be <30 lines
  - **NFR-1.2**: No external dependencies beyond Node.js built-ins
  - **NFR-1.3**: No error subclasses - single class for all scenarios

- **NFR-2**: Performance
  - **NFR-2.1**: Error instantiation MUST complete in <1ms
  - **NFR-2.2**: Error serialization MUST complete in <5ms

- **NFR-3**: Testability
  - **NFR-3.1**: 100% test coverage for CatalystError
  - **NFR-3.2**: Error serialization MUST be deterministic

## Key Entities

Entities owned by this feature:

- **CatalystError**: Single error class for all scenarios
  - Attributes: message (string), code (string), guidance (string), cause (Error | undefined)
  - Location: `src/ts/errors/base.ts`
  - Example codes: "PlaybookNotFound", "InvalidInput", "GitHubAuthFailed", "NetworkTimeout"

- **ErrorPolicy (type)**: Error handling policy for playbook engine
  - Type: `string | Record<string, string>` where values are PascalCased actions: `Fail`, `Continue`, `Ignore`, `Retry:3`
  - Location: `src/ts/errors/types.ts`
  - Usage: Maps error codes to handling strategies

Inputs:

- **Error Data**: Message, code, guidance, optional cause
  - Format: Constructor parameters `new CatalystError(message, code, guidance, cause?)`
  - Validation: Message, code, and guidance must be non-empty strings; code must be PascalCased

Outputs:

- **Error Instances**: Throwable CatalystError objects
  - Format: Standard JavaScript Error with additional fields (code, guidance, cause)
  - Serialization: JSON with `{ message, code, guidance, cause, stack }`

## Dependencies

**Feature Dependencies:**

- None (foundational feature)

**External Dependencies:**

- **Node.js >= 18**: Native Error class and stack traces
  - Purpose: Standard error handling
  - Justification: Required by project

**Setup Prerequisites:**

- None

**Integration Points:**

- **All Features**: Will use CatalystError with explicit codes for domain-specific errors
- **Playbook Engine**: Will use error codes for error policy matching (FR-4.11 in playbook-engine spec)
