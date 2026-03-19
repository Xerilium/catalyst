---
id: playbook-template-engine
title: Playbook Template Engine
dependencies:
  - error-handling
---

<!-- markdownlint-disable single-title -->

# Feature: Playbook Template Engine

## Purpose

Provide secure, sandboxed template processing for playbook workflows — including variable interpolation, JavaScript expression evaluation, path protocol resolution, and custom module loading — so that playbooks can access runtime data, make decisions, and transform content without exposing the host environment to code injection or data exfiltration.

## Scenarios

### FR:syntax: Template Syntax and Expression Evaluation

Playbook Engine needs to interpolate dynamic values into step configurations so that playbooks can reference runtime data, make conditional decisions, and transform content.

- **FR:syntax.dual** (P1): System MUST support two template syntaxes:
  - **FR:syntax.dual.simple** (P1): Simple variable interpolation: `{{variable-name}}` for direct string substitution
  - **FR:syntax.dual.js** (P1): JavaScript expressions: `${{ expression }}` for evaluated code blocks

- **FR:syntax.simple** (P1): Simple variable interpolation (`{{variable-name}}`) MUST:
  - **FR:syntax.simple.resolve** (P1): Resolve to the value of the named variable from execution context
  - **FR:syntax.simple.kebab** (P3): Support kebab-case variable names: `{{feature-name}}`
  - **FR:syntax.simple.dot** (P3): Support dot notation for nested properties: `{{issue.body}}` or `{{pr-info.head.ref}}`
  - **FR:syntax.simple.preserve** (P2): Return the value (not converted to string) when used standalone
  - **FR:syntax.simple.error** (P2): Throw `PlaybookVariableNotFound` if variable not found in context
  - **FR:syntax.simple.conditional** (P3): Be usable in conditionals for truthiness checks: `if: {{variable}}`
  - **FR:syntax.simple.yaml** (P3): Be usable in any string value or expression context within playbook YAML

- **FR:syntax.js** (P1): JavaScript expressions (`${{ expression }}`) MUST support:
  - **FR:syntax.js.get** (P1): Variable access via `get()` function: `${{ get('variable-name') }}`
  - **FR:syntax.js.boolean** (P1): Boolean expressions: `${{ get('x') > 10 && get('y') < 20 }}`
  - **FR:syntax.js.math** (P3): Mathematical operations: `${{ (get('a') + get('b')) * get('c') }}`
  - **FR:syntax.js.string** (P3): String operations: `${{ get('text').toUpperCase() }}`
  - **FR:syntax.js.function** (P2): Function calls: `${{ validateInput(get('pr-number'), get('labels')) }}`
  - **FR:syntax.js.ternary** (P3): Ternary operators: `${{ get('mode') === 'pr' ? 'pull-request' : 'manual' }}`
  - **FR:syntax.js.negation** (P3): Logical negation: `${{ !get('force') }}`
  - **FR:syntax.js.chaining** (P3): Method chaining: `${{ get('text').toLowerCase().includes('keyword') }}`
  - **FR:syntax.js.valid** (P1): MUST contain valid JavaScript only — `{{}}` syntax is NOT allowed inside `${{ }}`

- **FR:syntax.timing** (P2): Template expressions MUST be evaluated during step configuration interpolation
- **FR:syntax.runtime** (P2): Expressions MUST NOT execute during playbook load time (only at runtime)
- **FR:syntax.errors** (P2): Invalid expressions MUST fail fast with clear syntax error messages
- **FR:syntax.whitespace** (P3): Whitespace around expression delimiters SHOULD be flexible:
  - Both `${{expression}}` and `${{ expression }}` are valid
  - Both `{{variable}}` and `{{ variable }}` are valid

- **FR:syntax.escape** (P3): Template engine MUST support an escape sequence that produces literal `{{` and `}}` in output without variable resolution
  - **FR:syntax.escape.syntax** (P3): The escape sequence MUST use backslash prefix: `\{{` produces literal `{{`, `\}}` produces literal `}}`
  - **FR:syntax.escape.passthrough** (P3): Escaped sequences MUST NOT trigger variable lookup or expression evaluation
  - **FR:syntax.escape.contexts** (P3): Escape syntax MUST work in all template contexts (string values, file content, expressions)

### FR:context: Context Access via get() Function

Playbook Engine needs a safe accessor function within JavaScript expressions so that template authors can reference runtime variables without direct scope access.

- **FR:context.interface** (P1): System MUST provide `get(variableName)` function in JavaScript expression contexts (`${{ }}`)
  - **FR:context.interface.input** (P1): Input: `variableName` (string) — variable name in kebab-case
  - **FR:context.interface.output** (P1): Output: variable value from execution context
  - Throws: `PlaybookVariableNotFound` if variable not found in context

- **FR:context.kebab** (P1): `get()` function MUST accept kebab-case variable names
  - Example: `get('feature-name')`, `get('pr-number')`

- **FR:context.dot** (P3): `get()` function MUST support dot notation for nested property access
  - Syntax: `get('variable').property.subProperty`
  - Example: `get('issue').body`, `get('pr-info').head.ref`

- **FR:context.sources** (P1): `get()` function MUST access variables from playbook inputs and context variables (including named step results)

### FR:modules: JavaScript Module Loading

Developer needs to define custom functions in `.js` files alongside playbooks so that complex logic gets full IDE support (IntelliSense, debugging, testing) instead of living in inline template strings.

- **FR:modules.autoload** (P2): System MUST support JavaScript modules alongside playbooks
  - **FR:modules.autoload.naming** (P2): When executing `{playbook-name}.yaml`, if `{playbook-name}.js` exists in same directory, it MUST be auto-loaded
  - **FR:modules.autoload.exports** (P2): All functions exported from module MUST be available in expression context
  - **FR:modules.autoload.timing** (P2): Module loading MUST occur before playbook execution starts
  - **FR:modules.autoload.errors** (P2): Module loading errors MUST prevent playbook execution with clear error message

- **FR:modules.callable** (P2): Module functions MUST be callable from expressions:

  ```yaml
  steps:
    - if: ${{ simpleValidation(get('pr-number'), get('labels')) }}
  ```

### FR:paths: Path Protocol Resolution

Playbook Engine needs to resolve protocol-prefixed paths into absolute file paths so that playbooks can reference files across the project without hardcoded paths.

- **FR:paths.protocols** (P1): System MUST resolve path protocols in all string values before action execution
  - **FR:paths.protocols.xe** (P1): `xe://path` MUST resolve to `.xe/path` relative to repository root
  - **FR:paths.protocols.catalyst** (P1): `catalyst://path` MUST resolve to `node_modules/@xerilium/catalyst/path` relative to NPM package root
  - **FR:paths.protocols.temp** (P2): `temp://path` MUST resolve to the OS temp directory path (platform-agnostic via `os.tmpdir()`)
  - **FR:paths.protocols.extension** (P3): File extensions MUST be auto-detected when not specified:
    - If `.md` file exists, use it (default)
    - If `.json` file exists, use it (fallback)
    - Otherwise use path as-is
  - **FR:paths.protocols.timing** (P2): Protocol resolution MUST occur before template expression evaluation

- **FR:paths.order** (P2): Path protocol resolution order MUST be:
  1. Resolve path protocols (`xe://`, `catalyst://`, `temp://`)
  2. Evaluate template expressions (`{{}}` and `${{ }}`)
  3. Pass resolved strings to actions

- **FR:paths.usage** (P3): Path protocols MUST support use in:
  - File paths: `file-read: xe://features/my-feature/spec.md`
  - Simple variable interpolation: `"{{xe://product}}"`
  - JavaScript expressions: `${{ get('xe://features/blueprint/research') }}`
  - AI prompt context: References to context and template files

- **FR:paths.conditionals** (P3): Path protocols in conditional expressions:
  - **FR:paths.conditionals.content** (P3): When used in simple interpolation within conditionals, path protocols resolve to file content
  - **FR:paths.conditionals.existence** (P3): File existence checks use `get()` function: `${{ get('xe://rollouts/rollout-blueprint') }}`
  - **FR:paths.conditionals.missing** (P3): Non-existent files return `undefined` allowing conditional checks: `if-not: ${{ get('xe://path') }}`

### FR:security-sandbox: Expression Evaluation Security

AI Agent executes untrusted template expressions at runtime so that the system needs sandboxed evaluation preventing access to Node.js APIs, prototype chains, and arbitrary code execution.

- **FR:security-sandbox.isolation** (P1): Expression evaluator MUST provide sandboxed execution:
  - **FR:security-sandbox.isolation.nodejs** (P1): NO access to Node.js APIs (`require`, `process`, `fs`, `child_process`, etc.)
  - **FR:security-sandbox.isolation.globals** (P1): NO access to global objects (`global`, `globalThis`, `window`)
  - **FR:security-sandbox.isolation.eval** (P1): NO ability to execute arbitrary code via `eval()`, `Function()`, or similar
  - **FR:security-sandbox.isolation.proto** (P1): NO access to prototype chain (`__proto__`, `constructor`, `prototype`)

- **FR:security-sandbox.allowlist** (P1): Expression evaluator MUST use function allow-listing:
  - **FR:security-sandbox.allowlist.explicit** (P1): Only explicitly registered functions MAY be callable
  - **FR:security-sandbox.allowlist.builtins** (P1): Built-in safe functions MUST be allowlisted: `Math.*`, `String.*`, `Array.*`, `Object.keys`, `Object.values`
  - **FR:security-sandbox.allowlist.custom** (P1): Custom functions from JavaScript modules MUST be explicitly registered
  - **FR:security-sandbox.allowlist.reject** (P1): Functions passed in context MUST be rejected (CVE-2025-12735 mitigation)

- **FR:security-sandbox.timeout** (P1): Expression evaluation MUST enforce timeout limits:
  - **FR:security-sandbox.timeout.max** (P1): Maximum execution time: 10 seconds per expression
  - **FR:security-sandbox.timeout.error** (P2): Timeout MUST throw `ExpressionTimeoutError` and halt execution
  - **FR:security-sandbox.timeout.loops** (P1): Infinite loops MUST be prevented via timeout

### FR:security-modules: JavaScript Module Sandboxing

AI Agent loads user-provided JavaScript modules at runtime so that module execution must be isolated from the host environment to prevent file system access, network access, and resource exhaustion.

- **FR:security-modules.isolation** (P1): JavaScript modules MUST execute in isolated environment
  - **FR:security-modules.isolation.fs** (P1): Modules MUST NOT have access to Node.js file system APIs
  - **FR:security-modules.isolation.network** (P1): Modules MUST NOT have access to Node.js network APIs
  - **FR:security-modules.isolation.process** (P1): Modules MUST NOT have access to `process` or environment variables
  - **FR:security-modules.isolation.timeout** (P1): Module execution MUST timeout after 30 seconds
  - **FR:security-modules.isolation.memory** (P1): Module memory usage MUST be limited to 50 MB

- **FR:security-modules.errors** (P2): Module syntax errors MUST prevent playbook execution:
  - **FR:security-modules.errors.parse** (P2): Parse errors MUST show clear error with line/column
  - **FR:security-modules.errors.runtime** (P2): Runtime errors in module functions MUST propagate with stack trace
  - **FR:security-modules.errors.missing** (P3): Missing module file MUST be treated as non-error (module is optional)

### FR:security-secrets: Secret Masking

AI Agent handles sensitive values (API tokens, credentials) during playbook execution so that secrets must be masked in all outputs to prevent accidental leakage.

- **FR:security-secrets.interface** (P1): System MUST provide `SecretManager` interface
  - **FR:security-secrets.interface.register** (P1): `register(name, value)` — register a secret for masking
  - **FR:security-secrets.interface.mask** (P1): `mask(text)` — replace all registered secrets in text with `[SECRET:name]`
  - **FR:security-secrets.interface.resolve** (P1): `resolve(name)` — resolve secret value by name; throws if not found

- **FR:security-secrets.masking** (P1): System MUST mask secrets in all outputs:
  - **FR:security-secrets.masking.pre** (P1): Secrets MUST be registered before playbook execution
  - **FR:security-secrets.masking.logs** (P1): All log messages MUST have secrets replaced with `[SECRET:name]`
  - **FR:security-secrets.masking.state** (P1): All state snapshots MUST have secrets redacted
  - **FR:security-secrets.masking.errors** (P1): All error messages MUST have secrets masked

- **FR:security-secrets.encryption** (P1): Secrets MUST be stored encrypted at rest
- **FR:security-secrets.plaintext** (P1): Secrets MUST never appear in plaintext in state files or logs

### FR:interface: Template Engine Interface

Playbook Engine needs a unified API surface for template processing so that all interpolation, module loading, and secret management flows through a single consistent interface.

- **FR:interface.interpolate** (P1): `interpolate(template, context)` — interpolate template string with execution context
  - **FR:interface.interpolate.input** (P1): Input: `template` (string with `{{}}` or `${{}}` expressions), `context` (ExecutionContext)
  - **FR:interface.interpolate.output** (P1): Output: resolved string
  - Throws: `InvalidStringTemplate` on `{{}}` evaluation failure; `InvalidExpressionTemplate` on `${{}}` evaluation failure

- **FR:interface.interpolateObject** (P2): `interpolateObject<T>(obj, context)` — interpolate all string values in object recursively
  - **FR:interface.interpolateObject.input** (P2): Input: `obj` (object with template strings), `context` (ExecutionContext)
  - **FR:interface.interpolateObject.output** (P2): Output: object with all template strings resolved

- **FR:interface.loadModule** (P2): `loadModule(playbookPath)` — load JavaScript module for playbook
  - **FR:interface.loadModule.input** (P2): Input: `playbookPath` (string — path to playbook YAML file)
  - **FR:interface.loadModule.output** (P2): Output: module exports (`Record<string, Function>`) or `undefined` if no module exists

- **FR:interface.registerSecret** (P2): `registerSecret(name, value)` — register secret for masking
  - **FR:interface.registerSecret.input** (P2): Input: `name` (string), `value` (string)

### Non-functional Requirements

**NFR:performance**: Performance

- **NFR:performance.expression** (P4): Simple expression evaluation MUST complete in <2ms
- **NFR:performance.path** (P4): Path protocol resolution MUST complete in <1ms per path
- **NFR:performance.module** (P4): Module loading MUST complete in <100ms per module
- **NFR:performance.overhead** (P4): Template interpolation overhead MUST be <1% of total playbook execution time

**NFR:security**: Security

- **NFR:security.cve** (P1): Expression evaluator MUST be patched against CVE-2025-12735 class vulnerabilities
- **NFR:security.sandbox** (P1): Sandbox escapes MUST be impossible via expression evaluation
- **NFR:security.prototype** (P1): Prototype pollution attacks MUST be prevented via context sanitization
- **NFR:security.masking** (P1): Secret masking MUST be applied before any external output (logs, APIs, state)
- **NFR:security.isolation** (P1): JavaScript modules MUST execute in isolated environment (no host escape)

**NFR:reliability**: Reliability

- **NFR:reliability.errors** (P2): Expression evaluation errors MUST provide clear, actionable messages
- **NFR:reliability.timeout** (P1): Timeout enforcement MUST prevent infinite loops or hangs
- **NFR:reliability.graceful** (P2): Module loading failures MUST not crash engine (graceful degradation)
- **NFR:reliability.deterministic** (P3): Template interpolation MUST be deterministic (same input → same output)

**NFR:testability**: Testability

- **NFR:testability.unit** (P3): All components MUST be unit testable with mock contexts
- **NFR:testability.security** (P1): Security features MUST have dedicated test suite (injection attempts)
- **NFR:testability.secrets** (P1): 100% coverage for secret masking logic
- **NFR:testability.sanitization** (P1): 100% coverage for context sanitization

**NFR:devex**: Developer Experience

- **NFR:devex.typescript** (P4): JavaScript modules MUST support TypeScript for type safety
- **NFR:devex.linenumbers** (P2): Error messages MUST include line numbers for debugging
- **NFR:devex.intellisense** (P4): VS Code MUST provide IntelliSense in `.js` module files
- **NFR:devex.errors** (P2): Common errors MUST suggest fixes (e.g., "Did you forget to call get('variable')?")

## Architecture Constraints

**Security by default**
> Template evaluation is sandboxed with no access to Node.js APIs, file system, or network. Expression evaluators must use allowlisted functions only. Secrets are automatically masked in all outputs. This prevents code injection and data exfiltration even if user input reaches templates.

**Explicit over magic**
> Two distinct syntaxes prevent ambiguity: simple interpolation (`{{variable}}`) for string substitution and code expressions (`${{ get('variable') }}`) for JavaScript logic. Within code expressions, the `get()` function is required to access variables. Path protocols are explicit (`xe://`, `catalyst://`) rather than implicit relative paths.

**Developer experience first**
> Complex logic belongs in `.js` files with full IDE support (IntelliSense, debugging, testing), not inline strings. Auto-loading conventions eliminate boilerplate while maintaining discoverability.

## Dependencies

**Internal:**

- **error-handling**: Provides error handling framework (CatalystError base class)

**External:**

- **Expression Evaluator**: Library providing safe expression evaluation (recommended: expr-eval-fork v3.0.0+, CVE-2025-12735 patched)
- **JavaScript Sandbox**: Isolated execution environment for modules (recommended: QuickJS via WebAssembly; alternative: isolated-vm)
- **Node.js >= 18**: ES module support, native TypeScript
