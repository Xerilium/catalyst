# Design Decisions: Requirement Traceability

## Annotation-Based Traceability
**Decision**: Use `@req` comment annotations in source code rather than external link files or dedicated metadata files.

**Date**: <!-- TODO: determine from git history -->

**Why**: Annotations travel with code during refactoring, appear in diffs, and are visible during code review — making traceability part of the normal workflow. Standard pattern used by Parasoft, Doxygen, and proposed for JUnit 5.

**Rejected**: External link files (drift from reality, separate maintenance burden, invisible at review time); per-feature requirements.yaml files (disconnected from implementation, easily forgotten).

## Hierarchical Requirement IDs with Immutable Names
**Decision**: Use format `{TYPE}:{scope}/{path}` with descriptive, immutable names (e.g., `FR:playbook-engine/func.validate-steps`).

**Date**: <!-- TODO: determine from git history -->

**Why**: Self-documenting and grep-friendly; grouped by feature for per-feature coverage reports; descriptive names eliminate renumbering temptation; globally unique with no cross-project conflicts.

**Rejected**: Sequential numbers only (no meaning, renumbering breaks links, no grouping); GUIDs (unmemorable, hard to discuss); dual-ID system like ReqIF (requires mapping table, IDs drift).

## Primary Files + Tests Annotation Strategy
**Decision**: Annotate primary implementation file(s) with `@req`; use `@req:partial` for distributed implementations; annotate all tests that verify a requirement.

**Date**: <!-- TODO: determine from git history -->

**Why**: Tracing to function level is the optimal balance of granularity vs. maintenance overhead. Tests provide a natural verification layer. Partial marker acknowledges distributed reality without requiring exhaustive annotation of every file.

**Rejected**: Annotate all files (annotation fatigue, maintenance nightmare); annotate entry point only (misses distributed implementations, incomplete coverage data).

## Requirement Lifecycle States
**Decision**: Support four states — `active` (default), `deferred`, `deprecated`, `not-applicable` — with deferred/deprecated/not-applicable excluded from coverage metrics.

**Date**: <!-- TODO: determine from git history -->

**Why**: The "deferred vs. missing" distinction is critical: without it, reports incorrectly flag intentionally deferred work as gaps. States are implementation-focused since specs are already approved when merged.

**Rejected**: No state model (can't distinguish gaps from intentional non-implementation); full industry lifecycle (Draft, Proposed, Approved, etc. — unnecessary since Catalyst specs are approved on merge).

## Immutable IDs via Deprecation
**Decision**: Requirement IDs never change. Splits, merges, and deletions use deprecation with forwarding references (`~~**FR:old.id**~~: [deprecated: FR:new.id]`).

**Date**: <!-- TODO: determine from git history -->

**Why**: Immutability prevents broken links in code, issues, PRs, and documentation. Deprecation trail maintains historical traceability. Matches semantic versioning philosophy.

**Rejected**: Allowing ID mutation (breaks all existing code annotations and documentation references with no automated way to find them all).

## Severity Classification (S1–S5)
**Decision**: Support five severity levels (Critical to Informational) to focus traceability effort and enable meaningful coverage thresholds.

**Date**: <!-- TODO: determine from git history -->

**Why**: Not all requirements are equally important. Severity enables tools to ask "why is this S1 requirement untraced?" rather than failing on low-value gaps. Avoids annotation fatigue from 100% coverage mandates.

**Rejected**: Auto-inference of severity from requirement text (unreliable, context-dependent); per-feature severity thresholds (teams want global thresholds, severity is a property of the requirement itself).

## Configurable Thresholds, No 100% Mandate
**Decision**: Default to 80% coverage threshold with configurable overrides; warn on orphaned annotations rather than failing.

**Date**: <!-- TODO: determine from git history -->

**Why**: Value-based traceability research shows 35% effort reduction with targeted approach vs. 100% mandates. Teams can increase strictness as maturity grows.

**Rejected**: 100% coverage mandate (annotation fatigue, low-value annotations, forces tracing of informational requirements).

## Regex-Based Language-Agnostic Scanner
**Decision**: Use a simple regex pattern to extract `@req` annotations from any file type rather than AST parsing.

**Date**: <!-- TODO: determine from git history -->

**Why**: Language-agnostic — works with any comment syntax (`//`, `#`, `/* */`) without language-specific parsers. Extensible to new languages without code changes.

**Rejected**: AST parsing per language (high complexity, additional dependencies, no meaningful accuracy gain for this annotation pattern).

## Defer Cross-Cutting Requirements
**Decision**: Do not implement a system for engineering-level cross-cutting requirements (e.g., `XE:engineering/quality.coverage`) at this time.

**Date**: <!-- TODO: determine from git history -->

**Why**: Verification tasks (TypeScript compilation, test coverage) are already implicit in Phase 5 of the development process. Explicit requirement IDs add bureaucratic overhead without new value. YAGNI applies.

**Rejected**: `engineering-standards` feature with its own spec.md (engineering standards aren't a feature); dedicated prefixes per context file (four new prefixes to learn); unified `XE:` prefix system — all deferred pending demonstrated need.
