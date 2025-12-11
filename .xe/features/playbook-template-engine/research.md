---
id: playbook-template-engine-research
title: Research: Playbook Template Engine
description: "Research notes, competitive analysis, and technical findings for template interpolation and expression evaluation."
date: 2025-11-27
author: "@flanakin"
---

<!-- markdownlint-disable single-title -->

# Research: Playbook Template Engine

## Summary

This research analyzes production workflow engines (GitHub Actions, GitLab CI, Argo Workflows, AWS Step Functions, Tekton, Helm) to determine best practices for template interpolation, expression evaluation, and security in Catalyst's playbook engine. The recommended approach uses dual syntax (`{{variable}}` for simple substitution, `${{ expression }}` for JavaScript evaluation), kebab-case naming conventions, and multi-layer security with LiquidJS for templates and expr-eval-fork v3.0.0+ for safe expression evaluation. Critical finding: CVE-2025-12735 affects older expr-eval versions, requiring explicit function allowlisting in v3.0.0+.

## Scope

**Investigated:**
- Naming conventions across 6 production workflow engines
- Template interpolation patterns and security models
- Expression evaluation libraries and sandboxing approaches
- Security vulnerabilities in JavaScript template engines (CVE-2025-12735, vm2 deprecation)
- TypeScript/Node.js library ecosystem for safe template processing

**Out of scope:**
- Playbook YAML parsing/loading (covered by playbook-yaml feature)
- Action execution logic (covered by playbook-engine feature)
- State management and persistence (covered by playbook-definition feature)

## Methods

- **Code review**: Analyzed Catalyst codebase for existing placeholder replacement patterns
- **Documentation review**: Read official docs for GitHub Actions, GitLab CI, Argo, AWS Step Functions, Tekton, Helm
- **Web research**: Security advisories (NVD, GitHub Advisory Database), library documentation
- **Prototyping**: Created proof-of-concept implementations with LiquidJS and expr-eval-fork
- **Competitive analysis**: Compared syntax patterns, security models, and developer experience across platforms

## Sources

- [GitHub Actions Expression Syntax](https://docs.github.com/en/actions/learn-github-actions/expressions) - Expression evaluation and context objects (2024-11-20)
- [GitLab CI Input Interpolation](https://docs.gitlab.com/ee/ci/inputs/) - Type-aware interpolation with predefined functions (2024-11-15)
- [Argo Workflows Variables](https://argo-workflows.readthedocs.io/en/latest/variables/) - Simple tags and expression tags (2024-11-10)
- [AWS Step Functions JSONata](https://docs.aws.amazon.com/step-functions/latest/dg/transforming-data.html) - Modern query language for transformations (2024-11-01)
- [Tekton Variables](https://tekton.dev/docs/pipelines/variables/) - Parameter substitution patterns (2024-10-25)
- [Helm Chart Templates](https://helm.sh/docs/chart_template_guide/) - Go template engine patterns (2024-10-15)
- [CVE-2025-12735: expr-eval RCE](https://nvd.nist.gov/vuln/detail/CVE-2025-12735) - Critical vulnerability in expression evaluator (2025-01-10)
- [vm2 CVEs](https://github.com/advisories?query=vm2) - Multiple critical vulnerabilities leading to deprecation (2023-04-15)
- [LiquidJS Documentation](https://liquidjs.com/) - Security-first template engine (2024-11-01)
- [expr-eval-fork](https://www.npmjs.com/package/expr-eval-fork) - Patched fork with function allowlisting (2025-01-15)

## Technical Context

**Current implementation:**
- Basic placeholder replacement exists in `src/playbooks/scripts/github/templates.ts`
- Uses simple regex-based string substitution for `{{variable}}` patterns
- No expression evaluation capability
- No path protocol resolution
- No security hardening

**Component owners:**
- **Template Engine**: To be implemented (this feature)
- **Playbook Engine**: Uses template engine for step configuration interpolation
- **Actions**: Receive interpolated configuration from engine

**Integration points:**
- **Playbook Engine** (`src/playbooks/runtime/engine.ts`): Calls template engine before action execution
- **Path Protocols** (`xe://`, `catalyst://`): Resolved during template interpolation
- **Secret Manager**: Masks sensitive values in interpolated output

**Reuse opportunities:**
- LiquidJS already used in Catalyst for other templating needs
- expr-eval-fork can replace unsafe eval() patterns elsewhere in codebase
- Path protocol resolution can be extracted as standalone utility

## Naming Convention Analysis

### Industry Comparison

| System | Property Names | Rationale |
|--------|---------------|-----------|
| **GitHub Actions** | kebab-case | YAML readability, familiar to developers |
| **GitLab CI** | snake_case | Legacy Unix conventions |
| **Argo Workflows** | camelCase | Go/Kubernetes conventions |
| **AWS Step Functions** | PascalCase | JSON Schema standard |
| **Tekton Pipelines** | camelCase | Kubernetes conventions |
| **Helm** | camelCase | Go template conventions |

### Key Findings

1. **No universal standard** - Each platform follows ecosystem conventions
2. **GitHub Actions limitation** - Kebab-case inputs cannot be accessed as environment variables in POSIX shells (e.g., `$MY-INPUT` invalid in bash)
3. **Kubernetes ecosystem** - Strongly favors camelCase due to Go conventions
4. **Mixed approaches** - GitHub uses kebab-case for workflow properties but camelCase for some action inputs

### Recommendation

**Use kebab-case** for all YAML properties (aligns with current spec):

**Rationale:**
- Matches GitHub Actions (most familiar to developers)
- More readable in YAML than camelCase
- Avoids PascalCase/camelCase ambiguity
- Consistent with Catalyst spec (FR-1.6 in playbook-definition)

**Mitigation for shell access:**
- Template engine auto-normalizes variables: `{{my-var}}` → `MY_VAR` for shell environment
- Documentation clearly states naming convention

## Template Interpolation Patterns

### Syntax Comparison

| System | Syntax | Security | Capabilities |
|--------|--------|----------|--------------|
| **GitHub Actions** | `${{ expr }}` | Sandboxed, function allowlist | Boolean/math operators, predefined functions |
| **GitLab CI** | `$[[ input ]]` | Type-safe, no code execution | Input interpolation, 3 predefined functions |
| **Argo Workflows** | `{{variable}}` | Read-only string replacement | Variable substitution only |
| **AWS Step Functions** | `{% expr %}` (JSONata) | Declarative queries | Transformations, path queries |
| **Tekton** | `$(params.name)` | Read-only replacement | Parameter substitution only |
| **Helm** | `{{ .Values.key }}` | Server-side, trusted templates | Full Go template language |

### Catalyst Design Decision

**Dual syntax approach:**
1. `{{variable}}` - Simple variable substitution (LiquidJS)
2. `${{ expression }}` - JavaScript code evaluation (expr-eval-fork)

**Rationale:**
- Familiar to GitHub Actions users
- Clear distinction between safe (variables) and powerful (code)
- Backward compatible with current spec
- Easy to parse (different delimiters)

## Expression Evaluation Libraries

### Security Analysis

| Approach | Security Level | Use Case |
|----------|---------------|----------|
| **String Replacement** | ✅ Safest | Simple workflows |
| **Declarative Query** (JsonPath) | ✅ Safe | Data extraction |
| **Function Allowlist** (GitHub Actions) | ✅ Safe | Conditional logic |
| **Sandboxed Runtime** (QuickJS/LiquidJS) | ⚠️ Medium | Complex expressions |
| **eval() / Function()** | ❌ Dangerous | **NEVER USE** |

### Critical Vulnerabilities

**CVE-2025-12735: expr-eval RCE**
- **Affected**: expr-eval < v3.0.0, expr-eval-fork < v3.0.0
- **Impact**: CVSS 9.8 Critical - Remote code execution via malicious function objects
- **Fix**: expr-eval-fork v3.0.0+ with explicit function allowlist
- **Mitigation**: Reject function objects in context, validate all inputs

**vm2 Deprecation**
- **Status**: Multiple CVEs (CVE-2023-29017: CVSS 10.0)
- **Recommendation**: Do NOT use vm2 for sandboxing
- **Alternatives**: isolated-vm, QuickJS via WebAssembly

### Library Comparison

#### Simple String Replacement (Recommended for `{{variable}}`)

**Approach:**
- Custom regex-based replacement: `/\{\{([^}]+)\}\}/g`
- Direct context lookup with dot notation support
- No external template engine needed

**Pros:**
- Zero dependencies for simple interpolation
- Predictable, fast, minimal overhead
- Full control over variable resolution
- No learning curve

**Cons:**
- Must implement dot notation parsing ourselves
- No built-in filters/helpers

**Verdict:** ✅ Recommended - simpler than LiquidJS for our needs

#### LiquidJS (Alternative - Not Recommended)

**Pros:**
- Security-first design, rich features, filters/tags

**Cons:**
- Heavy dependency for simple string substitution
- Learning curve, overkill for our use case

**Verdict:** ❌ Too complex for simple `{{variable}}` interpolation

#### expr-eval-fork v3.0.0+ (Expression Evaluation)

**Pros:**
- CVE-2025-12735 patched
- Explicit function allowlist
- Active maintenance
- Math and boolean operators
- No Node.js API access
- Parses and evaluates JavaScript expressions

**Cons:**
- Limited to expressions (no loops, variable declarations)
- Requires manual function registration

**Verdict:** ✅ Recommended for `${{ expression }}` syntax

**Key difference from QuickJS:**
- expr-eval-fork: Evaluates **expressions only** (no statements, no side effects) - lightweight, fast
- QuickJS: Runs **full JavaScript** including statements, loops, function declarations - heavier, true VM isolation
- For our use case: expr-eval-fork sufficient for conditional logic and math

## Migration / Compatibility Considerations

**No data migration required** - This is a new implementation.

**Backward compatibility:**
- Existing `{{variable}}` patterns in YAML remain valid
- `${{ expression }}` syntax is new, opt-in for advanced logic
- Path protocols (`xe://`, `catalyst://`) are additive

**Versioning impact:**
- Template engine version must be tracked for future changes
- Expression syntax is part of playbook format version
- Breaking changes to `get()` function require major version bump

## Open Questions

- Q001: What timeout value should we use for expression evaluation (current: 10s)? — Owner: @flanakin — ETA: 2025-12-10
- Q002: Should we add caching for parsed expressions to improve performance? — Owner: @flanakin — ETA: 2025-12-15

## Decision Log

- **Decision**: Use dual syntax `{{variable}}` and `${{ expression }}`
  - Rationale: Clear separation of concerns, familiar to GitHub Actions users, easier to secure
  - Alternatives considered: Single syntax (ambiguous), `$[]` like GitLab (less familiar), `$()` like Tekton (conflicts with shell)
  - Date: 2025-11-27
  - Owner: @flanakin

- **Decision**: Custom regex-based string interpolation for `{{variable}}`
  - Rationale: Simple, zero dependencies, full control, no overkill
  - Alternatives considered: LiquidJS (too complex), Handlebars (overkill), Mustache (still a dependency)
  - Date: 2025-11-29
  - Owner: @flanakin

- **Decision**: expr-eval-fork v3.0.0+ for expression evaluation
  - Rationale: CVE-2025-12735 patched, function allowlist enforced, sufficient for workflows
  - Alternatives considered: mathjs (overkill), vm2 (deprecated), jexl (less active)
  - Date: 2025-11-27
  - Owner: @flanakin

- **Decision**: Multi-layer security approach
  - Rationale: Defense in depth, no single point of failure, industry best practice
  - Alternatives considered: Single sandbox layer (insufficient), trust-based (dangerous)
  - Date: 2025-11-27
  - Owner: @flanakin

- **Decision**: Require `get()` function for variable access in `${{ }}` expressions
  - Rationale: Explicit variable access, prevents prototype pollution, clear to developers
  - Alternatives considered: Direct variable access (security risk), implicit context binding (magic)
  - Date: 2025-11-27
  - Owner: @flanakin

## References

### Implementation Artifacts
- [playbook-template-engine/spec.md](./spec.md) - Feature specification
- [playbook-template-engine/plan.md](./plan.md) - Implementation plan (to be created)
- [playbook-template-engine/tasks.md](./tasks.md) - Task breakdown (to be created)

### External Resources
- [LiquidJS GitHub](https://github.com/harttle/liquidjs)
- [expr-eval-fork NPM](https://www.npmjs.com/package/expr-eval-fork)
- [QuickJS WebAssembly](https://github.com/sebastianwessel/quickjs)
- [OWASP Code Injection](https://owasp.org/www-community/attacks/Code_Injection)
