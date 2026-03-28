---
id: req-traceability
title: Requirement Traceability
author: "@flanakin"
description: "This document defines requirements for bidirectional traceability between feature specifications and code/test implementations."
dependencies: []
---

<!-- markdownlint-disable single-title -->

# Feature: Requirement Traceability

## Purpose

Provides bidirectional traceability between feature specifications and code/test implementations using lightweight `@req` annotations. Enables developers to mark code and tests with requirement IDs using simple comment syntax, automated tooling to discover which requirements are implemented, tested, and missing, and navigation from requirement to code and code to requirement for impact analysis and verification.

Non-goals:

- Visual traceability matrix UI (Phase 3 enhancement)
- Real-time IDE integration beyond code navigation (Phase 3 enhancement)
- Automatic requirement extraction from code comments (out of scope)

## Design Principles

**Favor immutability over convenience**
> Requirement IDs are permanent identifiers, never changed or reused. This prevents broken links across code, issues, PRs, and documentation. When requirements evolve (split, merge, delete), deprecate the old ID and create new ones. This tradeoff prioritizes long-term traceability over short-term convenience of renumbering.

**Optimize for annotation at code review, not code writing**
> The primary value of traceability is verification during review, not during initial coding. Annotations should be visible in diffs and require minimal ceremony. IDE integration is nice-to-have, but the system must work with only text editors and grep.

**Default to detection, not enforcement**
> Report coverage gaps without failing builds. Teams should see value before enforcement creates friction. Configurable thresholds let teams increase strictness as maturity grows.

## Scenarios

### FR:id (P5): Requirement Identifier Format

Developer needs consistent, immutable requirement identifiers so that annotations in code, tests, tasks, and documentation can be cross-referenced reliably.

- **FR:id.format** (P2): System MUST use consistent requirement identifiers with format `{TYPE}:[{scope}/]{path}`
  - `TYPE`: Requirement type (`FR`, `NFR`, `REQ`)
  - `scope`: Feature or initiative ID (kebab-case)
  - `path`: Hierarchical requirement path (dot-separated, up to 5 levels)
  - **FR:id.format.short**: Spec files SHOULD use short-form IDs (without scope)
    - Format: `**{TYPE}:{path}**:` followed by description
    - Example in spec: `- **FR:sessions.lifecycle.expiry**: Sessions MUST automatically expire...`
    - Short-form used within the spec file where scope is implicit from directory
  - **FR:id.format.full**: Code annotations MUST use fully-qualified IDs (with scope)
    - Format: `{TYPE}:{scope}/{path}`
    - Example: `FR:my-feature/sessions.lifecycle.expiry`
    - Scanner combines spec directory with short-form ID to build qualified ID

- **FR:id.immutable** (P5): Requirement IDs SHOULD be stable and immutable
  - Renaming, reordering, or moving requirements SHOULD NOT change their IDs
  - IDs once assigned SHOULD NOT be reused, even for deleted requirements
  - Enforcement is user responsibility; AI detection may warn on changed IDs

### FR:state (P5): Requirement State

Developer needs to mark requirements as deferred, deprecated, or exempt so that traceability analysis can distinguish intentional gaps from missing coverage.

- **FR:state.values**: System MUST support the following requirement states
  - `active`: Default state; requirement is in scope for implementation (no marker needed)
  - `deferred`: Intentionally not implementing this phase
  - `deprecated`: Superseded by another requirement; should not be used
  - `@req:exempt`: Active requirement exempt from `@req` coverage (human convention that cannot be programmatically verified)
    - Format: `[@req:exempt=reason]` where reason is a short justification
    - Example: `[@req:exempt=human convention]`, `[@req:exempt=process only]`
    - Reason is required to document why coverage is not applicable

- **FR:state.marker**: Spec files MUST use `[state]` marker after requirement ID for non-active states
  - Format: `- **FR:path**: [state] Description text`
  - Example: `- **FR:auth.oauth**: [deferred] OAuth integration for third-party login`
  - Active requirements have no marker (default state)

- **FR:state.deprecated-format**: Deprecated requirements MUST retain original content with migration note
  - Format: `- ~~**FR:old.path**~~: [deprecated: FR:new.path] Original description text`
  - Use strikethrough for visual indication in rendered markdown
  - Migration target appears after colon in brackets
  - Scanner provides migration guidance when deprecated IDs are referenced

### FR:priority (P5): Requirement Priority Classification

Developer needs priority classification on requirements so that traceability expectations scale with importance — critical requirements demand code + tests while informational ones need no code tracing.

- **FR:priority.levels**: System MUST support priority classification for requirements using P1-P5 scale
  - `P1` (Critical): Core functionality, security, data integrity - MUST have code + tests
  - `P2` (Important): Key features, error handling, integration points - MUST have code
  - `P3` (Standard): Regular functionality, validation, formatting - SHOULD have code (default)
  - `P4` (Minor): Convenience features, optimizations, edge cases - MAY have code
  - `P5` (Informational): Documentation, process, non-code deliverables - No code tracing expected

- **FR:priority.syntax**: Spec files MUST support inline priority suffix on requirement IDs
  - Format: `- **FR:path** (P{n}): Description text`
  - Example: `- **FR:auth.session** (P1): Session management must use secure tokens`
  - Priority marker is optional; defaults to P3 if not specified
  - Parser extracts priority from parenthetical suffix

- **FR:priority.defaults**: System MUST apply default priority P3 when not specified
  - Enables gradual adoption without requiring all specs to be updated
  - Teams can add priority markers incrementally to critical requirements

- **FR:priority.filtering**: System MUST support priority-based coverage filtering
  - Option: `minPriority` parameter (default: P3)
  - Only requirements at or above threshold count toward coverage metrics
  - P4 and P5 requirements excluded from default coverage calculations
  - Example: `minPriority: 'P2'` reports on P1 and P2 requirements only

- **FR:priority.reporting**: Coverage reports MUST include priority breakdown
  - Show count of requirements by priority level
  - Show coverage percentage per priority level
  - Highlight uncovered P1/P2 requirements prominently

### FR:annotation (P5): Code Annotations

Developer needs a simple, language-agnostic annotation syntax so that code and test files can be linked to requirements without tooling dependencies.

- **FR:annotation.tag** (P1): System MUST support requirement annotations using `@req` tag
  - Format: `@req {TYPE}:{scope}/{path}`
  - Works with any comment syntax in any programming language

- **FR:annotation.single-line**: System MUST support `@req` in single-line comments
  - Examples: `// @req`, `# @req`, `-- @req`, `' @req`
  - Example:

    ```typescript
    // @req FR:auth/sessions.lifecycle.expiration
    function checkSessionLength(name: string): string { ... }
    ```

- **FR:annotation.block**: System MUST support `@req` in block comments
  - Examples: `/* */`, `/** */`, `<!-- -->`, `""" """`, `=begin =end`
  - Example:

    ```typescript
    /**
     * Interpolates variables in template strings.
     * @req FR:auth/sessions.lifecycle.expiration
     */
    function checkSessionLength(name: string): string { ... }
    ```

- **FR:annotation.multi-line**: System MUST support multiple `@req` tags on separate lines
  - Each `@req` on its own line for visibility in code review diffs
  - Example:

    ```typescript
    // @req FR:auth/sessions.lifecycle.expiration
    // @req FR:auth/sessions.lifecycle.inactivity
    async function isSessionValid(): Promise<JSONSchema> { ... }
    ```

- **FR:annotation.multi-inline**: System MAY support comma-separated requirements on single line
  - Format: `@req id1, id2, id3`
  - Example:

    ```typescript
    // @req FR:auth/sessions.lifecycle.expiration, FR:auth/sessions.lifecycle.inactivity
    async function isSessionValid(): Promise<JSONSchema> { ... }
    ```

- **FR:annotation.partial**: System MUST support partial implementation marker
  - Format: `@req:partial {requirement-id}`
  - Indicates this file contributes to requirement but is not complete implementation
  - Scanner reports partial implementations separately from full implementations

- **FR:annotation.tests**: Test files MUST use same `@req` tag to annotate verified requirements
  - Place near test case or describe block
  - Example:

    ```typescript
    describe('Step validation', () => {
      // @req FR:auth/sessions.lifecycle.inactivity
      it('should reject inactive session', () => { ... });
    });
    ```

- **FR:annotation.language-compat** (P5): Annotations MUST work with language-specific documentation tools
  - Must not conflict with reserved tags (JSDoc `@param`, Python `@type`, etc.)
  - `@req` is non-standard tag that documentation parsers ignore

- **FR:annotation.placement** (P5): Annotations SHOULD be placed on specific code constructs
  - Place on functions, methods, classes, or interfaces that implement the requirement
  - Avoid file-level annotations (top of file without function context) as they lack specificity
  - Reference the most specific requirement that applies (prefer leaf nodes over parent groupings)
  - Parent requirement annotations are valid when code implements the parent concept directly
  - In test files, `@req` annotations SHOULD be on `it()`/`test()` or `describe()` blocks — not at file level outside any test construct
  - Example of good placement:

    ```typescript
    /**
     * Validates session tokens.
     * @req FR:auth/session.validation.token-format
     */
    function validateToken(token: string): boolean { ... }
    ```

  - Example of poor placement (file-level cop-out):

    ```typescript
    // @req FR:auth/session  <-- Too vague, no function context

    export function validateToken() { ... }
    export function refreshToken() { ... }
    ```

- **FR:annotation.file-level-detection** (P2): Scanner MUST detect annotations placed at file level and flag them as file-level cop-outs in the traceability report
  - Scanner determines annotation scope by checking if a code construct (function, class, method, interface, `describe`, `it`, `test`) follows within a configurable line threshold (default: 3 lines)
  - Annotations not followed by a code construct are classified as file-level
  - In test files, `describe()`, `it()`, and `test()` blocks count as valid code constructs
  - Report includes file-level annotations as a separate warning category

### FR:scan (P5): Coverage Scanning

Playbook Engine needs to discover all requirements and their annotations across the codebase so that coverage analysis can report gaps accurately.

- **FR:scan.code** (P1): System MUST scan source files for `@req` annotations
  - Scans configurable source directories (default: `src/`)
  - Extracts requirement ID, file path, line number

- **FR:scan.tests** (P2): System MUST scan test files for `@req` annotations
  - Scans configurable test directories (default: `tests/`, `__tests__/`)
  - Distinguishes test annotations from implementation annotations

- **FR:scan.features** (P1): System MUST parse feature spec files to extract defined requirements
  - Scan `.xe/features/*/spec.md` files
  - Extract requirement IDs, descriptions, spec text, and state markers
  - Build registry with qualified IDs

- **FR:scan.initiatives**: System MUST parse initiative spec files to extract defined requirements
  - Scan `.xe/initiatives/*/spec.md` files
  - Extract requirement IDs, descriptions, spec text, and state markers
  - Build registry with qualified IDs

- **FR:scan.exclude**: System MUST support exclude patterns for files/directories
  - Exclude test utilities, mocks, generated code
  - Configuration: `exclude: ["**/test-utils/**", "**/mocks/**"]`

- **FR:scan.gitignore**: System MUST support an option to exclude patterns defined by `.gitignore` patterns

- ~~**FR:scan.tasks**~~: [deprecated] Task scanning removed — feature-context no longer maintains tasks.md files

- **FR:scan.feature-filter**: System MUST support filtering analysis to a single feature
  - Option: `featureFilter` parameter (e.g., `'ai-provider-claude'`)
  - When specified, only scan that feature's spec.md
  - Only report annotations that reference requirements from that feature
  - Enables detailed per-feature analysis without cross-feature noise

- **FR:scan.feature-exclude**: System MUST exclude the following features from traceability reporting
  - **FR:scan.feature-exclude.blueprint**: Exclude `blueprint` feature (meta-level process documentation, not code deliverables)

### FR:scan.traceability-mode (P5): Per-Feature Traceability Mode

Developer needs to control which traceability types (code, test) apply to each feature so that features validated by non-code means (e.g., playbooks, E2E tests) don't produce false coverage warnings.

- **FR:scan.traceability-mode.frontmatter** (P2): Spec parser MUST read `traceability.code` and `traceability.test` from spec.md YAML frontmatter
  - **FR:scan.traceability-mode.frontmatter.input** (P2): Input: YAML frontmatter object `traceability` with optional `code` and `test` properties
    - Values: `"error"` (gaps fail tests), `"warning"` (gaps warn), `"inherit"` (enabled, inherit severity from parent), `"disable"` (disabled), absent (defer to parent)
  - **FR:scan.traceability-mode.frontmatter.output** (P2): Output: `TraceabilityMode` object per feature with resolved `code` and `test` values (`"error"`, `"warning"`, `"inherit"`, `"disable"`, or `undefined`)
  - Example:

    ```yaml
    ---
    id: playbook-demo
    title: Playbook Demo
    traceability:
      code: disable
      test: warning
    ---
    ```

- **FR:scan.traceability-mode.config** (P2): Config loader MUST read traceability mode defaults and per-feature overrides from `.xe/config/catalyst.json`
  - **FR:scan.traceability-mode.config.input** (P2): Input: JSON at `traceability.default` (project-wide) and `traceability.features.{key}` (per-feature), each with optional `code` and `test` properties accepting `"error"`, `"warning"`, `"inherit"`, or `"disable"`
    - Feature keys MAY contain `*` wildcards for simple glob matching (e.g., `"*-context"` matches `"feature-context"`)
  - **FR:scan.traceability-mode.config.output** (P2): Output: project defaults, per-feature overrides, and wildcard matches merged into `TraceabilityModeConfig`
  - **FR:scan.traceability-mode.config.wildcard** (P2): Config loader MUST support `*` wildcards in feature keys
    - `*` matches zero or more characters (simple glob, not full regex)
    - Exact feature key matches take priority over wildcard matches
    - When multiple wildcards match, the last defined wildcard in the config wins
  - Example:

    ```json
    {
      "traceability": {
        "default": { "code": "error", "test": "warning" },
        "features": {
          "*-context": { "code": "disable" },
          "auth": { "code": "inherit", "test": "error" }
        }
      }
    }
    ```

- **FR:scan.traceability-mode.precedence** (P2): Frontmatter MUST override config feature settings; config feature settings MUST override config defaults; config defaults MUST override system default
  - Resolution order: spec.md frontmatter > catalyst.json exact feature match > catalyst.json wildcard matches (last defined wins) > catalyst.json default > system default (`undefined` = `"warning"` behavior)
  - `"inherit"` at any level inherits the resolved severity from parent levels; if no parent specifies a severity, system default `"warning"` applies
  - `"disable"` at any level disables that traceability type regardless of parent values
  - Enables project-wide severity defaults with per-feature overrides in spec files

- **FR:scan.traceability-mode.disabled** (P2): When a traceability type resolves to `"disable"`, coverage analyzer MUST exclude those gaps from the report entirely
  - **FR:scan.traceability-mode.disabled.output** (P2): Output: requirements for the disabled type are omitted from missing-coverage entries and do not count toward coverage metrics
  - Other traceability types for the same feature remain unaffected
  - Example: `traceability.code: "disable"` suppresses code coverage gaps but test coverage gaps still report normally

- **FR:scan.traceability-mode.required** (P2): When a traceability type resolves to `"error"`, coverage gaps MUST be reported as errors that fail convention tests
  - **FR:scan.traceability-mode.required.output** (P2): Output: missing-coverage entries for the type are flagged as severity `error` in the report
  - Convention tests MUST fail when error-severity requirements lack the corresponding annotation type
  - `"warning"` severity gaps are reported but do not fail convention tests
  - `"inherit"` inherits severity from the parent config level — it does not hardcode a severity

### FR:analysis (P5): Coverage Analysis

Project Maintainer needs coverage analysis to assess feature completeness so that gaps are visible before code review and release.

- **FR:analysis.missing**: System MUST detect requirements defined in specs but not implemented
  - Compare spec requirements against code/test annotations
  - Report missing implementations with requirement ID and spec location

- **FR:analysis.orphan** (P2): System MUST detect orphaned annotations (reference non-existent requirement)
  - Verify each annotation's requirement ID exists in feature specs
  - Report orphaned annotations with file location and suggested fix

- **FR:analysis.deprecated**: System MUST detect annotations referencing deprecated requirements
  - Check annotations against deprecated requirements in specs
  - Provide migration guidance from deprecated to replacement ID

- **FR:analysis.coverage**: System MUST analyze coverage across artifact types
  - Report count and percentage of active requirements covered per type
  - Each coverage type reported separately in metrics
  - **FR:analysis.coverage.code**: Analyze code-to-requirement coverage
    - Detect requirements with no code annotations (implementation gap)
  - **FR:analysis.coverage.tests**: Analyze test-to-requirement coverage
    - A requirement with code but no test shows as "implemented, not tested"
  - ~~**FR:analysis.coverage.tasks**~~: [deprecated: FR:scan.tasks] Task coverage analysis removed — tasks.md no longer maintained
  - **FR:analysis.coverage.leaf-only** (P2): Coverage metrics MUST only count leaf-node requirements
    - A parent requirement (one with child requirements) is not counted toward coverage totals
    - Only requirements without children contribute to coverage percentages
    - Parent requirements may have annotations for organizational navigation but do not affect coverage
    - Example: `FR:auth` with children `FR:auth.login` and `FR:auth.logout` is not counted; only the children are
    - Scanner MUST detect parent/child relationships from requirement ID hierarchy (dot-separated paths)

- **FR:analysis.test-completeness** (P2): System MUST verify every active, non-deferred, non-exempt leaf FR/NFR at P1-P3 has at least one `@req` annotation in a test file
  - Skipped/pending tests with `@req` annotations count as covered
  - Requirements marked `[@req:exempt=reason]` are excluded
  - Missing test annotations are reported as test coverage gaps

- **FR:analysis.convention-tests** (P2): Project MUST include convention tests that enforce annotation quality
  - **FR:analysis.convention-tests.no-file-level** (P2): Convention test MUST fail when any `@req` annotation in source or test files is at file level without function context
  - **FR:analysis.convention-tests.test-coverage** (P2): Convention test MUST fail when any active P1-P3 leaf FR/NFR lacks a `@req` annotation in test files

### FR:report (P5): Traceability Report

Project Maintainer needs structured traceability reports so that coverage gaps and orphaned annotations are visible in both terminal output and machine-readable formats.

- **FR:report.output** (P2): System MUST generate traceability reports
  - **FR:report.output.json** (P2): System MUST generate JSON report with complete traceability data
    - Include metadata: scan timestamp, files scanned, scan duration
    - Include per-requirement: spec location, spec text, implementations, tests, status
    - Include orphaned annotations with file locations
    - Include summary statistics
  - **FR:report.output.terminal** (P2): System MUST generate human-readable terminal summary
    - Display total requirements, implemented count, tested count
    - Display coverage percentages for implementation and test
    - List missing requirements with spec file locations (leaf nodes only, exclude parent requirements)
    - List orphaned annotations with suggested fixes

- **FR:report.content**: Report MUST include comprehensive requirement data
  - **FR:report.content.spec-text**: Report MUST include full requirement spec text
    - Enables offline review without cross-referencing spec files
    - Supports AI analysis of requirement coverage
  - **FR:report.content.metrics**: Report MUST include separate coverage metrics
    - Implementation coverage: % of active requirements with code annotations
    - Test coverage: % of active requirements with test annotations
    - Per-feature breakdown of coverage metrics
  - **FR:report.content.scores** (P2): Report MUST include coverage and completeness scores
    - **FR:report.content.scores.coverage**: Coverage score measures traceability of requirements within threshold
      - Calculated as: (covered requirements within threshold / total requirements within threshold) x 100%
      - Only counts leaf-node requirements (excludes parents)
      - Threshold defined in engineering.md (default P3, meaning P1-P3 are required)
      - Example: With P3 threshold, 9/9 P1-P3 requirements covered = 100% coverage score
    - **FR:report.content.scores.completeness**: Completeness score measures weighted traceability across all priorities
      - Weights based on position: P1=5, P2=4, P3=3, P4=2, P5=1
      - Requirements beyond threshold count at half weight
      - Formula: (covered_weight) / (total_weight) x 100%
      - Example with P3 threshold: P1-P3 use full weights (5,4,3), P4-P5 use half weights (1, 0.5)
      - Encourages coverage of lower-priority requirements without penalizing incomplete optional work
  - ~~**FR:report.content.tasks**~~: [deprecated: FR:scan.tasks] Task reporting removed — tasks.md no longer maintained

### FR:integration (P5): Build/CI Integration

Developer needs configurable coverage thresholds so that traceability can progress from advisory reporting to enforcement as project maturity grows.

- **FR:integration.thresholds**: System SHOULD support configurable coverage thresholds
  - Configuration in `.xe/config/catalyst.json`
  - Default: Report only (no failure)
  - Optional: Fail if coverage below threshold

### Non-functional Requirements

#### NFR:docs (P5): Documentation

- **NFR:docs.internal** (P5): [deferred] Internal documentation MUST include annotation convention guide
  - Location: `docs-wiki/` or `CONTRIBUTING.md`
  - Content: ID format, placement guidelines, examples for common patterns

- **NFR:docs.external** (P5): [deferred] Public documentation MUST explain traceability integration
  - Location: `docs/`
  - Target audience: Catalyst users adopting traceability
  - Content: Setup, configuration, API usage, best practices

#### NFR:perf (P5): Performance

- **NFR:perf.scan-time** (P4): [deferred] Scanner MUST complete in <5 seconds for 50K LOC codebase
  - Parallel file reading, compiled regex, no AST parsing
  - Measured on standard development machine

- **NFR:perf.memory** (P4): [deferred] Scanner SHOULD use <100MB memory during scan
  - Stream processing, avoid loading all files in memory

#### NFR:test (P5): Testability

- **NFR:test.scanner-coverage** (P4): [deferred] Scanner MUST have comprehensive test coverage (>90%)
  - Unit tests for regex patterns, edge cases
  - Integration tests with sample codebases

- **NFR:test.parser-robustness** (P2): Spec parser MUST handle malformed specs gracefully
  - Return partial results with warnings, not failures
  - Test with edge cases (empty specs, missing sections, malformed IDs)

#### NFR:compat (P5): Backward Compatibility

- **NFR:compat.annotation-format** (P1): Annotation format MUST remain stable across versions
  - `@req` tag format is permanent contract
  - New modifiers (`:partial`) are additive, not breaking

## Dependencies

**Internal:**

None

**External:**

None

## References

- Research: [research.md](./research.md)
- Standards: ISO/IEC/IEEE 29148 (Requirements Engineering)
- Related Industry: [Inflectra Requirements Traceability](https://www.inflectra.com/Ideas/Topic/Requirements-Traceability.aspx)
