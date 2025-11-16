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

- Provide CatalystError class with explicit, descriptive PascalCased error codes
- Support error cause chaining for debugging
- Ensure all errors provide clear "what happened" and "how to fix" messages

Explicit non-goals:

- Error logging infrastructure (handled by individual features)
- Error monitoring/telemetry (Phase 2+)
- Error recovery/retry logic (feature-specific)

## Scenario

- As a **Framework Developer**, I need to throw errors with specific codes and guidance
  - Outcome: Errors include PascalCased code, message, and actionable guidance

- As a **Developer**, I need to handle specific error scenarios by code
  - Outcome: Error codes can be matched in error policies

- As a **User**, I need clear error messages
  - Outcome: Errors include problem description and fix guidance

- As an **Engineer**, I need to trace error causes
  - Outcome: Errors support cause chaining

## Success Criteria

- Error codes are PascalCased strings (e.g., "InvalidInput", "GitHubAuthFailed")
- Error messages include problem description and fix guidance
- Error cause chaining works
- 100% test coverage

## Design principles

**Fail fast with clear guidance**
> Errors stop execution immediately with specific, actionable messages. Include code, problem description, and fix guidance.

## Requirements

### Functional Requirements

**FR-1**: CatalystError Class

- **FR-1.1**: System MUST provide `CatalystError` class extending JavaScript `Error`
- **FR-1.2**: Constructor MUST accept:
  - `message`: User-facing problem description (required)
  - `code`: PascalCased error code (required, e.g., 'PlaybookNotFound')
  - `guidance`: Actionable fix guidance (required)
  - `cause`: Optional underlying error for chaining
- **FR-1.3**: MUST preserve stack traces
- **FR-1.4**: MUST be JSON serializable (includes code, message, guidance, cause)

### Non-functional requirements

- **NFR-1**: Simplicity
  - CatalystError implementation <30 lines
  - No external dependencies

- **NFR-2**: Performance
  - Error instantiation <1ms
  - Error serialization <5ms

- **NFR-3**: Testability
  - 100% test coverage
  - Deterministic serialization

## Key Entities

- **CatalystError**: Error class
  - Attributes: message, code, guidance, cause
  - Location: `src/ts/errors/base.ts`

- **ErrorPolicy**: Error handling policy type
  - Type: `string | Record<string, string>`
  - Location: `src/ts/errors/types.ts`

Inputs:

- Constructor parameters: message, code, guidance, cause (optional)

Outputs:

- Throwable CatalystError instances
- JSON serialization: `{ message, code, guidance, cause, stack }`

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

- All features use CatalystError with explicit codes
- Playbook engine uses error codes for error policy matching
