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

Implement CatalystError class, ErrorAction enum, ErrorPolicyAction interface, and ErrorPolicy interface for comprehensive error handling.

---

## Architecture

- **CatalystError**: Extends Error with code, message, guidance, cause
- **ErrorAction**: String enum (Stop, Suspend, Break, Inquire, Continue, SilentlyContinue, Ignore)
- **ErrorPolicyAction**: Interface with action and optional retryCount
- **ErrorPolicy**: Dictionary with required default and optional per-code overrides

---

## Structure

```
src/playbooks/
  errors.ts             # All error handling code
tests/
  errors.test.ts        # All tests
```

---

## Implementation

1. Create errors.ts with CatalystError class, ErrorAction enum, ErrorPolicyAction and ErrorPolicy interfaces
2. Create tests with 100% coverage

---

## Validation

- CatalystError preserves stack traces and serializes correctly
- ErrorAction enum has all required values
- ErrorPolicy requires default property
- All tests pass with 100% coverage
- Performance: <1ms instantiation, <5ms serialization
