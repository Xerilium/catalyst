---
id: playbook-template-engine
title: Playbook Template Engine
author: "@flanakin"
description: "Expression evaluation, path resolution, and script module loading for playbook workflows"
dependencies:
  - error-handling
---

# Feature: Playbook Template Engine

## Problem

Playbooks need dynamic content generation through variable interpolation, expression evaluation, and custom logic execution. Without secure template processing, playbooks cannot access runtime data, make decisions, or transform content safely while preventing code injection vulnerabilities.

## Goals

- Provide secure expression evaluation for playbook templates
- Enable path protocol resolution for referencing files across the project
- Support custom JavaScript functions for complex playbook logic
- Prevent code injection attacks while allowing flexible expressions

## Scenario

- As a **playbook author**, I need to reference variables from previous steps
  - Outcome: `{{variable-name}}` syntax provides simple string interpolation and `${{ get('variable-name') }}` syntax provides safe variable access in code expressions

- As a **playbook author**, I need to load template and context files from standard locations
  - Outcome: Path protocols (`xe://path`, `catalyst://path`) enable clean file references without hardcoded paths

- As a **playbook author**, I need conditional logic based on runtime data
  - Outcome: Expression evaluation enables decisions: `${{ get('count') > 10 && get('approved') }}`

- As a **playbook developer**, I need custom functions for complex transformations
  - Outcome: JavaScript modules auto-load with IntelliSense support in `.js` files

- As a **security engineer**, I need protection against code injection
  - Outcome: Multi-layer security prevents RCE, prototype pollution, and secret leakage

## Success Criteria

- 100% of template expressions evaluate safely without access to Node.js APIs
- Zero code injection vulnerabilities in expression evaluation (no CVE-2025-12735 class bugs)
- Custom JavaScript functions have full IDE IntelliSense support

## Design Principles

**Security by default**
> Template evaluation is sandboxed with no access to Node.js APIs, file system, or network. Expression evaluators must use allowlisted functions only. Secrets are automatically masked in all outputs. This prevents code injection and data exfiltration even if user input reaches templates.

**Explicit over magic**
> Two distinct syntaxes prevent ambiguity: simple interpolation (`{{variable}}`) for string substitution and code expressions (`${{ get('variable') }}`) for JavaScript logic. Within code expressions, the `get()` function is required to access variables. Path protocols are explicit (`xe://`, `catalyst://`) rather than implicit relative paths.

**Developer experience first**
> Complex logic belongs in `.js` files with full IDE support (IntelliSense, debugging, testing), not inline strings. Auto-loading conventions eliminate boilerplate while maintaining discoverability.

## Requirements

### Functional Requirements

**FR-1**: Template Syntax and Expression Evaluation

- **FR-1.1**: System MUST support two template syntaxes:
  - **FR-1.1.1**: Simple variable interpolation: `{{variable-name}}` for direct string substitution
  - **FR-1.1.2**: JavaScript expressions: `${{ expression }}` for evaluated code blocks

- **FR-1.2**: Simple variable interpolation (`{{variable-name}}`) MUST:
  - **FR-1.2.1**: Resolve to the value of the named variable from execution context
  - **FR-1.2.2**: Support kebab-case variable names: `{{feature-name}}`
  - **FR-1.2.3**: Support dot notation for nested properties: `{{issue.body}}` or `{{pr-info.head.ref}}`
  - **FR-1.2.4**: Return the value (not converted to string) when used standalone
  - **FR-1.2.5**: Throw `PlaybookVariableNotFound` if variable not found in context
  - **FR-1.2.6**: Be usable in conditionals for truthiness checks: `if: {{variable}}`
  - **FR-1.2.7**: Be usable in any string value or expression context within playbook YAML

- **FR-1.3**: JavaScript expressions (`${{ expression }}`) MUST support:
  - **FR-1.3.1**: Variable access via `get()` function: `${{ get('variable-name') }}`
  - **FR-1.3.2**: Boolean expressions: `${{ get('x') > 10 && get('y') < 20 }}`
  - **FR-1.3.3**: Mathematical operations: `${{ (get('a') + get('b')) * get('c') }}`
  - **FR-1.3.4**: String operations: `${{ get('text').toUpperCase() }}`
  - **FR-1.3.5**: Function calls: `${{ validateInput(get('pr-number'), get('labels')) }}`
  - **FR-1.3.6**: Ternary operators: `${{ get('mode') === 'pr' ? 'pull-request' : 'manual' }}`
  - **FR-1.3.7**: Logical negation: `${{ !get('force') }}`
  - **FR-1.3.8**: Method chaining: `${{ get('text').toLowerCase().includes('keyword') }}`
  - **FR-1.3.9**: MUST contain valid JavaScript only - `{{}}` syntax is NOT allowed inside `${{ }}`

- **FR-1.4**: Template expressions MUST be evaluated during step configuration interpolation
- **FR-1.5**: Expressions MUST NOT execute during playbook load time (only at runtime)
- **FR-1.6**: Invalid expressions MUST fail fast with clear syntax error messages
- **FR-1.7**: Whitespace around expression delimiters SHOULD be flexible:
  - Both `${{expression}}` and `${{ expression }}` are valid
  - Both `{{variable}}` and `{{ variable }}` are valid

**FR-2**: Context Access via `get()` Function

- **FR-2.1**: System MUST provide `get(variableName)` function in JavaScript expression contexts (`${{ }}`)
  - Parameter: `variableName` (string) - Variable name in kebab-case
  - Returns: Variable value from execution context
  - Throws: `PlaybookVariableNotFound` if variable not found in context

- **FR-2.2**: `get()` function MUST accept kebab-case variable names
  - Example: `get('feature-name')`, `get('pr-number')`

- **FR-2.3**: `get()` function MUST support dot notation for nested property access
  - Syntax: `get('variable').property.subProperty`
  - Example: `get('issue').body`, `get('pr-info').head.ref`

- **FR-2.4**: `get()` function MUST access variables from playbook inputs and context variables (including named step results)

**FR-3**: JavaScript Module Loading

- **FR-3.1**: System MUST support JavaScript modules alongside playbooks

  - **FR-3.1.1**: When executing `{playbook-name}.yaml`, if `{playbook-name}.js` exists in same directory, it MUST be auto-loaded
  - **FR-3.1.2**: All functions exported from module MUST be available in expression context
  - **FR-3.1.3**: Module loading MUST occur before playbook execution starts
  - **FR-3.1.4**: Module loading errors MUST prevent playbook execution with clear error message

- **FR-3.2**: Module functions MUST be callable from expressions:

  ```yaml
  steps:
    - if: ${{ simpleValidation(get('pr-number'), get('labels')) }}
  ```

**FR-4**: Path Protocol Resolution

- **FR-4.1**: System MUST resolve path protocols in all string values before action execution

  - **FR-4.1.1**: `xe://path` MUST resolve to `.xe/path` relative to repository root
  - **FR-4.1.2**: `catalyst://path` MUST resolve to `node_modules/@xerilium/catalyst/path` relative to NPM package root
  - **FR-4.1.3**: File extensions MUST be auto-detected when not specified:
    - If `.md` file exists, use it (default)
    - If `.json` file exists, use it (fallback)
    - Otherwise use path as-is
  - **FR-4.1.4**: Protocol resolution MUST occur before template expression evaluation

- **FR-4.2**: Path protocol resolution order MUST be:
  1. Resolve path protocols (`xe://`, `catalyst://`)
  2. Evaluate template expressions (`{{}}` and `${{ }}`)
  3. Pass resolved strings to actions

- **FR-4.3**: Path protocols MUST support use in:
  - File paths: `file-read: xe://features/my-feature/spec.md`
  - Simple variable interpolation: `"{{xe://product}}"`
  - JavaScript expressions: `${{ get('xe://features/blueprint/research') }}`
  - AI prompt context: References to context and template files

- **FR-4.4**: Path protocols in conditional expressions:
  - **FR-4.4.1**: When used in simple interpolation within conditionals, path protocols resolve to file content
  - **FR-4.4.2**: File existence checks use `get()` function: `${{ get('xe://rollouts/rollout-blueprint') }}`
  - **FR-4.4.3**: Non-existent files return `undefined` allowing conditional checks: `if-not: ${{ get('xe://path') }}`

**FR-5**: Expression Evaluation Security

- **FR-5.1**: Expression evaluator MUST provide sandboxed execution:

  - **FR-5.1.1**: NO access to Node.js APIs (`require`, `process`, `fs`, `child_process`, etc.)
  - **FR-5.1.2**: NO access to global objects (`global`, `globalThis`, `window`)
  - **FR-5.1.3**: NO ability to execute arbitrary code via `eval()`, `Function()`, or similar
  - **FR-5.1.4**: NO access to prototype chain (`__proto__`, `constructor`, `prototype`)

- **FR-5.2**: Expression evaluator MUST use function allow-listing:

  - **FR-5.2.1**: Only explicitly registered functions MAY be callable
  - **FR-5.2.2**: Built-in safe functions MUST be allowlisted: `Math.*`, `String.*`, `Array.*`, `Object.keys`, `Object.values`
  - **FR-5.2.3**: Custom functions from JavaScript modules MUST be explicitly registered
  - **FR-5.2.4**: Functions passed in context MUST be rejected (CVE-2025-12735 mitigation)

- **FR-5.3**: Expression evaluation MUST enforce timeout limits:
  - **FR-5.3.1**: Maximum execution time: 10 seconds per expression
  - **FR-5.3.2**: Timeout MUST throw `ExpressionTimeoutError` and halt execution
  - **FR-5.3.3**: Infinite loops MUST be prevented via timeout

**FR-6**: JavaScript Module Sandboxing

- **FR-6.1**: JavaScript modules MUST execute in isolated environment

  - **FR-6.1.1**: Modules MUST NOT have access to Node.js file system APIs
  - **FR-6.1.2**: Modules MUST NOT have access to Node.js network APIs
  - **FR-6.1.3**: Modules MUST NOT have access to `process` or environment variables
  - **FR-6.1.4**: Module execution MUST timeout after 30 seconds
  - **FR-6.1.5**: Module memory usage MUST be limited to 50 MB

- **FR-6.2**: Module syntax errors MUST prevent playbook execution:
  - **FR-6.2.1**: Parse errors MUST show clear error with line/column
  - **FR-6.2.2**: Runtime errors in module functions MUST propagate with stack trace
  - **FR-6.2.3**: Missing module file MUST be treated as non-error (module is optional)

**FR-7**: Secret Masking

- **FR-7.1**: System MUST provide `SecretManager` interface with the following methods:
  - `register(name: string, value: string): void` - Register a secret for masking
    - Parameter: `name` - Secret identifier (e.g., 'GITHUB_TOKEN')
    - Parameter: `value` - Secret value to mask
  - `mask(text: string): string` - Mask all registered secrets in text
    - Parameter: `text` - Text potentially containing secrets
    - Returns: Text with secrets replaced by `[SECRET:name]`
  - `resolve(name: string): string` - Resolve secret value by name (use carefully!)
    - Parameter: `name` - Secret identifier
    - Returns: Secret value
    - Throws: Error if secret not found

- **FR-7.2**: System MUST mask secrets in all outputs:
  - **FR-7.2.1**: Secrets MUST be registered before playbook execution
  - **FR-7.2.2**: All log messages MUST have secrets replaced with `[SECRET:name]`
  - **FR-7.2.3**: All state snapshots MUST have secrets redacted
  - **FR-7.2.4**: All error messages MUST have secrets masked

- **FR-7.3**: Secrets MUST be stored encrypted at rest
- **FR-7.4**: Secrets MUST never appear in plaintext in state files or logs

**FR-8**: Template Engine Interface

- **FR-8.1**: System MUST provide `TemplateEngine` interface with the following methods:
  - `interpolate(template: string, context: ExecutionContext): Promise<string>` - Interpolate template with execution context
    - Parameter: `template` - Template string with `{{}}` or `${{}}` expressions
    - Parameter: `context` - Execution context variables
    - Returns: Resolved string
    - Throws: `InvalidStringTemplate` on evaluation failure for template strings with `{{}}`
    - Throws: `InvalidExpressionTemplate` on evaluation failure for `${{}}` expressions
    - Supports: Both `{{variable}}` and `${{ expression }}` syntaxes
  - `interpolateObject<T>(obj: T, context: ExecutionContext): Promise<T>` - Interpolate all string values in object recursively
    - Parameter: `obj` - Object with template strings
    - Parameter: `context` - Execution context variables
    - Returns: Object with resolved strings
    - Processes: Both simple variable and JavaScript expression templates
  - `loadModule(playbookPath: string): Promise<Record<string, Function> | undefined>` - Load JavaScript module for playbook
    - Parameter: `playbookPath` - Path to playbook YAML file
    - Returns: Module exports or `undefined` if no module exists
  - `registerSecret(name: string, value: string): void` - Register secret for masking
    - Parameter: `name` - Secret name
    - Parameter: `value` - Secret value

### Non-functional Requirements

**NFR-1**: Performance

- **NFR-1.1**: Simple expression evaluation MUST complete in <2ms
- **NFR-1.2**: Path protocol resolution MUST complete in <1ms per path
- **NFR-1.3**: Module loading MUST complete in <100ms per module
- **NFR-1.4**: Template interpolation overhead MUST be <1% of total playbook execution time

**NFR-2**: Security

- **NFR-2.1**: Expression evaluator MUST be patched against CVE-2025-12735 class vulnerabilities
- **NFR-2.2**: Sandbox escapes MUST be impossible via expression evaluation
- **NFR-2.3**: Prototype pollution attacks MUST be prevented via context sanitization
- **NFR-2.4**: Secret masking MUST be applied before any external output (logs, APIs, state)
- **NFR-2.5**: JavaScript modules MUST execute in isolated environment (no host escape)

**NFR-3**: Reliability

- **NFR-3.1**: Expression evaluation errors MUST provide clear, actionable messages
- **NFR-3.2**: Timeout enforcement MUST prevent infinite loops or hangs
- **NFR-3.3**: Module loading failures MUST not crash engine (graceful degradation)
- **NFR-3.4**: Template interpolation MUST be deterministic (same input → same output)

**NFR-4**: Testability

- **NFR-4.1**: All components MUST be unit testable with mock contexts
- **NFR-4.2**: Security features MUST have dedicated test suite (injection attempts)
- **NFR-4.3**: 100% coverage for secret masking logic
- **NFR-4.4**: 100% coverage for context sanitization

**NFR-5**: Developer Experience

- **NFR-5.1**: JavaScript modules MUST support TypeScript for type safety
- **NFR-5.2**: Error messages MUST include line numbers for debugging
- **NFR-5.3**: VS Code MUST provide IntelliSense in `.js` module files
- **NFR-5.4**: Common errors MUST suggest fixes (e.g., "Did you forget to call get('variable')?")

## Key Entities

**Entities owned by this feature:**

- **TemplateEngine**: Core service for expression evaluation and interpolation
  - Handles simple variable interpolation (`{{variable}}`) for string substitution
  - Handles JavaScript expression evaluation (`${{ expression }}`) for code blocks
  - Resolves path protocols (`xe://`, `catalyst://`)
  - Loads JavaScript modules automatically
  - Masks secrets in outputs

- **SecretManager**: Manages secret registration and masking
  - Stores secret values securely
  - Masks secrets in text outputs
  - Provides secret resolution for actions

**Entities from other features:**

- **ExecutionContext** (playbook-definition): Runtime context with variables
- **CatalystError** (error-handling): Base error class for template errors

## Dependencies

**Internal:**
- **error-handling** (Tier 1.1): Provides error handling framework

**External:**
- **Expression Evaluator**: Library providing safe expression evaluation
  - Must meet security requirements (NFR-2)
  - Recommended: expr-eval-fork v3.0.0+ (CVE-2025-12735 patched)
- **JavaScript Sandbox**: Isolated execution environment for modules
  - Recommended: QuickJS via WebAssembly
  - Alternative: isolated-vm
- **Node.js >= 18**: ES module support, native TypeScript

## Integration Points

- **playbook-engine**: Uses template engine for step configuration interpolation
- **playbook-actions-***: Action configurations pass through template interpolation
- **VS Code**: JavaScript modules get full IDE support (IntelliSense, debugging)

## Examples

### Simple Variable Interpolation

```typescript
// Template interpolation with {{variable}} syntax
const template = 'Feature: {{feature-name}}';
const context = { 'feature-name': 'playbook-engine' };
const result = await engine.interpolate(template, context);
// Returns: "Feature: playbook-engine"

// Nested property access with dot notation
const template2 = 'Branch: {{pr-info.head.ref}}';
const context2 = {
  'pr-info': {
    head: { ref: 'feature/auth' }
  }
};
const result2 = await engine.interpolate(template2, context2);
// Returns: "Branch: feature/auth"
```

### JavaScript Expressions

```typescript
// Boolean expression in condition
const condition = "${{ get('pr-number') > 0 && get('labels').includes('approved') }}";
const context = {
  'pr-number': 123,
  labels: ['approved', 'ready']
};
const result = await engine.interpolate(condition, context);
// Returns: true

// String comparison - valid JavaScript only
const condition2 = "${{ get('confirmation-mode') == 'pull-request' }}";
const context2 = { 'confirmation-mode': 'pull-request' };
const result2 = await engine.interpolate(condition2, context2);
// Returns: true

// Logical negation
const condition3 = "${{ !get('force') }}";
const context3 = { force: false };
const result3 = await engine.interpolate(condition3, context3);
// Returns: true

// CRITICAL: {{}} inside ${{}} is NOT allowed
// ❌ INVALID: "${{ {{variable}} > 0 }}"
// ✅ VALID: "${{ get('variable') > 0 }}"
```

### Custom JavaScript Functions

**`update-pr.js`:**
```javascript
/**
 * Validate PR meets merge criteria
 */
export function validatePR(prNumber, labels) {
  return prNumber > 0 && labels.includes('approved');
}

/**
 * Calculate priority score
 */
export function calculatePriority(urgency, impact) {
  return urgency * 2 + impact;
}

/**
 * Format GitHub comment
 */
export function formatComment(action, details) {
  return `✅ **${action}**\n\n${JSON.stringify(details, null, 2)}`;
}
```

**Usage:**
```typescript
// Auto-load module
const functions = await engine.loadModule('/path/to/update-pr.yaml');
// Returns: { validatePR, calculatePriority, formatComment }

// Call custom function in expression
const condition = "${{ validatePR(get('pr-number'), get('labels')) }}";
const context = { 'pr-number': 123, labels: ['approved'] };
const result = await engine.interpolate(condition, context);
// Returns: true

// Compute value with function
const priorityExpr = "${{ calculatePriority(10, 5) }}";
const priority = await engine.interpolate(priorityExpr, {});
// Returns: 25
```

### Path Protocol Resolution

```typescript
// Path protocols in template strings
const template = '{{xe://product}}';
const result = await engine.interpolate(template, {});
// Returns: "/Users/user/project/.xe/product.md" (file content or path)

// Multiple protocols
const config = {
  spec: '{{xe://features/my-feature/spec}}',
  template: '{{catalyst://templates/specs/spec}}',
  product: '{{xe://product}}'
};
const result = await engine.interpolateObject(config, {});
// Returns: {
//   spec: "/path/to/.xe/features/my-feature/spec.md",
//   template: "/path/to/node_modules/@xerilium/catalyst/templates/specs/spec.md",
//   product: "/path/to/.xe/product.md"
// }
```
