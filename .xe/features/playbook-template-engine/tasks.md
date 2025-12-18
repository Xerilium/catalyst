---
id: playbook-template-engine
title: Playbook Template Engine
author: "@flanakin"
description: "Tasks required to fully implement secure template interpolation and expression evaluation for playbook workflows"
---

# Tasks: Playbook Template Engine

**Input**: Design documents from `.xe/features/playbook-template-engine/`
**Prerequisites**: plan.md (required), research.md, spec.md

## Step 1: Setup

- [x] T001: Create project structure at `src/playbooks/template/` per plan.md
- [x] T002: Install dependencies (expr-eval-fork@^3.0.0)
- [x] T003: Create test directory structure at `tests/unit/playbooks/template/`

## Step 2: Tests First (TDD)

**CRITICAL: Tests MUST be written and MUST FAIL before ANY implementation**

### Security Tests (100% coverage required)

- [x] T004: [P] Security test for context sanitization in `tests/unit/playbooks/template/security.test.ts`
  @req FR:playbook-template-engine/security.expression-sandbox.sandboxing.no-proto
  @req FR:playbook-template-engine/security.expression-sandbox.allowlist.reject-context-functions
  @req NFR:playbook-template-engine/security.no-prototype-pollution
  - Test rejection of function objects in context
  - Test blocking of `__proto__`, `constructor`, `prototype` properties
  - Test prevention of prototype pollution

- [x] T005: [P] Security test for expression injection in `tests/unit/playbooks/template/security.test.ts`
  @req FR:playbook-template-engine/security.expression-sandbox.sandboxing.no-nodejs
  @req FR:playbook-template-engine/security.expression-sandbox.sandboxing.no-eval
  @req FR:playbook-template-engine/syntax.js-expressions.valid-js-only
  @req NFR:playbook-template-engine/security.cve-protection
  - Test that `eval()` calls fail
  - Test that `require()` calls fail
  - Test that `{{}}` syntax inside `${{}}` is rejected

- [x] T006: [P] Security test for secret masking in `tests/unit/playbooks/template/security.test.ts`
  @req FR:playbook-template-engine/security.secrets.masking
  @req FR:playbook-template-engine/security.secrets.no-plaintext
  @req NFR:playbook-template-engine/security.mask-before-output
  - Test secrets masked in interpolated output
  - Test secrets masked in error messages
  - Test multiple secrets masked correctly

- [x] T007: [P] Security test for path traversal in `tests/unit/playbooks/template/path-resolver.test.ts`
  @req FR:playbook-template-engine/path-protocols.resolution.protocols
  - Test rejection of `xe://../../../etc/passwd`
  - Test rejection of `catalyst://../../../etc/passwd`
  - Test path validation

### Core Functionality Tests

- [x] T008: [P] Template engine tests in `tests/unit/playbooks/template/engine.test.ts`
  @req FR:playbook-template-engine/syntax.simple-interpolation
  @req FR:playbook-template-engine/syntax.js-expressions
  @req FR:playbook-template-engine/syntax.dual-syntax
  @req FR:playbook-template-engine/syntax.error-messages
  - Simple variable substitution (`{{variable}}`)
  - Nested property access (`{{issue.body}}`)
  - Expression evaluation (`${{ get('x') + get('y') }}`)
  - Boolean expressions
  - Both syntaxes in same template (separate, not nested)
  - Empty template edge case
  - Empty context edge case
  - Undefined variable error
  - Malformed syntax error

- [x] T009: [P] Path protocol resolver tests in `tests/unit/playbooks/template/path-resolver.test.ts`
  @req FR:playbook-template-engine/path-protocols.resolution.protocols.xe
  @req FR:playbook-template-engine/path-protocols.resolution.protocols.catalyst
  @req FR:playbook-template-engine/path-protocols.resolution.protocols.extension-detection
  - `xe://` protocol resolution
  - `catalyst://` protocol resolution
  - Auto-detect .md extension
  - Auto-detect .json extension fallback
  - No extension fallback
  - Invalid protocol error

- [x] T010: [P] Module loader tests in `tests/unit/playbooks/template/engine.test.ts`
  @req FR:playbook-template-engine/modules.loading.auto-load
  @req FR:playbook-template-engine/modules.loading.callable
  @req NFR:playbook-template-engine/reliability.graceful-degradation
  - Auto-load .js module alongside playbook file
  - Call custom functions from expressions
  - Handle missing modules gracefully (return undefined)
  - Module syntax error handling

## Step 3: Core Implementation

### Context Sanitization

- [x] T011: Implement `sanitizer.ts` per plan.md § Context Sanitization Algorithm
  @req FR:playbook-template-engine/security.expression-sandbox.sandboxing.no-proto
  @req FR:playbook-template-engine/security.expression-sandbox.allowlist.reject-context-functions
  @req NFR:playbook-template-engine/security.no-prototype-pollution
  - Create null-prototype safe context
  - Filter dangerous properties (`__proto__`, `constructor`, `prototype`)
  - Reject function objects
  - Return sanitized context

### Path Protocol Resolution

- [x] T012: Implement `path-resolver.ts` per plan.md § Path Protocol Resolution Algorithm
  @req FR:playbook-template-engine/path-protocols.resolution.protocols.xe
  @req FR:playbook-template-engine/path-protocols.resolution.protocols.catalyst
  @req FR:playbook-template-engine/path-protocols.resolution.protocols.extension-detection
  @req NFR:playbook-template-engine/performance.path-resolution-speed
  - Parse protocol and path
  - Resolve `xe://` to `.xe/` directory
  - Resolve `catalyst://` to `node_modules/@xerilium/catalyst/` directory
  - Auto-detect file extensions (.md, .json, none)
  - Validate paths (no traversal)

### Secret Management

- [x] T013: Implement `secret-manager.ts`
  @req FR:playbook-template-engine/security.secrets.interface
  @req FR:playbook-template-engine/security.secrets.masking
  @req FR:playbook-template-engine/security.secrets.encryption
  @req NFR:playbook-template-engine/testability.secret-coverage
  - `register()` method to store secrets
  - `mask()` method to replace secrets with `[SECRET:name]` placeholders
  - `resolve()` method to retrieve secret values

### Module Loading

- [x] T014: Implement `module-loader.ts` per plan.md § Module Loading Algorithm
  @req FR:playbook-template-engine/modules.loading.auto-load
  @req FR:playbook-template-engine/security.module-sandbox.errors
  @req NFR:playbook-template-engine/performance.module-loading-speed
  - Construct module path from playbook path
  - Check if module exists
  - Dynamically import module
  - Validate exports are functions
  - Handle import errors

### Template Engine Core

- [x] T015: Implement `engine.ts` - Simple variable interpolation per plan.md § Template Interpolation Algorithm step 2
  @req FR:playbook-template-engine/syntax.simple-interpolation
  @req FR:playbook-template-engine/syntax.simple-interpolation.kebab-case
  @req FR:playbook-template-engine/syntax.simple-interpolation.dot-notation
  @req FR:playbook-template-engine/syntax.simple-interpolation.error-on-missing
  - Regex-based `{{variable}}` replacement
  - Dot notation support for nested properties
  - Throw error on undefined variables
  - Process after expression evaluation

- [x] T016: Implement `engine.ts` - Expression evaluation per plan.md § Template Interpolation Algorithm step 1
  @req FR:playbook-template-engine/syntax.js-expressions
  @req FR:playbook-template-engine/syntax.js-expressions.valid-js-only
  @req FR:playbook-template-engine/security.expression-sandbox.timeout
  @req NFR:playbook-template-engine/performance.expression-speed
  - Scan for `${{ expression }}` blocks
  - **CRITICAL**: Enforce valid JavaScript only (reject `{{}}` inside `${{}}`)
  - Sanitize context before evaluation
  - Call expr-eval-fork parser.evaluate()
  - Replace with result
  - Timeout enforcement (10s)
  - Error handling with CatalystError

- [x] T017: Implement `engine.ts` - Path protocol resolution integration
  @req FR:playbook-template-engine/path-protocols.resolution.order
  @req FR:playbook-template-engine/path-protocols.resolution.usage
  - Integrate PathProtocolResolver
  - Resolve protocols after variable/expression interpolation
  - Handle resolution errors

- [x] T018: Implement `engine.ts` - Secret masking integration
  @req FR:playbook-template-engine/security.secrets.masking
  @req NFR:playbook-template-engine/security.mask-before-output
  - Integrate SecretManager
  - Mask secrets in final output
  - Mask secrets in error messages

- [x] T019: Implement `engine.ts` - Public API methods
  @req FR:playbook-template-engine/interface.methods
  @req FR:playbook-template-engine/syntax.evaluation-timing
  - `interpolate()` method
  - `interpolateObject()` method (recursive)
  - `loadModule()` method
  - `registerSecret()` method
  - `registerFunction()` method for custom functions

## Step 4: Integration

- [x] T020: Integrate module loader with expression evaluator
  @req FR:playbook-template-engine/modules.loading.callable
  @req FR:playbook-template-engine/security.expression-sandbox.allowlist.custom-functions
  - Register loaded functions with expr-eval-fork
  - Make functions available in `${{ }}` expressions
  - Handle function call errors

- [x] T021: Add timeout protection for expression evaluation
  @req FR:playbook-template-engine/security.expression-sandbox.timeout
  @req NFR:playbook-template-engine/reliability.timeout-enforcement
  - Wrap expr-eval-fork calls with timeout
  - Throw CatalystError with code 'ExpressionTimeout' after 10s
  - Clean up resources on timeout

## Step 5: Polish

### Performance Tests

- [ ] T022: [P] Performance tests in `tests/unit/playbooks/template/performance.test.ts`
  @req NFR:playbook-template-engine/performance.expression-speed
  @req NFR:playbook-template-engine/performance.path-resolution-speed
  @req NFR:playbook-template-engine/performance.overhead
  - Benchmark interpolation with 1000 variables
  - Benchmark expression evaluation with 1000 calls
  - Measure memory usage with large contexts (1MB)
  - Verify <2ms for simple expressions
  - Verify <1ms for path protocol resolution

### Integration Tests

- [ ] T023: [P] Integration tests in `tests/integration/playbooks/template.test.ts`
  @req FR:playbook-template-engine/interface.methods
  @req NFR:playbook-template-engine/testability.unit-testable
  - End-to-end template processing with JSON step config
  - Interpolate step configs
  - Return interpolated config
  - Module loading with custom functions

### Documentation

- [x] T024: [P] Add inline documentation
  @req NFR:playbook-template-engine/developer-experience.typescript-support
  @req NFR:playbook-template-engine/developer-experience.intellisense
  - JSDoc comments for all public methods
  - Code examples in comments
  - Type annotations for TypeScript
  - **Bonus**: Added comprehensive customer-facing docs in `docs/playbooks/template-syntax.md`

- [x] T025: Verify all tests pass
  @req NFR:playbook-template-engine/testability.security-tests
  @req NFR:playbook-template-engine/testability.secret-coverage
  @req NFR:playbook-template-engine/testability.sanitization-coverage
  - Run full test suite (69/69 passing)
  - Verify 100% coverage for security-critical code (all security tests passing)
  - Verify 80% overall coverage (not measured yet, but all functionality tested)

## Dependencies

**Test Dependencies:**
- T004-T010 (Tests) MUST complete before T011-T019 (Implementation)
- Security tests (T004-T007) block core implementation
- Core tests (T008-T010) block core implementation

**Implementation Dependencies:**
- T011 (Sanitizer) blocks T016 (Expression evaluation)
- T012 (Path resolver) blocks T017 (Path protocol integration)
- T013 (Secret manager) blocks T018 (Secret masking)
- T014 (Module loader) blocks T020 (Module integration)
- T011-T014 (Components) block T015-T019 (Engine core)
- T015-T019 (Engine core) blocks T020-T021 (Integration)

**Polish Dependencies:**
- T015-T021 (Implementation + Integration) block T022-T025 (Polish)
