---
id: req-traceability
title: Requirement Traceability
author: "@flanakin"
description: "This document defines requirements for bidirectional traceability between feature specifications and code/test implementations."
dependencies: []
---

<!-- markdownlint-disable single-title -->

# Feature: Requirement Traceability

## Problem

Development teams cannot programmatically verify that all specified requirements are implemented and tested. Without traceability, code changes risk breaking requirements undetected, refactoring makes it unclear if requirements are still met, and manual auditing is time-consuming and error-prone.

## Goals

1. **Lightweight annotation**: Enable developers to mark code and tests with requirement IDs using simple comment syntax that works across all languages
2. **Automated coverage**: Provide tooling to discover which requirements are implemented, which are tested, and which are missing
3. **Bidirectional navigation**: Allow navigation from requirement → code and code → requirement for impact analysis and verification

Explicit non-goals:

- Visual traceability matrix UI (Phase 3 enhancement)
- Real-time IDE integration beyond code navigation (Phase 3 enhancement)
- Automatic requirement extraction from code comments (out of scope)

## Scenario

- As a **developer**, I need to annotate my code with requirement IDs so that automated tools can verify coverage and reviewers can trace my work to specifications
  - Outcome: Developer adds `@req` annotation in <30 seconds; annotation is visible in code review

- As a **code reviewer**, I need to verify that PR changes implement the specified requirements so that I can approve with confidence
  - Outcome: Reviewer can see `@req` annotations in diff and cross-reference with spec

- As a **product manager**, I need to see which requirements are implemented vs. missing so that I can assess feature completeness
  - Outcome: Coverage report shows 84% implemented, 7 requirements missing with file locations

- As an **developer**, I need clear requirement IDs to reference when writing code so that my implementation can be traced and verified
  - Outcome: Agent reads spec, understands requirement IDs, annotates generated code correctly

- As a **developer**, I need to know which requirements are affected by my changes so that I can ensure nothing breaks
  - Outcome: Moving a function preserves its `@req` annotation; scanner detects if coverage changes

## Success Criteria

1. **Annotation speed**: Developer can annotate code with requirement ID in <30 seconds
2. **Scan performance**: Scanner discovers all annotations in <5 seconds for 50K LOC codebase
3. **Coverage accuracy**: Zero false positives for orphaned annotations (code refs non-existent requirement)
4. **Adoption friction**: New contributor can use the system without training (documentation only)
5. **Coverage visibility**: Teams achieve 80%+ coverage on functional requirements within 2 sprints

## Design Principles

**Favor immutability over convenience**
> Requirement IDs are permanent identifiers, never changed or reused. This prevents broken links across code, issues, PRs, and documentation. When requirements evolve (split, merge, delete), deprecate the old ID and create new ones. This tradeoff prioritizes long-term traceability over short-term convenience of renumbering.

**Optimize for annotation at code review, not code writing**
> The primary value of traceability is verification during review, not during initial coding. Annotations should be visible in diffs and require minimal ceremony. IDE integration is nice-to-have, but the system must work with only text editors and grep.

**Start with detection, not enforcement**
> Report coverage gaps without failing builds. Teams should see value before enforcement creates friction. Configurable thresholds let teams increase strictness as maturity grows.

## Requirements

### Functional Requirements

#### FR:id: Requirement Identifier Format

- **FR:id.format**: System MUST use consistent requirement identifiers with format `{TYPE}:[{scope}/]{path}`
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

- **FR:id.immutable**: Requirement IDs SHOULD be stable and immutable
  - Renaming, reordering, or moving requirements SHOULD NOT change their IDs
  - IDs once assigned SHOULD NOT be reused, even for deleted requirements
  - Enforcement is user responsibility; AI detection may warn on changed IDs

#### FR:state: Requirement State

- **FR:state.values**: System MUST support the following requirement states
  - `active`: Default state; requirement is in scope for implementation (no marker needed)
  - `deferred`: Intentionally not implementing this phase
  - `deprecated`: Superseded by another requirement; should not be used

- **FR:state.marker**: Spec files MUST use `[state]` marker after requirement ID for non-active states
  - Format: `- **FR:path**: [state] Description text`
  - Example: `- **FR:auth.oauth**: [deferred] OAuth integration for third-party login`
  - Active requirements have no marker (default state)

- **FR:state.deprecated-format**: Deprecated requirements MUST retain original content with migration note
  - Format: `- ~~**FR:old.path**~~: [deprecated: FR:new.path] Original description text`
  - Use strikethrough for visual indication in rendered markdown
  - Migration target appears after colon in brackets
  - Scanner provides migration guidance when deprecated IDs are referenced

#### FR:annotation: Code Annotations

- **FR:annotation.tag**: System MUST support requirement annotations using `@req` tag
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

- **FR:annotation.language-compat**: Annotations MUST work with language-specific documentation tools
  - Must not conflict with reserved tags (JSDoc `@param`, Python `@type`, etc.)
  - `@req` is non-standard tag that documentation parsers ignore

#### FR:scan: Coverage Scanning

- **FR:scan.code**: System MUST scan source files for `@req` annotations
  - Scans configurable source directories (default: `src/`)
  - Extracts requirement ID, file path, line number

- **FR:scan.tests**: System MUST scan test files for `@req` annotations
  - Scans configurable test directories (default: `tests/`, `__tests__/`)
  - Distinguishes test annotations from implementation annotations

- **FR:scan.features**: System MUST parse feature spec files to extract defined requirements
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

- **FR:scan.tasks**: System SHOULD scan tasks.md files for `@req` references
  - Extract requirement IDs from task descriptions (indented bullets under task)
  - Short-form IDs assume current feature scope (derived from directory)
  - Cross-feature references MUST use fully-qualified IDs
  - Validate all referenced requirements exist in specs
  - Report tasks with missing requirement references as warnings

#### FR:analysis: Coverage Analysis

- **FR:analysis.missing**: System MUST detect requirements defined in specs but not implemented
  - Compare spec requirements against code/test annotations
  - Report missing implementations with requirement ID and spec location

- **FR:analysis.orphan**: System MUST detect orphaned annotations (reference non-existent requirement)
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
  - **FR:analysis.coverage.tasks**: [SHOULD] Analyze task-to-requirement coverage
    - Detect requirements with no tasks (planning gap)
    - Detect tasks with no @req references (untracked work)

#### FR:report: Traceability Report

- **FR:report.output**: System MUST generate traceability reports
  - **FR:report.output.json**: System MUST generate JSON report with complete traceability data
    - Include metadata: scan timestamp, files scanned, scan duration
    - Include per-requirement: spec location, spec text, implementations, tests, status
    - Include orphaned annotations with file locations
    - Include summary statistics
  - **FR:report.output.terminal**: System MUST generate human-readable terminal summary
    - Display total requirements, implemented count, tested count
    - Display coverage percentages for implementation and test
    - List missing requirements with spec file locations
    - List orphaned annotations with suggested fixes

- **FR:report.content**: Report MUST include comprehensive requirement data
  - **FR:report.content.spec-text**: Report MUST include full requirement spec text
    - Enables offline review without cross-referencing spec files
    - Supports AI analysis of requirement coverage
  - **FR:report.content.metrics**: Report MUST include separate coverage metrics
    - Implementation coverage: % of active requirements with code annotations
    - Test coverage: % of active requirements with test annotations
    - Task coverage: % of active requirements referenced by tasks (when tasks.md scanned)
    - Per-feature breakdown of coverage metrics
  - **FR:report.content.tasks**: Report SHOULD include task-to-requirement mapping
    - List of tasks with their @req references
    - Requirements not covered by any task (planning gaps)
    - Tasks without @req references (untracked work)

#### FR:integration: Build/CI Integration

- **FR:integration.thresholds**: System SHOULD support configurable coverage thresholds
  - Configuration in `.xe/config/catalyst.json`
  - Default: Report only (no failure)
  - Optional: Fail if coverage below threshold

### Non-functional Requirements

#### NFR:docs: Documentation

- **NFR:docs.internal**: Internal documentation MUST include annotation convention guide
  - Location: `docs-wiki/` or `CONTRIBUTING.md`
  - Content: ID format, placement guidelines, examples for common patterns

- **NFR:docs.external**: Public documentation MUST explain traceability integration
  - Location: `docs/`
  - Target audience: Catalyst users adopting traceability
  - Content: Setup, configuration, CLI usage, best practices

#### NFR:perf: Performance

- **NFR:perf.scan-time**: Scanner MUST complete in <5 seconds for 50K LOC codebase
  - Parallel file reading, compiled regex, no AST parsing
  - Measured on standard development machine

- **NFR:perf.memory**: Scanner SHOULD use <100MB memory during scan
  - Stream processing, avoid loading all files in memory

#### NFR:test: Testability

- **NFR:test.scanner-coverage**: Scanner MUST have comprehensive test coverage (>90%)
  - Unit tests for regex patterns, edge cases
  - Integration tests with sample codebases

- **NFR:test.parser-robustness**: Spec parser MUST handle malformed specs gracefully
  - Return partial results with warnings, not failures
  - Test with edge cases (empty specs, missing sections, malformed IDs)

#### NFR:compat: Backward Compatibility

- **NFR:compat.annotation-format**: Annotation format MUST remain stable across versions
  - `@req` tag format is permanent contract
  - New modifiers (`:partial`) are additive, not breaking

## Key Entities

Entities owned by this feature:

- **RequirementId**: Unique identifier for a requirement
  - Short-form: `{TYPE}:{path}` (used in specs)
  - Qualified: `{TYPE}:{scope}/{path}` (used in code annotations)
  - Components: type (FR|NFR|REQ), scope (string), path (string)

- **RequirementState**: Lifecycle state of a requirement in the spec
  - Values: `active` (default), `deferred`, `deprecated`, `not-applicable`
  - Determines whether requirement counts toward coverage metrics

- **RequirementAnnotation**: Code location referencing a requirement
  - Properties: requirementId, filePath, lineNumber, isPartial, isTest

- **TraceabilityReport**: Coverage analysis output
  - Properties: requirements (map), orphaned (array), summary (stats)

- **CoverageStatus**: Implementation status derived from annotations
  - Values:
    - `missing`: Active requirement with no code annotation (gap)
    - `implemented`: Has code annotation(s)
    - `implemented-partial`: Has only partial implementation annotation(s)
    - `tested`: Has test annotation(s)
    - `deferred`: Spec state is deferred (excluded from coverage)
    - `deprecated`: Spec state is deprecated (excluded from coverage)

Inputs:

- Source code files with `@req` annotations (any language with comments)
- Feature spec files (`.xe/features/*/spec.md`) with requirement definitions
- Initiative spec files (`.xe/initiatives/*/spec.md`) with requirement definitions
- Configuration (optional): coverage thresholds, exclude patterns

Outputs:

- **Traceability Report (JSON)**:

  ```json
  {
    "metadata": {
      "scanTime": "2024-01-15T10:30:00Z",
      "filesScanned": 142,
      "scanDurationMs": 1234
    },
    "requirements": {
      "FR:auth/sessions.lifecycle.expiration": {
        "spec": {
          "file": ".xe/features/auth/spec.md",
          "line": 45,
          "text": "sessions.lifecycle.expiry**: Sessions MUST automatically expire after 90 minutes"
        },
        "state": "active",
        "implementations": [
          { "file": "src/auth/session.ts", "line": 42, "partial": false }
        ],
        "tests": [
          { "file": "tests/auth/session.test.ts", "line": 15 }
        ],
        "coverageStatus": "tested"
      },
      "FR:auth/sessions.lifecycle.inactivity": {
        "spec": {
          "file": ".xe/features/auth/spec.md",
          "line": 78,
          "text": "Sessions MUST automatically end if inactive for more than 15 minutes"
        },
        "state": "deferred",
        "implementations": [],
        "tests": [],
        "coverageStatus": "deferred"
      }
    },
    "orphaned": [
      { "id": "FR:old-feature/removed-req", "locations": ["src/legacy/handler.ts:23"] }
    ],
    "tasks": {
      "T003": {
        "file": ".xe/features/auth/tasks.md",
        "line": 30,
        "description": "Unit tests for session expiry",
        "requirements": ["FR:auth/sessions.lifecycle.expiration"]
      },
      "T004": {
        "file": ".xe/features/auth/tasks.md",
        "line": 38,
        "description": "Implement session validation",
        "requirements": []
      }
    },
    "summary": {
      "total": 45,
      "active": 43,
      "implemented": 38,
      "tested": 35,
      "missing": 5,
      "deferred": 2,
      "implementationCoverage": 88.4,
      "testCoverage": 81.4,
      "taskCoverage": 72.1,
      "tasksWithoutRequirements": 3
    }
  }
  ```

- **Terminal Summary**:

  ```text
  Requirement Traceability Report
  ================================
  Features scanned: 5
  Total requirements: 45 (43 active, 2 deferred)

  Coverage (of active requirements):
    Implemented: 38 (88.4%)
    Tested: 35 (81.4%)
    Planned: 31 (72.1%)
    Missing: 5

  Orphaned annotations: 1
  Tasks without requirements: 3

  Missing requirements (gaps):
    - FR:playbook-engine/execution.resume (.xe/features/playbook-engine/spec.md:78)
    - ...

  Deferred requirements:
    - FR:auth/oauth (.xe/features/auth/spec.md:92)
    - ...

  Tasks without @req references:
    - T001: Create project structure (.xe/features/auth/tasks.md:15)
    - ...
  ```

## Dependencies

**Internal Dependencies:**

None

**External Dependencies:**

None

## References

- Research: [research.md](./research.md)
- Standards: ISO/IEC/IEEE 29148 (Requirements Engineering)
- Related Industry: [Inflectra Requirements Traceability](https://www.inflectra.com/Ideas/Topic/Requirements-Traceability.aspx)
