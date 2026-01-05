---
id: req-traceability
title: Requirement Traceability
author: "@flanakin"
description: "This document defines the tasks required to fully implement the Requirement Traceability feature from scratch."
---

# Tasks: Requirement Traceability

**Input**: Design documents from `.xe/features/req-traceability/`
**Prerequisites**: plan.md (required), research.md

## Step 1: Setup

- [ ] T001: Create project structure per implementation plan
  - @req FR:id
  - @req FR:id.format
  - @req FR:annotation
  - @req FR:annotation.tag
  - @req FR:scan
  - @req FR:scan.code
  - @req FR:scan.tests
  - @req FR:scan.features
  - @req FR:scan.initiatives
  - Create `src/traceability/` directory structure
  - Create `tests/unit/traceability/` and `tests/integration/traceability/` directories
  - Create `tests/fixtures/traceability/` with sample specs and sources

- [ ] T002: Create type definitions in `src/traceability/types/`
  - @req FR:id
  - @req FR:id.format
  - @req FR:state
  - @req FR:state.values
  - @req FR:priority
  - @req FR:priority.levels
  - @req FR:annotation
  - @req FR:annotation.tag
  - @req FR:annotation.partial
  - @req FR:scan
  - @req FR:scan.code
  - @req FR:scan.tests
  - @req FR:report
  - @req FR:report.content
  - @req FR:report.content.metrics
  - `requirement.ts`: RequirementId, RequirementState, RequirementDefinition
  - `annotation.ts`: RequirementAnnotation, AnnotationLocation, ScanOptions
  - `report.ts`: TraceabilityReport, CoverageSummary, CoverageStatus, OrphanedAnnotation
  - `index.ts`: Barrel export for all types

## Step 2: Tests First (TDD)

**CRITICAL: Tests MUST be written and MUST FAIL before ANY implementation**

- [ ] T003: [P] Unit tests for RequirementId parsing in `tests/unit/traceability/parsers/id-parser.test.ts`
  - @req FR:id
  - @req FR:id.format
  - @req FR:id.format.short
  - @req FR:id.format.full
  - @req NFR:test
  - @req NFR:test.scanner-coverage
  - Test valid short-form IDs: `FR:path.to.req`
  - Test valid qualified IDs: `FR:scope/path.to.req`
  - Test all types: FR, NFR, REQ
  - Test edge cases: max depth (5 levels), single segment, numeric segments
  - Test invalid formats: missing type, invalid characters, too deep

- [ ] T004: [P] Unit tests for SpecParser in `tests/unit/traceability/parsers/spec-parser.test.ts`
  - @req FR:scan
  - @req FR:scan.features
  - @req FR:scan.initiatives
  - @req FR:state
  - @req FR:state.values
  - @req FR:state.marker
  - @req FR:state.deprecated-format
  - @req FR:priority
  - @req FR:priority.syntax
  - @req FR:priority.defaults
  - @req NFR:test
  - @req NFR:test.scanner-coverage
  - @req NFR:test.parser-robustness
  - Test single requirement extraction
  - Test multiple requirements in file
  - Test nested requirements (indented bullets)
  - Test state markers: active (none), deferred, deprecated
  - Test deprecated with migration target
  - Test malformed lines (skip with warning)
  - Test scope derivation from directory path

- [ ] T005: [P] Unit tests for AnnotationScanner in `tests/unit/traceability/parsers/annotation-scanner.test.ts`
  - @req FR:annotation
  - @req FR:annotation.tag
  - @req FR:annotation.single-line
  - @req FR:annotation.block
  - @req FR:annotation.multi-line
  - @req FR:annotation.multi-inline
  - @req FR:annotation.partial
  - @req FR:annotation.tests
  - @req FR:annotation.language-compat
  - @req FR:annotation.placement
  - @req FR:scan
  - @req FR:scan.code
  - @req FR:scan.tests
  - @req FR:scan.exclude
  - @req NFR:test
  - @req NFR:test.scanner-coverage
  - Test single-line comment: `// @req`
  - Test block comment: `/* @req */`
  - Test JSDoc block: `/** @req */`
  - Test Python comment: `# @req`
  - Test multiple @req on separate lines
  - Test comma-separated @req on single line
  - Test @req:partial marker
  - Test isTest flag based on directory

- [ ] T006: [P] Unit tests for TaskParser in `tests/unit/traceability/parsers/task-parser.test.ts`
  - @req FR:scan
  - @req FR:scan.tasks
  - @req NFR:test
  - @req NFR:test.scanner-coverage
  - @req NFR:test.parser-robustness
  - Test task extraction from tasks.md
  - Test @req references in indented bullets
  - Test tasks without @req references
  - Test parallel marker [P] handling
  - Test completed vs pending tasks

- [ ] T007: [P] Unit tests for CoverageAnalyzer in `tests/unit/traceability/analysis/coverage-analyzer.test.ts`
  - @req FR:analysis
  - @req FR:analysis.missing
  - @req FR:analysis.orphan
  - @req FR:analysis.deprecated
  - @req FR:analysis.coverage
  - @req FR:analysis.coverage.code
  - @req FR:analysis.coverage.tests
  - @req FR:analysis.coverage.tasks
  - @req FR:analysis.coverage.leaf-only
  - @req FR:priority.filtering
  - @req NFR:test
  - @req NFR:test.scanner-coverage
  - Test status: missing (no annotations)
  - Test status: implemented (has code annotation)
  - Test status: implemented-partial (only partial annotations)
  - Test status: tested (has test annotation)
  - Test status: deferred (spec state is deferred)
  - Test status: deprecated (spec state is deprecated)
  - Test orphan detection (annotation references non-existent requirement)
  - Test summary statistics calculation
  - Test coverage percentage math (active requirements only)

- [ ] T008: [P] Unit tests for reporters in `tests/unit/traceability/reports/`
  - @req FR:report
  - @req FR:report.output
  - @req FR:report.output.json
  - @req FR:report.output.terminal
  - @req FR:report.content
  - @req FR:report.content.spec-text
  - @req FR:report.content.metrics
  - @req FR:report.content.scores
  - @req FR:report.content.scores.coverage
  - @req FR:report.content.scores.completeness
  - @req FR:report.content.tasks
  - @req FR:priority.reporting
  - @req NFR:test
  - @req NFR:test.scanner-coverage
  - `json-reporter.test.ts`: Valid JSON output, all fields present, task mapping included
  - `terminal-reporter.test.ts`: Readable format, coverage percentages, missing list, tasks without requirements

- [ ] T009: Integration test for full scan workflow in `tests/integration/traceability/full-scan.test.ts`
  - @req FR:scan
  - @req FR:scan.code
  - @req FR:scan.tests
  - @req FR:scan.features
  - @req FR:scan.tasks
  - @req FR:report
  - @req FR:report.output
  - @req FR:analysis
  - @req FR:analysis.coverage
  - @req NFR:test
  - @req NFR:test.scanner-coverage
  - Create fixture with spec files, annotated sources, and tasks.md
  - Run end-to-end: parse specs → scan code → parse tasks → analyze → report
  - Verify report accuracy including task coverage

## Step 3: Core Implementation

- [ ] T010: Implement RequirementId parser in `src/traceability/parsers/id-parser.ts`
  - @req FR:id
  - @req FR:id.format
  - @req FR:id.format.short
  - @req FR:id.format.full
  - @req FR:id.immutable
  - @req NFR:compat
  - @req NFR:compat.annotation-format
  - Parse short-form and qualified IDs
  - Build qualified form from short-form + scope
  - Validate format constraints

- [ ] T011: Implement SpecParser in `src/traceability/parsers/spec-parser.ts`
  - @req FR:id.format.short
  - @req FR:scan
  - @req FR:scan.features
  - @req FR:scan.initiatives
  - @req FR:state
  - @req FR:state.values
  - @req FR:state.marker
  - @req FR:state.deprecated-format
  - @req FR:priority
  - @req FR:priority.levels
  - @req FR:priority.syntax
  - @req FR:priority.defaults
  - @req NFR:perf
  - @req NFR:perf.scan-time
  - @req NFR:test.parser-robustness
  - parseFile(): Extract requirements from single spec.md
  - parseDirectory(): Scan `.xe/features/` and `.xe/initiatives/`
  - Handle state markers and deprecated targets
  - Derive scope from directory path

- [ ] T012: Implement AnnotationScanner in `src/traceability/parsers/annotation-scanner.ts`
  - @req FR:id.format.full
  - @req FR:annotation
  - @req FR:annotation.tag
  - @req FR:annotation.single-line
  - @req FR:annotation.block
  - @req FR:annotation.multi-line
  - @req FR:annotation.multi-inline
  - @req FR:annotation.partial
  - @req FR:annotation.tests
  - @req FR:annotation.language-compat
  - @req FR:annotation.placement
  - @req FR:scan
  - @req FR:scan.code
  - @req FR:scan.tests
  - @req FR:scan.exclude
  - @req NFR:perf
  - @req NFR:perf.scan-time
  - @req NFR:perf.memory
  - @req NFR:compat
  - @req NFR:compat.annotation-format
  - scanFile(): Extract @req annotations from single file
  - scanDirectory(): Recursive scan with exclude patterns
  - Support @req:partial marker
  - Detect test files by directory

- [ ] T013: Implement TaskParser in `src/traceability/parsers/task-parser.ts`
  - @req FR:id.format.short
  - @req FR:id.format.full
  - @req FR:scan
  - @req FR:scan.tasks
  - @req NFR:perf
  - @req NFR:perf.scan-time
  - @req NFR:test.parser-robustness
  - parseFile(): Extract tasks and @req references from single tasks.md
  - parseDirectory(): Scan `.xe/features/` and `.xe/initiatives/` for tasks.md
  - Extract task ID, description, and requirement references

- [ ] T014: Implement CoverageAnalyzer in `src/traceability/analysis/coverage-analyzer.ts`
  - @req FR:state.values
  - @req FR:priority.filtering
  - @req FR:analysis
  - @req FR:analysis.missing
  - @req FR:analysis.orphan
  - @req FR:analysis.deprecated
  - @req FR:analysis.coverage
  - @req FR:analysis.coverage.code
  - @req FR:analysis.coverage.tests
  - @req FR:analysis.coverage.tasks
  - @req FR:analysis.coverage.leaf-only
  - @req NFR:perf
  - @req NFR:perf.scan-time
  - @req NFR:perf.memory
  - Build requirement, annotation, and task maps
  - Compute coverage status for each requirement
  - Detect orphaned annotations
  - Calculate summary statistics including task coverage

- [ ] T015: [P] Implement JSON reporter in `src/traceability/reports/json-reporter.ts`
  - @req FR:report
  - @req FR:report.output
  - @req FR:report.output.json
  - @req FR:report.content
  - @req FR:report.content.spec-text
  - @req FR:report.content.metrics
  - @req FR:report.content.scores
  - @req FR:report.content.scores.coverage
  - @req FR:report.content.scores.completeness
  - @req FR:report.content.tasks
  - @req FR:priority.reporting
  - Generate complete JSON report per spec format
  - Include task-to-requirement mapping

- [ ] T016: [P] Implement terminal reporter in `src/traceability/reports/terminal-reporter.ts`
  - @req FR:report
  - @req FR:report.output
  - @req FR:report.output.terminal
  - @req FR:report.content
  - @req FR:report.content.metrics
  - @req FR:report.content.scores
  - @req FR:report.content.scores.completeness
  - @req FR:report.content.tasks
  - @req FR:priority.reporting
  - Generate human-readable summary per spec format
  - Display task coverage and tasks without requirements

- [ ] T017: Implement configuration loading in `src/traceability/config/traceability-config.ts`
  - @req FR:scan
  - @req FR:scan.exclude
  - @req FR:scan.gitignore
  - @req FR:scan.feature-filter
  - @req FR:priority.filtering
  - @req FR:integration
  - @req FR:integration.thresholds
  - Load from `.xe/config/catalyst.json`
  - Default values for exclude patterns, test directories
  - Threshold configuration

## Step 4: Integration

- [ ] T018: Create public API in `src/traceability/index.ts`
  - @req FR:scan
  - @req FR:scan.code
  - @req FR:scan.tests
  - @req FR:scan.features
  - @req FR:scan.initiatives
  - @req FR:scan.tasks
  - @req FR:scan.feature-filter
  - @req FR:analysis
  - @req FR:analysis.coverage
  - @req FR:report
  - @req FR:report.output
  - Export all public types
  - Export SpecParser, AnnotationScanner, TaskParser, CoverageAnalyzer
  - Export generateJsonReport, generateTerminalReport

- [ ] T019: Add .gitignore exclude support in AnnotationScanner
  - @req FR:scan
  - @req FR:scan.gitignore
  - @req FR:scan.exclude
  - Parse .gitignore patterns
  - Apply to file scanning when respectGitignore option is true

## Step 5: Polish

- [ ] T020: [P] Performance tests in `tests/performance/traceability/`
  - @req NFR:perf
  - @req NFR:perf.scan-time
  - @req NFR:perf.memory
  - @req NFR:test
  - @req NFR:test.scanner-coverage
  - @req FR:scan
  - @req FR:scan.code
  - @req FR:scan.tests
  - @req FR:scan.features
  - Generate 50K LOC synthetic codebase
  - Verify scan completes in <5 seconds
  - Verify memory usage <100MB

- [ ] T021: [P] Write user documentation in `docs/traceability.md`
  - @req NFR:docs
  - @req NFR:docs.external
  - @req FR:id
  - @req FR:id.format
  - @req FR:id.format.short
  - @req FR:id.format.full
  - @req FR:state
  - @req FR:state.values
  - @req FR:state.marker
  - @req FR:priority
  - @req FR:priority.levels
  - @req FR:priority.syntax
  - @req FR:annotation
  - @req FR:annotation.tag
  - @req FR:annotation.placement
  - @req FR:integration
  - @req FR:integration.thresholds
  - Overview and benefits
  - ID format specification
  - Annotation syntax examples (TypeScript, Python, Go)
  - Configuration options
  - Interpreting reports
  - Best practices

- [ ] T022: Add internal documentation to `CONTRIBUTING.md`
  - @req NFR:docs
  - @req NFR:docs.internal
  - @req FR:id
  - @req FR:id.format
  - @req FR:id.format.short
  - @req FR:id.format.full
  - @req FR:id.immutable
  - @req FR:state
  - @req FR:state.values
  - @req FR:priority
  - @req FR:priority.levels
  - @req FR:annotation
  - @req FR:annotation.tag
  - @req FR:annotation.placement
  - Annotation convention guide
  - ID format rules
  - Placement guidelines

- [ ] T023: Create test fixtures in `tests/fixtures/traceability/`
  - @req NFR:test
  - @req NFR:test.scanner-coverage
  - @req NFR:test.parser-robustness
  - @req FR:state
  - @req FR:state.values
  - @req FR:state.marker
  - @req FR:state.deprecated-format
  - @req FR:priority
  - @req FR:priority.levels
  - @req FR:annotation
  - @req FR:annotation.language-compat
  - @req FR:annotation.single-line
  - @req FR:annotation.block
  - Sample spec files with various states
  - Multi-language source files with annotations
  - Edge case files (empty, malformed, etc.)

- [x] T024: Add single-feature filtering to traceability library
  - @req FR:scan
  - @req FR:scan.feature-filter
  - @req FR:scan.feature-exclude
  - @req FR:scan.feature-exclude.blueprint
  - @req FR:scan.features
  - @req FR:scan.tasks
  - @req FR:scan.code
  - @req FR:report
  - @req FR:report.output.terminal
  - Add `--feature <id>` option to dev script `scripts/run-traceability.ts`
  - Filter SpecParser to single feature directory
  - Filter TaskParser to single feature directory
  - Filter annotations to only those referencing the feature's requirements
  - Update terminal report header to show filtered feature
  - Library exports all components for future CLI integration

## Step 6: Priority Classification

- [x] T025: Add priority type to RequirementDefinition
  - @req FR:priority
  - @req FR:priority.levels
  - @req FR:priority.defaults
  - Add `priority?: 'P1' | 'P2' | 'P3' | 'P4' | 'P5'` to RequirementDefinition type
  - Default value is 'P3' when not specified

- [x] T026: Update SpecParser to extract priority markers
  - @req FR:priority
  - @req FR:priority.syntax
  - @req FR:priority.defaults
  - @req FR:scan
  - @req FR:scan.features
  - @req FR:scan.initiatives
  - Parse `(P{n})` suffix from requirement lines
  - Regex: `\(P[1-5]\)` after requirement ID
  - Store priority in RequirementDefinition
  - Apply P3 default when not specified

- [x] T027: Add priority filtering to CoverageAnalyzer
  - @req FR:priority
  - @req FR:priority.filtering
  - @req FR:analysis
  - @req FR:analysis.coverage
  - Add `minPriority` option to analysis config
  - Filter requirements by priority when calculating coverage
  - P4 and P5 excluded by default (minPriority: 'P3')

- [x] T028: Update reports to include priority breakdown
  - @req FR:priority
  - @req FR:priority.reporting
  - @req FR:report
  - @req FR:report.output
  - @req FR:report.output.json
  - @req FR:report.output.terminal
  - @req FR:report.content
  - @req FR:report.content.metrics
  - Add priority counts to summary: `{ P1: n, P2: n, P3: n, P4: n, P5: n }`
  - Add per-priority coverage percentages
  - Highlight uncovered P1/P2 requirements in terminal output
  - Include priority in JSON report per-requirement data

- [x] T029: Add --min-priority option to dev script
  - @req FR:priority
  - @req FR:priority.filtering
  - Add `--min-priority P{n}` option to `scripts/run-traceability.ts`
  - Pass to CoverageAnalyzer
  - Library supports priority filtering for future CLI integration

- [ ] T030: Unit tests for priority parsing and filtering
  - @req FR:priority
  - @req FR:priority.levels
  - @req FR:priority.syntax
  - @req FR:priority.defaults
  - @req FR:priority.filtering
  - @req FR:priority.reporting
  - @req NFR:test
  - @req NFR:test.scanner-coverage
  - Test SpecParser extracts (P1)-(P5) markers
  - Test default P3 when no marker
  - Test CoverageAnalyzer filters by priority
  - Test report includes priority breakdown

## Step 7: High-level Runner API

- [x] T031: Create runTraceabilityAnalysis function in `src/traceability/runner.ts`
  - @req FR:scan
  - @req FR:scan.code
  - @req FR:scan.tests
  - @req FR:scan.features
  - @req FR:scan.initiatives
  - @req FR:scan.tasks
  - @req FR:scan.feature-filter
  - @req FR:priority
  - @req FR:priority.filtering
  - @req FR:analysis
  - @req FR:analysis.coverage
  - @req FR:report
  - @req FR:report.output
  - @req FR:integration
  - @req FR:integration.thresholds
  - High-level API that encapsulates the full analysis workflow
  - Accepts TraceabilityRunOptions (featureFilter, minPriority, sourceDirs, etc.)
  - Returns TraceabilityRunResult (report, thresholdsMet, summaryMessage)
  - Exported from src/traceability/index.ts for library consumers

## Step 8: Leaf-Only Coverage

- [x] T032: Implement leaf-node-only coverage metrics
  - @req FR:analysis
  - @req FR:analysis.coverage
  - @req FR:analysis.coverage.leaf-only
  - @req FR:report
  - @req FR:report.content
  - @req FR:report.content.metrics
  - Add buildParentSet method to CoverageAnalyzer
  - Detect parent/child relationships from requirement ID hierarchy
  - Exclude parent requirements from active count and coverage calculations
  - Parent requirements still included in requirements map for navigation

- [x] T033: Unit tests for leaf-node detection
  - @req FR:analysis
  - @req FR:analysis.coverage
  - @req FR:analysis.coverage.leaf-only
  - @req NFR:test
  - @req NFR:test.scanner-coverage
  - Test: exclude parent requirements from active count
  - Test: multi-level parent hierarchy detection
  - Test: requirements across different scopes handled independently
  - Test: parent requirements still included in requirements map

## Dependencies

- T002 (types) blocks T003-T009 (tests need types)
- T003-T009 (tests) before T010-T017 (implementation)
- T010 (ID parser) blocks T011, T012, T013 (parsers use ID parsing)
- T011, T012, T013 (parsers) block T014 (analyzer needs parsed data)
- T014-T017 (core) before T018 (public API)
- T018 (public API) before T020-T023 (polish)
- T025 (severity types) blocks T026-T030 (severity implementation)
- T026 (parser) blocks T027 (analyzer needs severity data)
- T027 (analyzer) blocks T028-T029 (reports need filtered data)
- T032-T033 (leaf-only) depends on T014 (CoverageAnalyzer)
