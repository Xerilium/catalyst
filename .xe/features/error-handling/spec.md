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

- Provide base error classes for common error scenarios across all features
- Enable features to throw typed errors with error codes and actionable guidance
- Support error cause chaining for debugging complex failures
- Ensure all errors provide clear "what happened" and "how to fix" messages

Explicit non-goals:

- Error logging infrastructure (handled by individual features)
- Error monitoring/telemetry (Phase 2+)
- Error recovery/retry logic (feature-specific)

## Scenario

- As a **Framework Developer**, I need to throw errors with specific error codes and guidance messages
  - Outcome: Errors include error code, user-facing message, and actionable guidance

- As a **Developer**, I need to catch and handle specific error types (auth errors vs validation errors)
  - Outcome: Error types are distinguishable via instanceof checks

- As a **User**, I need clear error messages that tell me what went wrong and how to fix it
  - Outcome: All errors include both problem description and fix guidance

- As a **Engineer**, I need to trace error causes through multiple layers
  - Outcome: Errors support cause chaining (error.cause) for debugging

## Success Criteria

- All features use CatalystError or its subclasses for error handling
- Error messages include both "what happened" and "how to fix" guidance
- Error types are distinguishable via instanceof checks
- Error cause chaining works for nested errors
- Zero features implement custom error base classes

## Design principles

**Fail fast with clear guidance**
> Errors stop execution immediately with specific, actionable messages. Never silently continue. Messages include error code, problem description, and fix guidance.

**Convention over configuration**
> Standard error types cover common scenarios. Features extend CatalystError only for domain-specific errors.

## Requirements

### Functional Requirements

**FR-1**: Base Error Class

- **FR-1.1**: System MUST provide `CatalystError` base class extending JavaScript `Error`
- **FR-1.2**: `CatalystError` MUST include:
  - `message`: User-facing problem description
  - `code`: Machine-readable error code (e.g., 'AUTH_FAILED', 'NOT_FOUND')
  - `guidance`: Actionable fix guidance for user
  - `cause`: Optional underlying error (for chaining)
- **FR-1.3**: `CatalystError` MUST preserve stack traces for debugging
- **FR-1.4**: `CatalystError` MUST be JSON serializable for logging

**FR-2**: Common Error Types

- **FR-2.1**: System MUST provide `ValidationError` for input validation failures
- **FR-2.2**: System MUST provide `NotFoundError` for missing resources
- **FR-2.3**: System MUST provide `AuthError` for authentication/authorization failures
- **FR-2.4**: System MUST provide `NetworkError` for connection/timeout failures
- **FR-2.5**: System MUST provide `ConfigError` for configuration problems

### Non-functional requirements

- **NFR-1**: Simplicity
  - **NFR-1.1**: Error classes MUST be <50 lines each
  - **NFR-1.2**: No external dependencies beyond Node.js built-ins

- **NFR-2**: Performance
  - **NFR-2.1**: Error instantiation MUST complete in <1ms
  - **NFR-2.2**: Error formatting MUST complete in <5ms

- **NFR-3**: Testability
  - **NFR-3.1**: 100% test coverage for all error classes
  - **NFR-3.2**: Error serialization MUST be deterministic

## Key Entities

Entities owned by this feature:

- **CatalystError**: Base error class with code and guidance
  - Attributes: message (string), code (string), guidance (string), cause (Error | null)
  - Location: `src/playbooks/scripts/errors/base.ts`

- **ValidationError**: Input validation failure
  - Attributes: inherits CatalystError, code='VALIDATION_ERROR'
  - Location: `src/playbooks/scripts/errors/validation.ts`

- **NotFoundError**: Resource not found
  - Attributes: inherits CatalystError, code='NOT_FOUND'
  - Location: `src/playbooks/scripts/errors/not-found.ts`

- **AuthError**: Authentication/authorization failure
  - Attributes: inherits CatalystError, code='AUTH_FAILED'
  - Location: `src/playbooks/scripts/errors/auth.ts`

- **NetworkError**: Network/connection failure
  - Attributes: inherits CatalystError, code='NETWORK_ERROR'
  - Location: `src/playbooks/scripts/errors/network.ts`

- **ConfigError**: Configuration problem
  - Attributes: inherits CatalystError, code='CONFIG_ERROR'
  - Location: `src/playbooks/scripts/errors/config.ts`

Inputs:

- **Error Data**: Message, code, guidance, optional cause
  - Format: Constructor parameters
  - Validation: Message and guidance must be non-empty strings

Outputs:

- **Error Instances**: Throwable error objects
  - Format: Standard JavaScript Error objects
  - Serialization: JSON with all fields

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

- **All Features**: Will extend CatalystError for domain-specific errors
- **Logging**: Features will use formatError() for consistent logging
