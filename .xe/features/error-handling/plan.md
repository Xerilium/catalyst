---
id: error-handling
title: Error Handling
author: "@flanakin"
description: "Implementation plan for base error classes and utilities for consistent error reporting"
dependencies: []
---

<!-- markdownlint-disable single-title -->

# Implementation Plan: Error Handling

**Spec**: [Feature spec](./spec.md)

---

## Summary

Implement `CatalystError` class with explicit PascalCased error codes. Each error includes code, message, actionable guidance, and optional cause chaining.

---

## Technical Context

**Primary Components**: CatalystError class

**Dependencies**: None

**Performance Goals**: <1ms instantiation, <5ms serialization

**Testing Framework**: Jest, 100% coverage

**Constraints**: <30 lines, no external dependencies

---

## Architecture

CatalystError extends JavaScript Error with: code, message, guidance, cause

---

## Project Structure

```
src/ts/errors/
  base.ts           # CatalystError class
  types.ts          # ErrorPolicy type
  index.ts          # Exports
tests/errors/
  base.test.ts      # CatalystError tests
```

---

## Data Model

- **CatalystError**: message, code, guidance, cause
- **ErrorPolicy**: `string | Record<string, string>`

---

## Contracts

### CatalystError

```typescript
class CatalystError extends Error {
  constructor(message: string, code: string, guidance: string, cause?: Error);
  toJSON(): object;
}
```

**Examples:**

```typescript
throw new CatalystError('Missing email', 'InvalidInput', 'Provide email');
throw new CatalystError('Playbook not found', 'PlaybookNotFound', 'Check ID');
throw new CatalystError('Auth failed', 'GitHubAuthFailed', 'Run: gh auth login', err);
```

---

## Implementation

1. CatalystError class: Extend Error, add code/guidance/cause, preserve stack trace, toJSON()
2. ErrorPolicy type: `string | Record<string, string>`
3. Tests: 100% coverage
