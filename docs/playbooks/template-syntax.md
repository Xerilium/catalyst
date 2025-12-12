# Playbook Template Syntax

Catalyst playbooks support a powerful template syntax for dynamic configuration, allowing you to interpolate variables, evaluate expressions, and reference files using custom protocols.

## Overview

The template engine provides two complementary syntaxes:

- **`{{variable}}`** - Simple string substitution for variables
- **`${{ expression }}`** - JavaScript expression evaluation for complex logic

## Variable Substitution (`{{}}`)

Use double curly braces to substitute variables from your context.

### Basic Usage

```yaml
name: "{{user.name}}"
message: "Hello, {{user.name}}!"
```

### Nested Properties

Access nested object properties using dot notation:

```yaml
title: "{{issue.title}}"
author: "{{issue.user.login}}"
repository: "{{repository.full_name}}"
```

### Context Example

```typescript
const context = {
  user: { name: "Alice" },
  issue: {
    title: "Fix bug",
    user: { login: "octocat" }
  },
  repository: {
    full_name: "owner/repo"
  }
};
```

## Expression Evaluation (`${{}}`)

Use `${{}}` for JavaScript expressions that require computation or logic.

### Basic Expressions

```yaml
# Arithmetic
count: "${{ get('x') + get('y') }}"

# Boolean logic
is_valid: "${{ get('score') > 50 }}"

# Conditional (ternary)
status: "${{ get('count') > 0 ? 'active' : 'inactive' }}"
```

### String Concatenation

⚠️ **Important**: Use the `||` operator for string concatenation:

```yaml
# Correct
full_name: "${{ get('first') || ' ' || get('last') }}"

# Incorrect - will result in NaN
# full_name: "${{ get('first') + ' ' + get('last') }}"
```

### Accessing Context

Always use the `get()` function to access context values in expressions:

```yaml
# Correct
result: "${{ get('user.name') }}"

# Incorrect - will fail
# result: "${{ user.name }}"
```

### Available Operators

- **Arithmetic**: `+`, `-`, `*`, `/`, `%`, `^` (power)
- **Comparison**: `>`, `<`, `>=`, `<=`, `==`, `!=`
- **Logical**: `and`, `or`, `not`
- **Ternary**: `condition ? true_value : false_value`
- **Concatenation**: `||`

## Path Protocols

Reference files using custom protocols for clean, portable paths.

### `xe://` Protocol

References files in your project's `.xe/` directory:

```yaml
template: "{{xe://templates/issue-template.md}}"
config: "{{xe://config/settings.json}}"
```

Resolves to: `.xe/templates/issue-template.md`

### `catalyst://` Protocol

References files in the Catalyst package:

```yaml
template: "{{catalyst://templates/default.md}}"
playbook: "{{catalyst://playbooks/github/create-issue.yaml}}"
```

Resolves to: `node_modules/@xerilium/catalyst/templates/default.md`

### Auto-Extension Detection

The resolver automatically tries common extensions:

```yaml
# Tries in order: spec.md, spec.json, spec (no extension)
content: "{{xe://features/myfeature/spec}}"
```

## Mixed Syntax

You can use both syntaxes in the same template:

```yaml
greeting: "Hello {{user.name}}! You have ${{ get('unread') + 1 }} messages."
```

**Processing Order**:
1. `${{ expressions }}` are evaluated first
2. `{{variables}}` are substituted second
3. Secrets are masked in output

## Custom Functions

Load custom JavaScript functions from a `.js` file alongside your playbook:

**my-playbook.yaml**:
```yaml
steps:
  - name: "Process data"
    value: "${{ double(get('count')) }}"
```

**my-playbook.js**:
```javascript
export function double(x) {
  return x * 2;
}

export function formatCurrency(amount) {
  return `$${amount.toFixed(2)}`;
}
```

Register functions in your code:

```typescript
const engine = new TemplateEngine();
await engine.loadModule('/path/to/my-playbook.yaml');

// Or register manually
engine.registerFunction('triple', (x) => x * 3);
```

## Security Features

### Context Sanitization

The template engine automatically:
- Blocks dangerous properties (`__proto__`, `constructor`, `prototype`)
- Rejects function objects in context
- Prevents prototype pollution attacks

### Expression Safety

- ❌ `eval()` calls are blocked
- ❌ `require()` calls are blocked
- ❌ Assignment operators are disabled
- ✅ Only safe JavaScript expressions allowed

### Critical Constraint

**`{{}}` syntax is NOT allowed inside `${{}}`**:

```yaml
# ❌ INVALID - Will throw error
value: "${{ {{variable}} > 0 }}"

# ✅ VALID - Use get() instead
value: "${{ get('variable') > 0 }}"
```

### Secret Masking

Register secrets to prevent exposure:

```typescript
engine.registerSecret('GITHUB_TOKEN', 'ghp_abc123');

// Secrets are masked in output and error messages
// Output: "Token: [SECRET:GITHUB_TOKEN]"
```

### Path Traversal Prevention

Protocol paths are validated:

```yaml
# ❌ INVALID - Path traversal blocked
file: "{{xe://../../../etc/passwd}}"

# ❌ INVALID - Absolute paths blocked
file: "{{xe:///etc/passwd}}"

# ✅ VALID - Relative paths within protocol directory
file: "{{xe://features/auth/spec.md}}"
```

## Error Handling

The template engine throws `CatalystError` with specific error codes:

- **`InvalidStringTemplate`** - Malformed `{{}}` syntax or undefined variable
- **`InvalidExpressionTemplate`** - Invalid JavaScript in `${{}}`
- **`ExpressionTimeout`** - Expression took longer than 10 seconds
- **`InvalidProtocol`** - Malformed or insecure protocol path
- **`ModuleLoadError`** - Failed to load custom functions module

## API Reference

### TemplateEngine

```typescript
import { TemplateEngine } from '@xerilium/catalyst';

const engine = new TemplateEngine();
```

#### `interpolate(template, context): Promise<string>`

Interpolate a template string with context values:

```typescript
const result = await engine.interpolate(
  'Hello {{name}}!',
  { name: 'World' }
);
// Returns: "Hello World!"
```

#### `interpolateObject(obj, context): Promise<object>`

Recursively interpolate all strings in an object:

```typescript
const config = {
  title: '{{issue.title}}',
  count: '${{ get("x") + 1 }}'
};

const result = await engine.interpolateObject(
  config,
  { issue: { title: 'Bug' }, x: 5 }
);
// Returns: { title: 'Bug', count: '6' }
```

#### `loadModule(playbookPath): Promise<object>`

Load custom functions from a JavaScript module:

```typescript
const functions = await engine.loadModule('/path/to/playbook.yaml');
// Looks for /path/to/playbook.js and registers exported functions
```

#### `registerFunction(name, func): void`

Register a custom function for expressions:

```typescript
engine.registerFunction('add', (a, b) => a + b);

// Now available in expressions
const result = await engine.interpolate(
  '${{ add(get("x"), get("y")) }}',
  { x: 3, y: 7 }
);
// Returns: "10"
```

#### `registerSecret(name, value): void`

Register a secret for masking:

```typescript
engine.registerSecret('API_KEY', 'secret123');

const result = await engine.interpolate(
  'Key: {{key}}',
  { key: 'secret123' }
);
// Returns: "Key: [SECRET:API_KEY]"
```

## Best Practices

1. **Use `{{}}` for simple substitution**, `${{}}` for logic
2. **Always use `get()` in expressions** to access context values
3. **Use `||` for string concatenation** in expressions
4. **Register secrets** to prevent accidental exposure
5. **Use path protocols** (`xe://`, `catalyst://`) for file references
6. **Keep expressions simple** - avoid complex logic (10s timeout)
7. **Test with malicious input** during development

## Examples

### GitHub Issue Creation

```yaml
steps:
  - name: create_issue
    uses: github/create-issue
    with:
      title: "{{issue.title}}"
      body: |
        ## Description
        {{issue.body}}

        ## Metadata
        - Reporter: {{issue.user.login}}
        - Created: {{issue.created_at}}
        - Labels: ${{ get('issue.labels').length }}
      assignees: "${{ get('autoAssign') ? [get('issue.user.login')] : [] }}"
```

### Conditional Configuration

```yaml
steps:
  - name: deploy
    environment: "${{ get('branch') == 'main' ? 'production' : 'staging' }}"
    replicas: "${{ get('environment') == 'production' ? 3 : 1 }}"
    enabled: "${{ get('tests_passed') and get('approved') }}"
```

### Template with Custom Functions

**deployment.yaml**:
```yaml
steps:
  - name: deploy
    image: "myapp:${{ formatVersion(get('version')) }}"
    memory: "${{ calculateMemory(get('replicas')) }}"
```

**deployment.js**:
```javascript
export function formatVersion(version) {
  return version.replace(/\./g, '-');
}

export function calculateMemory(replicas) {
  const baseMemory = 512;
  return baseMemory * Math.ceil(replicas / 2);
}
```

## Troubleshooting

### "Variable references an unallowed function"

Use `get()` to access context values:
```yaml
# Wrong: "${{ myVar }}"
# Right: "${{ get('myVar') }}"
```

### "Unclosed {{ bracket"

Ensure all `{{` have matching `}}`:
```yaml
# Wrong: "{{incomplete"
# Right: "{{complete}}"
```

### "NaN" in output

Use `||` for string concatenation, not `+`:
```yaml
# Wrong: "${{ get('a') + get('b') }}"
# Right: "${{ get('a') || get('b') }}"
```

### Expression timeout

Break complex expressions into multiple steps or simplify logic.
