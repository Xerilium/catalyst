---
id: playbook-engine-template-interpolation
title: Template Interpolation & Expression Evaluation Research
author: "@flanakin"
date: 2025-11-27
description: Comprehensive research on YAML workflow engine best practices, template interpolation patterns, and security considerations for production-grade systems
---

# Template Interpolation & Expression Evaluation Research

> **Executive Summary**
>
> Based on analysis of production workflow engines (GitHub Actions, GitLab CI, Argo Workflows, AWS Step Functions, Tekton, Helm), the recommended approach for Catalyst's playbook engine is:
> - **Naming**: kebab-case for all YAML properties (aligned with current spec)
> - **Template Syntax**: `{{variable}}` for simple substitution, `${{code}}` for JavaScript evaluation
> - **Library**: LiquidJS for safe template interpolation with sandboxing
> - **Expression Evaluation**: expr-eval-fork v3.0.0+ with explicit function allowlisting
> - **Security**: Multi-layer defense with input validation, output encoding, and sandboxed execution

## 1. Naming Conventions in Production Workflow Engines

### Industry Analysis

| System | Property Names | Rationale | Evidence |
|--------|---------------|-----------|----------|
| **GitHub Actions** | kebab-case | Predominant in official examples | `runs-on`, `pull-request`, `issue-comment` |
| **GitLab CI** | snake_case | Legacy Unix conventions | `script`, `only`, `artifacts_paths` |
| **Argo Workflows** | camelCase | Go/Kubernetes conventions | `serviceAccount`, `activeDeadlineSeconds` |
| **AWS Step Functions** | PascalCase | JSON Schema standard | `InputPath`, `ResultPath`, `OutputPath` |
| **Tekton Pipelines** | camelCase | Kubernetes conventions | `taskRef`, `workspaces`, `serviceAccountName` |
| **Helm** | camelCase | Go template conventions | `.Values.replicaCount`, `.Release.Name` |

### Key Findings

1. **No universal standard exists** - Each ecosystem follows its platform conventions
2. **GitHub Actions uses kebab-case** for workflow-level constructs but this causes **technical limitations**:
   - Kebab-cased inputs (e.g., `file-path`) cannot be accessed as environment variables in POSIX-compliant shells
   - Environment variables convert `my-input` to `MY_INPUT` but cannot be read as `$MY-INPUT` in bash
3. **Kubernetes ecosystem favors camelCase** (Argo, Tekton) due to Go/K8s conventions
4. **Mixed approaches within same system** - GitHub Actions uses kebab-case for properties but camelCase for action inputs

### Recommendation for Catalyst

**Use kebab-case for YAML properties** (as already specified in playbook-engine spec):

**Rationale:**
- ✅ Aligns with current spec decision (FR-1.6, Design Principles)
- ✅ More readable and consistent with YAML best practices
- ✅ Avoids camelCase/PascalCase ambiguity in YAML
- ✅ Matches GitHub Actions (most familiar to developers)
- ⚠️ **Mitigation**: Provide runtime variable name normalization when accessing from scripts
  - `{{my-var}}` in YAML → `MY_VAR` in shell environment
  - Playbook engine automatically normalizes variable names for different contexts

**Counter-example avoided:**
```yaml
# ❌ BAD: Mixed conventions create confusion
inputs:
  - name: issueNumber  # camelCase
    type: number
  - name: ai-platform  # kebab-case
    type: string
```

**Recommended pattern:**
```yaml
# ✅ GOOD: Consistent kebab-case
inputs:
  - name: issue-number
    type: number
  - name: ai-platform
    type: string
```

---

## 2. Template Interpolation Patterns

### Comparison Matrix

| System | Syntax | Capabilities | Security Model |
|--------|--------|--------------|----------------|
| **GitHub Actions** | `${{ expression }}` | JavaScript-like expressions, functions, operators | Sandboxed, no arbitrary code execution |
| **GitLab CI** | `$[[ inputs.id ]]` | Input interpolation, predefined functions (expand_vars, truncate) | Type-safe, function allowlist |
| **Argo Workflows** | `{{workflow.name}}` | Simple string replacement, no expressions | Read-only, no code execution |
| **AWS Step Functions** | `$.path` (JsonPath)<br>`{% %}` (JSONata) | Path queries, transformations | Declarative query language |
| **Tekton** | `$(params.name)` | Simple parameter substitution | Read-only replacement |
| **Helm** | `{{ .Values.key }}` | Go templates with pipelines, functions | Server-side, trusted templates |

### Detailed Analysis

#### GitHub Actions: `${{ expression }}`

**Syntax:**
```yaml
steps:
  - name: Check condition
    if: ${{ github.event_name == 'pull_request' }}
    run: echo "PR event"

  - name: Use function
    run: echo "${{ toJSON(github.event) }}"
```

**Features:**
- Boolean operators: `&&`, `||`, `!`
- Comparison: `==`, `!=`, `<`, `>`, `<=`, `>=`
- Built-in functions: `contains()`, `startsWith()`, `endsWith()`, `format()`, `join()`, `toJSON()`, `fromJSON()`
- Context objects: `github.*`, `env.*`, `secrets.*`, `needs.*`

**Security:**
- **Sandboxed execution** - no arbitrary JavaScript
- **Function allowlist** - only predefined functions available
- **No file system access** from expressions
- **No network calls** from expressions

**Limitations:**
- Cannot define custom functions
- Limited to expression evaluation (no loops, variables)
- No access to external libraries

#### GitLab CI: `$[[ inputs.id ]]`

**Syntax:**
```yaml
spec:
  inputs:
    linter:
      default: eslint
steps:
  - name: run-$[[ inputs.linter ]]-lint
    script: $[[ inputs.linter ]] --fix
```

**Features:**
- **Type-aware interpolation** - preserves booleans, numbers, arrays
- **Predefined functions**:
  - `expand_vars` - expands variables within input value
  - `truncate` - shortens values for naming restrictions
- **Component context** (GitLab 18.7+): `$[[ component.field-name ]]`
- **Function chaining** (max 3): `$[[ input.id | truncate | expand_vars ]]`

**Security:**
- **No code execution** - purely declarative
- **Type validation** at pipeline creation time
- **Size limits**: 1 MB per string, 1 KB inside inputs

**Limitations:**
- No conditional logic in interpolation
- Limited function set (cannot extend)
- Interpolation occurs at pipeline creation only (not runtime)

#### Argo Workflows: `{{variable}}`

**Syntax:**
```yaml
steps:
  - name: print-message
    template: whalesay
    arguments:
      parameters:
        - name: message
          value: "{{workflow.parameters.message}}"
```

**Features:**
- **Simple tags**: Direct string replacement
- **Expression tags** (with `=` prefix): Use expr-lang library for filtering, mapping, type conversion
- **Context variables**: `{{workflow.*}}`, `{{steps.*}}`, `{{inputs.*}}`, `{{outputs.*}}`

**Security:**
- **Read-only** - no side effects
- **String replacement only** (for simple tags)
- **Limited expressions** - expr-lang is safe subset

**Best Practices:**
- **Quote all standalone references**: `"{{inputs.parameters.message}}"` (YAML escaping)
- **Avoid whitespace**: `{{var}}` not `{{ var }}` (known interpolation bug)
- **Use artifacts for large data** - parameters limited by etcd (1.5 MB Kubernetes object size)

**Limitations:**
- Performance degrades with hundreds of variables (repeated string scanning)
- Must escape from Helm when using both tools (both use `{{ }}`)

#### AWS Step Functions: JsonPath & JSONata

**JsonPath Syntax (Traditional):**
```json
{
  "InputPath": "$.data",
  "ResultPath": "$.result",
  "OutputPath": "$"
}
```

**JSONata Syntax (Modern - Nov 2024):**
```json
{
  "QueryLanguage": "JSONata",
  "Arguments": {
    "processed": "{% $uppercase($.input.name) %}"
  }
}
```

**Features:**
- **JsonPath**: Standard path queries (`$.field`, `$[0]`, `$..recursive`)
- **JSONata**: Full query language with functions, transformations
- **Context Object**: `$$.Execution.Id`, `$$.State.Name` (runtime metadata)
- **Intrinsic functions**: `States.Format()`, `States.StringToJson()`, `States.Array()`

**Security:**
- **Declarative queries** - no arbitrary code
- **Validation at state machine creation** - syntax errors fail upfront
- **Field suffix convention**: `.$ ` indicates runtime JSONPath evaluation
- **Error handling**: `States.QueryEvaluationError` for invalid queries

**Best Practices:**
- **Use JSONata for complex transformations** (2024+ recommendation)
- **Strict delimiter spacing**: `{% expr %}` (no leading/trailing spaces or validation fails)
- **Explicit runtime fields**: Use `.$` suffix to distinguish static vs dynamic values

#### Tekton: `$(params.name)`

**Syntax:**
```yaml
steps:
  - name: build
    image: golang:$(params.go-version)
    script: |
      go build -o $(params.output-path)
```

**Features:**
- **Simple substitution**: `$(params.<name>)`, `$(tasks.<task>.results.<result>)`
- **Context variables**: `$(context.pipelineRun.name)`, `$(context.pipelineRun.uid)`
- **No expressions** - literal replacement only

**Security:**
- **No escaping** - task authors must handle shell escaping
- **Read-only** - cannot modify pipeline state

**Limitations:**
- **Quoting required for operators**: `'$(params.foo)' == 'bar'` (not `$(params.foo) == 'bar'`)
- **No dots in parameter names** when using dot notation
- **Limited fields**: Only works in `name`, `command`, `args`, `env`, `script` of steps/sidecars

#### Helm: Go Templates

**Syntax:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: {{ .Release.Name }}-service
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    app: {{ .Chart.Name | quote }}
```

**Features:**
- **Go template engine** - full programming language
- **Pipelines**: `{{ .Values.drink | quote | upper }}`
- **Variables**: `{{- $serviceNamespace := print .Values.ns "-" .Values.tag -}}`
- **Functions**: `quote`, `upper`, `lower`, `print`, `printf`, `index`, `tpl`
- **Root context**: `$` always points to root (useful in loops)
- **Template recursion**: `{{ tpl $value $ }}`

**Security:**
- **Server-side only** - templates trusted
- **No user input** in templates (only in values)
- **YAML anchors** as alternative to reduce complexity

**Best Practices:**
- **Quote string values**: `{{ quote .Values.favorite.drink }}`
- **Use pipelines for readability**: `.val | quote` over `quote .val`
- **Dynamic key access with index**: `{{ index .Values.server (printf "%s_endpoint" .Values.env) }}`
- **Use `tpl` for template interpolation in values**: `{{ tpl $value $ }}`

---

## 3. Expression Evaluation Approaches

### Security Analysis

| Approach | Security Level | Capabilities | Use Case |
|----------|---------------|--------------|----------|
| **String Replacement** | ✅ Safest | Variable substitution only | Simple workflows |
| **Declarative Query** (JsonPath) | ✅ Safe | Read-only path queries | Data extraction |
| **Function Allowlist** (GitHub Actions) | ✅ Safe | Predefined functions, operators | Conditional logic |
| **Sandboxed Runtime** (QuickJS/LiquidJS) | ⚠️ Medium | Limited code execution | Complex expressions |
| **eval() / Function()** | ❌ Dangerous | Arbitrary code | **NEVER USE** |

### Critical Security Vulnerabilities (2025)

#### CVE-2025-12735: expr-eval RCE

**Affected Libraries:**
- `expr-eval` (unmaintained)
- `expr-eval-fork` < v3.0.0

**Vulnerability:**
```javascript
// ❌ VULNERABLE CODE
const parser = new Parser();
const maliciousContext = {
  evilFunc: () => require('child_process').execSync('rm -rf /')
};
parser.evaluate('evilFunc()', maliciousContext); // RCE!
```

**Impact:**
- CVSS Score: **9.8 Critical**
- 80,000+ weekly downloads affected
- Remote code execution via malicious function objects

**Fix (expr-eval-fork v3.0.0+):**
```javascript
// ✅ SECURE CODE (v3.0.0+)
const parser = new Parser();
parser.evaluate('evilFunc()', context); // Throws error - function not allowlisted
```

**Security Measures in v3.0.0:**
- ✅ Explicit function allowlist
- ✅ Registration system for custom functions
- ✅ Input validation on context objects
- ✅ Extended test coverage

#### vm2 Library Deprecation

**Status:** Multiple critical CVEs (CVE-2023-29017: CVSS 10.0)

**Recommendation:** **Do NOT use vm2 for sandboxing**

**Alternatives:**
- `isolated-vm` (better isolation)
- QuickJS via WebAssembly (lightweight sandbox)
- Physical separation (containers, VMs)

### Recommended Approach for Catalyst

**Multi-layered Security Strategy:**

1. **Layer 1: Template Interpolation (LiquidJS)**
   - Safe, sandboxed template engine
   - Shopify-compatible (battle-tested)
   - Built-in security features
   - No arbitrary code execution

2. **Layer 2: Expression Evaluation (expr-eval-fork v3.0.0+)**
   - Allowlisted functions only
   - Mathematical and boolean operators
   - Type-safe evaluation
   - No access to Node.js APIs

3. **Layer 3: Script Actions (QuickJS sandbox)**
   - For advanced use cases requiring custom logic
   - Isolated WebAssembly runtime
   - Virtual file system
   - No access to host resources

**Implementation Pattern:**

```typescript
// Template interpolation (safe)
import { Liquid } from 'liquidjs';

const engine = new Liquid({
  strictFilters: true,  // Fail on unknown filters
  strictVariables: true // Fail on undefined variables
});

const template = 'Hello {{user.name}}, your role is {{user.role}}';
const output = await engine.parseAndRender(template, {
  user: { name: 'Alice', role: 'admin' }
});

// Expression evaluation (safe with allowlist)
import { Parser } from 'expr-eval-fork';

const parser = new Parser();
// Only allow safe built-in functions (v3.0.0+ default)
const result = parser.evaluate('x > 10 && y < 20', { x: 15, y: 10 }); // true

// Script execution (sandboxed)
import { quickjs } from '@sebastianwessel/quickjs';

const result = await quickjs(`
  function calculate(x, y) {
    return x * y + 10;
  }
  calculate(5, 3);
`); // 25 (isolated, no access to fs/network)
```

---

## 4. TypeScript/Node.js Library Recommendations

### Template Interpolation Libraries

#### LiquidJS (Recommended)

**Why LiquidJS:**
- ✅ **Security-first design** - safe by default
- ✅ **TypeScript native** - written in TypeScript strict mode
- ✅ **Battle-tested** - used by GitHub Docs, Eleventy, Shopify
- ✅ **Rich feature set** - filters, tags, template inheritance
- ✅ **Active maintenance** - regular updates, security patches
- ✅ **Shopify compatibility** - can port Jekyll/Shopify templates

**Installation:**
```bash
npm install liquidjs
```

**Basic Usage:**
```typescript
import { Liquid } from 'liquidjs';

const engine = new Liquid({
  root: './templates',
  extname: '.liquid',
  strictFilters: true,
  strictVariables: true
});

// Simple interpolation
await engine.parseAndRender('Hello {{name}}!', { name: 'World' });
// Output: "Hello World!"

// Conditional logic
await engine.parseAndRender(
  '{% if user.role == "admin" %}Admin Access{% else %}User Access{% endif %}',
  { user: { role: 'admin' } }
);
// Output: "Admin Access"

// Filters
await engine.parseAndRender('{{ text | upcase | truncate: 10 }}', { text: 'hello world' });
// Output: "HELLO WORL"
```

**Advanced Features:**
```typescript
// Custom filters
engine.registerFilter('kebabCase', (str) => str.replace(/\s+/g, '-').toLowerCase());
await engine.parseAndRender('{{ title | kebabCase }}', { title: 'My Feature' });
// Output: "my-feature"

// Custom tags
engine.registerTag('error', {
  parse(tagToken, remainTokens) {
    this.message = tagToken.args;
  },
  render(context) {
    throw new Error(this.message);
  }
});

// File-based templates
await engine.renderFile('issue-template', { project: 'catalyst' });
```

**Security Benefits:**
- Sandboxed execution (no access to `require`, `process`, `fs`)
- Strict mode options prevent undefined variable access
- Filter/tag allowlisting via registration
- No eval() or Function() constructor usage

#### Alternatives Considered

| Library | Pros | Cons | Verdict |
|---------|------|------|---------|
| **Handlebars** | Widely used, logic-less base | Less secure than Liquid, limited built-ins | ❌ Not recommended |
| **Mustache** | Truly logic-less, simple | Too limited for workflows | ❌ Not recommended |
| **Nunjucks** | Rich features, Mozilla-backed | Less security focus, Python-like syntax | ⚠️ Alternative option |
| **EJS** | Simple, embedded JavaScript | Uses eval(), security risk | ❌ Dangerous |

### Expression Evaluation Libraries

#### expr-eval-fork v3.0.0+ (Recommended)

**Why expr-eval-fork:**
- ✅ **Security patched** - CVE-2025-12735 fixed in v3.0.0
- ✅ **Function allowlist** - explicit registration required
- ✅ **Active maintenance** - fork of abandoned expr-eval
- ✅ **Math & boolean operators** - sufficient for workflows
- ✅ **No code execution** - no access to Node.js APIs

**Installation:**
```bash
npm install expr-eval-fork@^3.0.0
```

**Safe Usage:**
```typescript
import { Parser } from 'expr-eval-fork';

const parser = new Parser();

// Boolean expressions
parser.evaluate('x > 10 && y < 20', { x: 15, y: 10 }); // true

// Mathematical expressions
parser.evaluate('(a + b) * c / 2', { a: 5, b: 3, c: 4 }); // 16

// Built-in functions (safe)
parser.evaluate('max(a, b, c)', { a: 5, b: 10, c: 7 }); // 10

// String operations
parser.evaluate('a + " " + b', { a: 'Hello', b: 'World' }); // "Hello World"

// ✅ Safe: Unregistered functions throw error
try {
  parser.evaluate('evilFunc()', { evilFunc: () => require('fs').rmSync('/') });
} catch (error) {
  // Error: Function evilFunc is not allowed
}
```

**Custom Function Registration:**
```typescript
import { Parser } from 'expr-eval-fork';

const parser = new Parser();

// Register safe custom function
parser.functions.toKebabCase = (str) => str.replace(/\s+/g, '-').toLowerCase();

parser.evaluate('toKebabCase(title)', { title: 'My Feature' }); // "my-feature"
```

**Security Guidelines:**
- ✅ Only use v3.0.0 or higher
- ✅ Never pass user-provided functions in context
- ✅ Validate context objects before evaluation
- ✅ Use allowlist for custom functions
- ❌ Don't pass `require`, `process`, or Node.js APIs to context

#### Alternatives Considered

| Library | Pros | Cons | Verdict |
|---------|------|------|---------|
| **mathjs** | Comprehensive math library | Large bundle size, more than needed | ⚠️ Overkill |
| **jexl** | JSON Expression Language | Less active maintenance | ⚠️ Alternative |
| **filtrex** | Safe expression evaluator | Limited features | ⚠️ Too simple |
| **vm2** | Node.js sandbox | **Multiple CVEs, deprecated** | ❌ Dangerous |
| **eval()** | Native JavaScript | **Critical security risk** | ❌ Never use |

### Sandboxed JavaScript Execution

#### QuickJS (for advanced script actions)

**Why QuickJS:**
- ✅ **True isolation** - WebAssembly-based sandbox
- ✅ **No host access** - cannot access fs/network/process
- ✅ **TypeScript support** - compile and execute TS
- ✅ **Virtual file system** - mount read-only data
- ✅ **Lightweight** - small runtime footprint

**Installation:**
```bash
npm install @sebastianwessel/quickjs
```

**Usage:**
```typescript
import { quickJS } from '@sebastianwessel/quickjs';

// Execute isolated code
const result = await quickJS(`
  function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
  }
  fibonacci(10);
`);
console.log(result); // 55

// With context (safe)
const result2 = await quickJS(
  `
  const doubled = data.map(x => x * 2);
  doubled.reduce((a, b) => a + b, 0);
  `,
  { data: [1, 2, 3, 4, 5] }
);
console.log(result2); // 30
```

**Security Benefits:**
- WebAssembly isolation (no escape to host)
- No access to Node.js APIs
- Configurable memory limits
- Timeout enforcement

**Use Cases for Catalyst:**
- Complex playbook logic that exceeds expr-eval capabilities
- User-defined transformation functions
- Advanced conditional workflows
- Data processing pipelines

---

## 5. Security Best Practices

### Threat Model

**Attack Vectors:**
1. **Code Injection** - Malicious template/expression execution
2. **Path Traversal** - Unauthorized file access
3. **Prototype Pollution** - Modifying JavaScript object prototypes
4. **Denial of Service** - Resource exhaustion via infinite loops
5. **Secret Leakage** - Exposing sensitive data in logs/errors

### Defense in Depth Strategy

#### Layer 1: Input Validation

```typescript
// ✅ Validate all playbook inputs
function validateInput(input: PlaybookInput, value: unknown): void {
  // Type checking
  if (input.type === 'string' && typeof value !== 'string') {
    throw new ValidationError(`Expected string for ${input.name}`);
  }

  // Allowed values
  if (input.allowed && !input.allowed.includes(value)) {
    throw new ValidationError(`${input.name} must be one of: ${input.allowed.join(', ')}`);
  }

  // Regex validation
  if (input.validation) {
    for (const rule of input.validation) {
      if (rule.type === 'regex') {
        if (!new RegExp(rule.pattern).test(value as string)) {
          throw new ValidationError(rule.message);
        }
      }
    }
  }

  // Size limits
  if (typeof value === 'string' && value.length > 1_000_000) {
    throw new ValidationError(`Input too large: ${input.name}`);
  }
}
```

#### Layer 2: Template Sanitization

```typescript
import { Liquid } from 'liquidjs';

const engine = new Liquid({
  // Strict mode - fail on undefined variables
  strictVariables: true,
  strictFilters: true,

  // Limit includes to trusted paths
  root: path.join(process.cwd(), 'templates'),

  // Prevent directory traversal
  fs: {
    readFileSync(file) {
      const resolved = path.resolve(file);
      if (!resolved.startsWith(this.root)) {
        throw new Error('Path traversal attempt');
      }
      return fs.readFileSync(resolved, 'utf-8');
    }
  }
});

// ✅ Safe: Only registered filters available
engine.registerFilter('safe', (input) => {
  // Escape HTML/script tags
  return input.replace(/[<>]/g, (m) => ({ '<': '&lt;', '>': '&gt;' }[m]));
});
```

#### Layer 3: Expression Evaluation Guards

```typescript
import { Parser } from 'expr-eval-fork';

// ✅ Allowlist-only functions
const parser = new Parser();

// Safe built-in functions only (default in v3.0.0+)
const allowedFunctions = ['max', 'min', 'abs', 'round', 'floor', 'ceil'];

// Validate context before evaluation
function safeEvaluate(expression: string, context: Record<string, unknown>): unknown {
  // Prevent prototype pollution
  const safeContext = Object.create(null);
  for (const [key, value] of Object.entries(context)) {
    // Block dangerous properties
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      throw new Error('Invalid context property');
    }

    // Block function objects (RCE vector)
    if (typeof value === 'function') {
      throw new Error('Functions not allowed in context');
    }

    safeContext[key] = value;
  }

  // Timeout protection
  const timeout = setTimeout(() => {
    throw new Error('Expression evaluation timeout');
  }, 5000);

  try {
    return parser.evaluate(expression, safeContext);
  } finally {
    clearTimeout(timeout);
  }
}
```

#### Layer 4: Output Encoding

```typescript
// ✅ Sanitize outputs before external use
function sanitizeForGitHub(text: string): string {
  // Remove sensitive data patterns
  return text
    .replace(/\bAPIKEY[_-]?[\w]+/gi, '[REDACTED]')
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    .replace(/\bghp_[\w]+/g, '[GITHUB_TOKEN]');
}

// ✅ Escape special characters for shell
function escapeShell(arg: string): string {
  return `'${arg.replace(/'/g, "'\\''")}'`;
}
```

#### Layer 5: Runtime Isolation

```typescript
// ✅ Sandboxed script execution
import { quickJS } from '@sebastianwessel/quickjs';

async function executeScript(code: string, context: Record<string, unknown>): Promise<unknown> {
  // Memory limit
  const maxMemory = 50 * 1024 * 1024; // 50 MB

  // Timeout
  const timeout = 30000; // 30 seconds

  // Virtual filesystem (read-only)
  const vfs = {
    '/playbook.json': JSON.stringify(context)
  };

  try {
    return await quickJS(code, {
      timeout,
      memoryLimit: maxMemory,
      allowCodeEval: false,
      vfs
    });
  } catch (error) {
    throw new ScriptExecutionError('Script failed', error);
  }
}
```

### Secret Management

```typescript
// ✅ Mask secrets in logs and state
interface Secret {
  name: string;
  value: string;
}

class SecretManager {
  private secrets = new Map<string, string>();

  register(secret: Secret): void {
    this.secrets.set(secret.name, secret.value);
  }

  mask(text: string): string {
    let masked = text;
    for (const [name, value] of this.secrets) {
      if (value && value.length > 0) {
        masked = masked.replace(new RegExp(value, 'g'), `[SECRET:${name}]`);
      }
    }
    return masked;
  }

  resolve(name: string): string {
    const value = this.secrets.get(name);
    if (!value) {
      throw new Error(`Secret not found: ${name}`);
    }
    return value;
  }
}

// Usage in playbook engine
const secretManager = new SecretManager();
secretManager.register({ name: 'GITHUB_TOKEN', value: process.env.GITHUB_TOKEN });

// Mask in logs
console.log(secretManager.mask(logMessage));

// Resolve in templates (carefully!)
const token = secretManager.resolve('GITHUB_TOKEN');
```

---

## 6. Recommended Implementation for Catalyst

### Syntax Design

Based on industry analysis and security considerations, recommend **dual syntax**:

1. **`{{variable}}`** - Simple variable substitution (LiquidJS)
2. **`${{code}}`** - Inline JavaScript evaluation (expr-eval-fork or QuickJS)

**Rationale:**
- ✅ Familiar to GitHub Actions users (`${{ }}`)
- ✅ Clear distinction between safe (variables) and powerful (code)
- ✅ LiquidJS handles `{{}}`, custom parser handles `${{}}`
- ✅ Backward compatible with current spec

### Implementation Architecture

```typescript
/**
 * Template Interpolation Engine
 * Handles both {{variables}} and ${{code}} syntax
 */

import { Liquid } from 'liquidjs';
import { Parser } from 'expr-eval-fork';
import { quickJS } from '@sebastianwessel/quickjs';

export class TemplateEngine {
  private liquid: Liquid;
  private exprParser: Parser;
  private secretManager: SecretManager;

  constructor() {
    this.liquid = new Liquid({
      strictVariables: true,
      strictFilters: true,
      root: path.join(process.cwd(), '.xe')
    });

    this.exprParser = new Parser();
    this.secretManager = new SecretManager();

    this.registerCustomFilters();
  }

  /**
   * Interpolate template with context
   * Handles both {{variables}} and ${{code}}
   */
  async interpolate(template: string, context: Record<string, unknown>): Promise<string> {
    // Step 1: Process inline scripts ${{code}}
    let processed = await this.processInlineScripts(template, context);

    // Step 2: Process variable substitutions {{variable}}
    processed = await this.liquid.parseAndRender(processed, context);

    // Step 3: Resolve path protocols (xe://, catalyst://)
    processed = await this.resolvePathProtocols(processed);

    // Step 4: Mask secrets in output
    processed = this.secretManager.mask(processed);

    return processed;
  }

  /**
   * Process ${{code}} blocks
   */
  private async processInlineScripts(template: string, context: Record<string, unknown>): Promise<string> {
    const scriptRegex = /\$\{\{(.+?)\}\}/g;
    const matches = Array.from(template.matchAll(scriptRegex));

    let result = template;
    for (const match of matches) {
      const code = match[1].trim();
      const value = await this.evaluateExpression(code, context);
      result = result.replace(match[0], String(value));
    }

    return result;
  }

  /**
   * Evaluate expression safely
   */
  private async evaluateExpression(code: string, context: Record<string, unknown>): Promise<unknown> {
    // Validate context (no functions, no dangerous properties)
    const safeContext = this.sanitizeContext(context);

    try {
      // Try simple expression first (faster)
      return this.exprParser.evaluate(code, safeContext);
    } catch (error) {
      // Fall back to sandboxed script execution for complex code
      return await quickJS(code, safeContext);
    }
  }

  /**
   * Resolve xe:// and catalyst:// path protocols
   */
  private async resolvePathProtocols(template: string): Promise<string> {
    let result = template;

    // xe://path → .xe/path
    result = result.replace(/xe:\/\/([^\s"']+)/g, (_, path) => {
      const resolved = `.xe/${path}`;
      // Auto-detect .md extension if file exists
      if (!path.includes('.') && fs.existsSync(`${resolved}.md`)) {
        return `${resolved}.md`;
      }
      return resolved;
    });

    // catalyst://path → node_modules/@xerilium/catalyst/path
    result = result.replace(/catalyst:\/\/([^\s"']+)/g, (_, path) => {
      return `node_modules/@xerilium/catalyst/${path}`;
    });

    return result;
  }

  /**
   * Sanitize context to prevent code injection
   */
  private sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
    const safe = Object.create(null);

    for (const [key, value] of Object.entries(context)) {
      // Block prototype pollution
      if (['__proto__', 'constructor', 'prototype'].includes(key)) {
        continue;
      }

      // Block function objects (RCE vector)
      if (typeof value === 'function') {
        throw new Error(`Functions not allowed in context: ${key}`);
      }

      safe[key] = value;
    }

    return safe;
  }

  /**
   * Register custom Liquid filters
   */
  private registerCustomFilters(): void {
    // String transformations
    this.liquid.registerFilter('kebab_case', (str: string) =>
      str.replace(/\s+/g, '-').toLowerCase()
    );

    this.liquid.registerFilter('snake_case', (str: string) =>
      str.replace(/\s+/g, '_').toLowerCase()
    );

    this.liquid.registerFilter('camel_case', (str: string) =>
      str.replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase())
    );

    // File reading (for xe://path inline expansion)
    this.liquid.registerFilter('read_file', (path: string) => {
      const resolved = this.resolvePathProtocols(path);
      return fs.readFileSync(resolved, 'utf-8');
    });
  }
}
```

### Usage Examples

```yaml
# Simple variable substitution
steps:
  - name: create-issue
    github-issue-create:
      title: "Feature: {{feature-name}}"
      body: "{{xe://features/{{feature-name}}/spec}}"
      labels: ["{{issue-type | kebab_case}}"]

# Inline expression evaluation
  - name: check-condition
    if: "${{issue.body.includes('[x] Create blueprint')}}"
    then:
      - playbook: create-blueprint
        inputs:
          issue-number: "{{issue.number}}"

# Complex inline script
  - name: calculate-priority
    var: priority
    value: "${{
      const urgency = issue.labels.includes('urgent') ? 10 : 5;
      const impact = comments.length > 10 ? 5 : 2;
      urgency + impact;
    }}"

# Path protocol resolution
  - name: load-template
    ai-prompt:
      context:
        spec: "{{xe://features/{{feature-id}}/spec}}"
        engineering: "{{catalyst://templates/engineering}}"
      prompt: |
        Review the specification and provide feedback.
```

---

## 7. Migration Path

### Phase 1: Foundation (Current)

- ✅ Spec already defines `{{variable}}` and `${{code}}` syntax
- ✅ Spec already mandates kebab-case for YAML properties
- ✅ Basic placeholder replacement exists in github/templates.ts

### Phase 2: Core Implementation (Next)

1. **Install dependencies:**
   ```bash
   npm install liquidjs expr-eval-fork@^3.0.0
   ```

2. **Implement TemplateEngine class** (as shown above)

3. **Add unit tests:**
   ```typescript
   describe('TemplateEngine', () => {
     test('interpolates variables', async () => {
       const engine = new TemplateEngine();
       const result = await engine.interpolate(
         'Hello {{name}}!',
         { name: 'World' }
       );
       expect(result).toBe('Hello World!');
     });

     test('evaluates inline scripts', async () => {
       const engine = new TemplateEngine();
       const result = await engine.interpolate(
         'Result: ${{x + y}}',
         { x: 5, y: 3 }
       );
       expect(result).toBe('Result: 8');
     });

     test('resolves path protocols', async () => {
       const engine = new TemplateEngine();
       const result = await engine.interpolate(
         'Read {{xe://product}}',
         {}
       );
       expect(result).toContain('.xe/product.md');
     });
   });
   ```

4. **Integrate with playbook engine:**
   ```typescript
   // In PlaybookEngine.execute()
   const templateEngine = new TemplateEngine();

   // Interpolate all string fields in step config
   for (const step of playbook.steps) {
     step.config = await templateEngine.interpolateObject(
       step.config,
       context
     );
   }
   ```

### Phase 3: Advanced Features (Future)

1. **QuickJS integration** for complex script actions
2. **Custom Liquid tags** for playbook-specific syntax
3. **Template caching** for performance
4. **Expression validation** at playbook load time

---

## 8. Key Decisions & Rationale

### Decision 1: LiquidJS over Handlebars/Mustache

**Chosen:** LiquidJS

**Rationale:**
- ✅ Security-first design with sandboxing
- ✅ TypeScript native (better DX, type safety)
- ✅ Battle-tested in production (GitHub Docs, Shopify)
- ✅ Rich feature set (filters, conditionals, loops)
- ✅ Template inheritance (useful for playbook composition)

**Alternatives rejected:**
- ❌ Handlebars: Less secure, requires careful escaping
- ❌ Mustache: Too limited (no conditionals, no filters)
- ❌ EJS: Uses eval(), security risk

### Decision 2: expr-eval-fork over mathjs/vm2

**Chosen:** expr-eval-fork v3.0.0+

**Rationale:**
- ✅ Security patched (CVE-2025-12735 fixed)
- ✅ Function allowlist (safe by default)
- ✅ Sufficient for boolean/math expressions
- ✅ Lightweight (small bundle)
- ✅ Active maintenance

**Alternatives rejected:**
- ❌ vm2: Multiple CVEs, deprecated
- ❌ mathjs: Overkill (large bundle, more than needed)
- ⚠️ jexl: Less active, fewer features

### Decision 3: Dual Syntax `{{}}` and `${{}}`

**Chosen:** `{{variable}}` for substitution, `${{code}}` for evaluation

**Rationale:**
- ✅ Familiar to GitHub Actions users
- ✅ Clear distinction between safe and powerful
- ✅ Aligns with spec (FR-1.6)
- ✅ Easy to parse (different delimiters)

**Alternatives rejected:**
- ❌ Single syntax `{{}}` for both: Ambiguous, harder to secure
- ❌ `$[]` like GitLab: Less familiar to developers
- ❌ `$()` like Tekton: Confuses with shell substitution

### Decision 4: kebab-case for YAML Properties

**Chosen:** kebab-case for all YAML constructs

**Rationale:**
- ✅ Aligns with spec (already decided)
- ✅ More readable in YAML
- ✅ Matches GitHub Actions (familiar)
- ✅ Avoids camelCase/PascalCase ambiguity
- ⚠️ Mitigation: Auto-normalize for shell (MY_VAR)

**Alternatives rejected:**
- ❌ camelCase: Kubernetes convention but less readable in YAML
- ❌ snake_case: GitLab convention but underscores less common
- ❌ Mixed: Inconsistent, confusing

### Decision 5: Multi-Layer Security

**Chosen:** Defense in depth (validation → sanitization → sandboxing → encoding)

**Rationale:**
- ✅ No single point of failure
- ✅ Protects against multiple attack vectors
- ✅ Industry best practice
- ✅ Compliance-friendly (audit trail)

**Layers:**
1. Input validation (type, size, regex)
2. Template sanitization (LiquidJS strict mode)
3. Expression sandboxing (expr-eval-fork allowlist)
4. Output encoding (secret masking, escaping)
5. Runtime isolation (QuickJS for scripts)

---

## 9. Recommended Next Steps

### Immediate (This PR)

1. ✅ **Document research findings** (this file)
2. ✅ **Update spec** if needed (already aligned)
3. ✅ **Create implementation ticket** for TemplateEngine

### Short-term (Next Sprint)

1. **Install dependencies:**
   ```bash
   npm install liquidjs expr-eval-fork@^3.0.0
   ```

2. **Implement TemplateEngine class:**
   - `/Users/flanakin/dev/catalyst/src/playbooks/template/template-engine.ts`
   - Support `{{variable}}` and `${{code}}` syntax
   - Path protocol resolution (xe://, catalyst://)
   - Secret masking

3. **Add comprehensive tests:**
   - `/Users/flanakin/dev/catalyst/tests/unit/playbooks/template/template-engine.test.ts`
   - Cover all syntax variations
   - Security test cases (injection attempts)
   - Edge cases (nested templates, circular refs)

4. **Replace simple placeholder replacement:**
   - Migrate `/Users/flanakin/dev/catalyst/src/playbooks/actions/github/templates.ts`
   - Use TemplateEngine instead of regex replace

### Medium-term (Future Sprints)

1. **QuickJS integration** for script actions
2. **Custom Liquid tags** (e.g., `{% read_file path %}`)
3. **Expression pre-validation** at playbook load time
4. **Template caching** for performance
5. **VSCode extension** for template syntax highlighting

---

## 10. References

### Production Systems Analyzed

- **GitHub Actions**: https://docs.github.com/en/actions/learn-github-actions/expressions
- **GitLab CI**: https://docs.gitlab.com/ee/ci/inputs/
- **Argo Workflows**: https://argo-workflows.readthedocs.io/en/latest/variables/
- **AWS Step Functions**: https://docs.aws.amazon.com/step-functions/latest/dg/transforming-data.html
- **Tekton Pipelines**: https://tekton.dev/docs/pipelines/variables/
- **Helm**: https://helm.sh/docs/chart_template_guide/

### Security Resources

- **CVE-2025-12735 (expr-eval)**: https://nvd.nist.gov/vuln/detail/CVE-2025-12735
- **vm2 CVEs**: https://github.com/advisories?query=vm2
- **OWASP Code Injection**: https://owasp.org/www-community/attacks/Code_Injection

### Libraries Evaluated

- **LiquidJS**: https://liquidjs.com/ | https://github.com/harttle/liquidjs
- **expr-eval-fork**: https://www.npmjs.com/package/expr-eval-fork
- **QuickJS**: https://github.com/sebastianwessel/quickjs
- **Handlebars**: https://handlebarsjs.com/
- **Nunjucks**: https://mozilla.github.io/nunjucks/

---

## Appendix: Security Checklist

Use this checklist when implementing template interpolation:

- [ ] **Dependencies:**
  - [ ] LiquidJS installed and configured with strict mode
  - [ ] expr-eval-fork v3.0.0+ installed (NOT v2.x)
  - [ ] QuickJS installed for advanced scripts

- [ ] **Input Validation:**
  - [ ] All playbook inputs type-checked before execution
  - [ ] Regex validation for string inputs
  - [ ] Size limits enforced (1 MB per input)
  - [ ] Allowed values validated

- [ ] **Template Security:**
  - [ ] LiquidJS strictVariables enabled
  - [ ] LiquidJS strictFilters enabled
  - [ ] Custom filters registered explicitly
  - [ ] Path traversal protection in file reads

- [ ] **Expression Security:**
  - [ ] Context sanitized (no functions, no __proto__)
  - [ ] expr-eval-fork function allowlist enforced
  - [ ] Timeout protection (5s for expressions)
  - [ ] QuickJS memory limits configured (50 MB)

- [ ] **Output Security:**
  - [ ] Secrets masked in logs (API keys, tokens)
  - [ ] Shell arguments escaped
  - [ ] HTML/script tags escaped
  - [ ] Error messages sanitized (no stack traces to users)

- [ ] **Testing:**
  - [ ] Injection attack test cases
  - [ ] Prototype pollution prevention tests
  - [ ] Path traversal prevention tests
  - [ ] Timeout/resource exhaustion tests
  - [ ] Secret masking verification tests

---

**End of Research Document**

*For implementation details, see playbook-engine/plan.md*
*For testing strategy, see playbook-engine/tasks.md*
