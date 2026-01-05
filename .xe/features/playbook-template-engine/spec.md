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

**FR:syntax**: Template Syntax and Expression Evaluation

- **FR:syntax.dual**: System MUST support two template syntaxes:
  - **FR:syntax.dual.simple**: Simple variable interpolation: `{{variable-name}}` for direct string substitution
  - **FR:syntax.dual.js**: JavaScript expressions: `${{ expression }}` for evaluated code blocks

- **FR:syntax.simple**: Simple variable interpolation (`{{variable-name}}`) MUST:
  - **FR:syntax.simple.resolve**: Resolve to the value of the named variable from execution context
  - **FR:syntax.simple.kebab**: Support kebab-case variable names: `{{feature-name}}`
  - **FR:syntax.simple.dot**: Support dot notation for nested properties: `{{issue.body}}` or `{{pr-info.head.ref}}`
  - **FR:syntax.simple.preserve**: Return the value (not converted to string) when used standalone
  - **FR:syntax.simple.error**: Throw `PlaybookVariableNotFound` if variable not found in context
  - **FR:syntax.simple.conditional**: Be usable in conditionals for truthiness checks: `if: {{variable}}`
  - **FR:syntax.simple.yaml**: Be usable in any string value or expression context within playbook YAML

- **FR:syntax.js**: JavaScript expressions (`${{ expression }}`) MUST support:
  - **FR:syntax.js.get**: Variable access via `get()` function: `${{ get('variable-name') }}`
  - **FR:syntax.js.boolean**: Boolean expressions: `${{ get('x') > 10 && get('y') < 20 }}`
  - **FR:syntax.js.math**: Mathematical operations: `${{ (get('a') + get('b')) * get('c') }}`
  - **FR:syntax.js.string**: String operations: `${{ get('text').toUpperCase() }}`
  - **FR:syntax.js.function**: Function calls: `${{ validateInput(get('pr-number'), get('labels')) }}`
  - **FR:syntax.js.ternary**: Ternary operators: `${{ get('mode') === 'pr' ? 'pull-request' : 'manual' }}`
  - **FR:syntax.js.negation**: Logical negation: `${{ !get('force') }}`
  - **FR:syntax.js.chaining**: Method chaining: `${{ get('text').toLowerCase().includes('keyword') }}`
  - **FR:syntax.js.valid**: MUST contain valid JavaScript only - `{{}}` syntax is NOT allowed inside `${{ }}`

- **FR:syntax.timing**: Template expressions MUST be evaluated during step configuration interpolation
- **FR:syntax.runtime**: Expressions MUST NOT execute during playbook load time (only at runtime)
- **FR:syntax.errors**: Invalid expressions MUST fail fast with clear syntax error messages
- **FR:syntax.whitespace**: Whitespace around expression delimiters SHOULD be flexible:
  - Both `${{expression}}` and `${{ expression }}` are valid
  - Both `{{variable}}` and `{{ variable }}` are valid

**FR:context**: Context Access via `get()` Function

- **FR:context.interface**: System MUST provide `get(variableName)` function in JavaScript expression contexts (`${{ }}`)
  - Parameter: `variableName` (string) - Variable name in kebab-case
  - Returns: Variable value from execution context
  - Throws: `PlaybookVariableNotFound` if variable not found in context

- **FR:context.kebab**: `get()` function MUST accept kebab-case variable names
  - Example: `get('feature-name')`, `get('pr-number')`

- **FR:context.dot**: `get()` function MUST support dot notation for nested property access
  - Syntax: `get('variable').property.subProperty`
  - Example: `get('issue').body`, `get('pr-info').head.ref`

- **FR:context.sources**: `get()` function MUST access variables from playbook inputs and context variables (including named step results)

**FR:modules**: JavaScript Module Loading

- **FR:modules.autoload**: System MUST support JavaScript modules alongside playbooks

  - **FR:modules.autoload.naming**: When executing `{playbook-name}.yaml`, if `{playbook-name}.js` exists in same directory, it MUST be auto-loaded
  - **FR:modules.autoload.exports**: All functions exported from module MUST be available in expression context
  - **FR:modules.autoload.timing**: Module loading MUST occur before playbook execution starts
  - **FR:modules.autoload.errors**: Module loading errors MUST prevent playbook execution with clear error message

- **FR:modules.callable**: Module functions MUST be callable from expressions:

  ```yaml
  steps:
    - if: ${{ simpleValidation(get('pr-number'), get('labels')) }}
  ```

**FR:paths**: Path Protocol Resolution

- **FR:paths.protocols**: System MUST resolve path protocols in all string values before action execution

  - **FR:paths.protocols.xe**: `xe://path` MUST resolve to `.xe/path` relative to repository root
  - **FR:paths.protocols.catalyst**: `catalyst://path` MUST resolve to `node_modules/@xerilium/catalyst/path` relative to NPM package root
  - **FR:paths.protocols.extension**: File extensions MUST be auto-detected when not specified:
    - If `.md` file exists, use it (default)
    - If `.json` file exists, use it (fallback)
    - Otherwise use path as-is
  - **FR:paths.protocols.timing**: Protocol resolution MUST occur before template expression evaluation

- **FR:paths.order**: Path protocol resolution order MUST be:
  1. Resolve path protocols (`xe://`, `catalyst://`)
  2. Evaluate template expressions (`{{}}` and `${{ }}`)
  3. Pass resolved strings to actions

- **FR:paths.usage**: Path protocols MUST support use in:
  - File paths: `file-read: xe://features/my-feature/spec.md`
  - Simple variable interpolation: `"{{xe://product}}"`
  - JavaScript expressions: `${{ get('xe://features/blueprint/research') }}`
  - AI prompt context: References to context and template files

- **FR:paths.conditionals**: Path protocols in conditional expressions:
  - **FR:paths.conditionals.content**: When used in simple interpolation within conditionals, path protocols resolve to file content
  - **FR:paths.conditionals.existence**: File existence checks use `get()` function: `${{ get('xe://rollouts/rollout-blueprint') }}`
  - **FR:paths.conditionals.missing**: Non-existent files return `undefined` allowing conditional checks: `if-not: ${{ get('xe://path') }}`

**FR:security.sandbox**: Expression Evaluation Security

- **FR:security.sandbox.isolation**: Expression evaluator MUST provide sandboxed execution:

  - **FR:security.sandbox.isolation.nodejs**: NO access to Node.js APIs (`require`, `process`, `fs`, `child_process`, etc.)
  - **FR:security.sandbox.isolation.globals**: NO access to global objects (`global`, `globalThis`, `window`)
  - **FR:security.sandbox.isolation.eval**: NO ability to execute arbitrary code via `eval()`, `Function()`, or similar
  - **FR:security.sandbox.isolation.proto**: NO access to prototype chain (`__proto__`, `constructor`, `prototype`)

- **FR:security.sandbox.allowlist**: Expression evaluator MUST use function allow-listing:

  - **FR:security.sandbox.allowlist.explicit**: Only explicitly registered functions MAY be callable
  - **FR:security.sandbox.allowlist.builtins**: Built-in safe functions MUST be allowlisted: `Math.*`, `String.*`, `Array.*`, `Object.keys`, `Object.values`
  - **FR:security.sandbox.allowlist.custom**: Custom functions from JavaScript modules MUST be explicitly registered
  - **FR:security.sandbox.allowlist.reject**: Functions passed in context MUST be rejected (CVE-2025-12735 mitigation)

- **FR:security.sandbox.timeout**: Expression evaluation MUST enforce timeout limits:
  - **FR:security.sandbox.timeout.max**: Maximum execution time: 10 seconds per expression
  - **FR:security.sandbox.timeout.error**: Timeout MUST throw `ExpressionTimeoutError` and halt execution
  - **FR:security.sandbox.timeout.loops**: Infinite loops MUST be prevented via timeout

**FR:security.modules**: JavaScript Module Sandboxing

- **FR:security.modules.isolation**: JavaScript modules MUST execute in isolated environment

  - **FR:security.modules.isolation.fs**: Modules MUST NOT have access to Node.js file system APIs
  - **FR:security.modules.isolation.network**: Modules MUST NOT have access to Node.js network APIs
  - **FR:security.modules.isolation.process**: Modules MUST NOT have access to `process` or environment variables
  - **FR:security.modules.isolation.timeout**: Module execution MUST timeout after 30 seconds
  - **FR:security.modules.isolation.memory**: Module memory usage MUST be limited to 50 MB

- **FR:security.modules.errors**: Module syntax errors MUST prevent playbook execution:
  - **FR:security.modules.errors.parse**: Parse errors MUST show clear error with line/column
  - **FR:security.modules.errors.runtime**: Runtime errors in module functions MUST propagate with stack trace
  - **FR:security.modules.errors.missing**: Missing module file MUST be treated as non-error (module is optional)

**FR:security.secrets**: Secret Masking

- **FR:security.secrets.interface**: System MUST provide `SecretManager` interface with the following methods:
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

- **FR:security.secrets.masking**: System MUST mask secrets in all outputs:
  - **FR:security.secrets.masking.pre**: Secrets MUST be registered before playbook execution
  - **FR:security.secrets.masking.logs**: All log messages MUST have secrets replaced with `[SECRET:name]`
  - **FR:security.secrets.masking.state**: All state snapshots MUST have secrets redacted
  - **FR:security.secrets.masking.errors**: All error messages MUST have secrets masked

- **FR:security.secrets.encryption**: Secrets MUST be stored encrypted at rest
- **FR:security.secrets.plaintext**: Secrets MUST never appear in plaintext in state files or logs

**FR:interface**: Template Engine Interface

- **FR:interface.methods**: System MUST provide `TemplateEngine` interface with the following methods:
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

**NFR:performance**: Performance

- **NFR:performance.expression**: Simple expression evaluation MUST complete in <2ms
- **NFR:performance.path**: Path protocol resolution MUST complete in <1ms per path
- **NFR:performance.module**: Module loading MUST complete in <100ms per module
- **NFR:performance.overhead**: Template interpolation overhead MUST be <1% of total playbook execution time

**NFR:security**: Security

- **NFR:security.cve**: Expression evaluator MUST be patched against CVE-2025-12735 class vulnerabilities
- **NFR:security.sandbox**: Sandbox escapes MUST be impossible via expression evaluation
- **NFR:security.prototype**: Prototype pollution attacks MUST be prevented via context sanitization
- **NFR:security.masking**: Secret masking MUST be applied before any external output (logs, APIs, state)
- **NFR:security.isolation**: JavaScript modules MUST execute in isolated environment (no host escape)

**NFR:reliability**: Reliability

- **NFR:reliability.errors**: Expression evaluation errors MUST provide clear, actionable messages
- **NFR:reliability.timeout**: Timeout enforcement MUST prevent infinite loops or hangs
- **NFR:reliability.graceful**: Module loading failures MUST not crash engine (graceful degradation)
- **NFR:reliability.deterministic**: Template interpolation MUST be deterministic (same input → same output)

**NFR:testability**: Testability

- **NFR:testability.unit**: All components MUST be unit testable with mock contexts
- **NFR:testability.security**: Security features MUST have dedicated test suite (injection attempts)
- **NFR:testability.secrets**: 100% coverage for secret masking logic
- **NFR:testability.sanitization**: 100% coverage for context sanitization

**NFR:devex**: Developer Experience

- **NFR:devex.typescript**: JavaScript modules MUST support TypeScript for type safety
- **NFR:devex.linenumbers**: Error messages MUST include line numbers for debugging
- **NFR:devex.intellisense**: VS Code MUST provide IntelliSense in `.js` module files
- **NFR:devex.errors**: Common errors MUST suggest fixes (e.g., "Did you forget to call get('variable')?")

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
