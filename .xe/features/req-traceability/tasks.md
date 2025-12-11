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
  - Create `src/traceability/` directory structure
  - Create `tests/unit/traceability/` and `tests/integration/traceability/` directories
  - Create `tests/fixtures/traceability/` with sample specs and sources

- [ ] T002: Create type definitions in `src/traceability/types/`
  - `requirement.ts`: RequirementId, RequirementState, RequirementDefinition
  - `annotation.ts`: RequirementAnnotation, AnnotationLocation, ScanOptions
  - `report.ts`: TraceabilityReport, CoverageSummary, CoverageStatus, OrphanedAnnotation
  - `index.ts`: Barrel export for all types

## Step 2: Tests First (TDD)

**CRITICAL: Tests MUST be written and MUST FAIL before ANY implementation**

- [ ] T003: [P] Unit tests for RequirementId parsing in `tests/unit/traceability/parsers/id-parser.test.ts`
  - Test valid short-form IDs: `FR:path.to.req`
  - Test valid qualified IDs: `FR:scope/path.to.req`
  - Test all types: FR, NFR, REQ
  - Test edge cases: max depth (5 levels), single segment, numeric segments
  - Test invalid formats: missing type, invalid characters, too deep

- [ ] T004: [P] Unit tests for SpecParser in `tests/unit/traceability/parsers/spec-parser.test.ts`
  - Test single requirement extraction
  - Test multiple requirements in file
  - Test nested requirements (indented bullets)
  - Test state markers: active (none), deferred, deprecated
  - Test deprecated with migration target
  - Test malformed lines (skip with warning)
  - Test scope derivation from directory path

- [ ] T005: [P] Unit tests for AnnotationScanner in `tests/unit/traceability/parsers/annotation-scanner.test.ts`
  - Test single-line comment: `// @req`
  - Test block comment: `/* @req */`
  - Test JSDoc block: `/** @req */`
  - Test Python comment: `# @req`
  - Test multiple @req on separate lines
  - Test comma-separated @req on single line
  - Test @req:partial marker
  - Test isTest flag based on directory

- [ ] T006: [P] Unit tests for CoverageAnalyzer in `tests/unit/traceability/analysis/coverage-analyzer.test.ts`
  - Test status: missing (no annotations)
  - Test status: implemented (has code annotation)
  - Test status: implemented-partial (only partial annotations)
  - Test status: tested (has test annotation)
  - Test status: deferred (spec state is deferred)
  - Test status: deprecated (spec state is deprecated)
  - Test orphan detection (annotation references non-existent requirement)
  - Test summary statistics calculation
  - Test coverage percentage math (active requirements only)

- [ ] T007: [P] Unit tests for reporters in `tests/unit/traceability/reports/`
  - `json-reporter.test.ts`: Valid JSON output, all fields present
  - `terminal-reporter.test.ts`: Readable format, coverage percentages, missing list

- [ ] T008: Integration test for full scan workflow in `tests/integration/traceability/full-scan.test.ts`
  - Create fixture with spec files and annotated sources
  - Run end-to-end: parse specs → scan code → analyze → report
  - Verify report accuracy

## Step 3: Core Implementation

- [ ] T009: Implement RequirementId parser in `src/traceability/parsers/id-parser.ts`
  - Parse short-form and qualified IDs
  - Build qualified form from short-form + scope
  - Validate format constraints

- [ ] T010: Implement SpecParser in `src/traceability/parsers/spec-parser.ts`
  - parseFile(): Extract requirements from single spec.md
  - parseDirectory(): Scan `.xe/features/` and `.xe/initiatives/`
  - Handle state markers and deprecated targets
  - Derive scope from directory path

- [ ] T011: Implement AnnotationScanner in `src/traceability/parsers/annotation-scanner.ts`
  - scanFile(): Extract @req annotations from single file
  - scanDirectory(): Recursive scan with exclude patterns
  - Support @req:partial marker
  - Detect test files by directory

- [ ] T012: Implement CoverageAnalyzer in `src/traceability/analysis/coverage-analyzer.ts`
  - Build requirement and annotation maps
  - Compute coverage status for each requirement
  - Detect orphaned annotations
  - Calculate summary statistics

- [ ] T013: [P] Implement JSON reporter in `src/traceability/reports/json-reporter.ts`
  - Generate complete JSON report per spec format

- [ ] T014: [P] Implement terminal reporter in `src/traceability/reports/terminal-reporter.ts`
  - Generate human-readable summary per spec format

- [ ] T015: Implement configuration loading in `src/traceability/config/traceability-config.ts`
  - Load from `.xe/config/catalyst.json`
  - Default values for exclude patterns, test directories
  - Threshold configuration

## Step 4: Integration

- [ ] T016: Create public API in `src/traceability/index.ts`
  - Export all public types
  - Export SpecParser, AnnotationScanner, CoverageAnalyzer
  - Export generateJsonReport, generateTerminalReport

- [ ] T017: Add .gitignore exclude support in AnnotationScanner
  - Parse .gitignore patterns
  - Apply to file scanning when respectGitignore option is true

## Step 5: Polish

- [ ] T018: [P] Performance tests in `tests/performance/traceability/`
  - Generate 50K LOC synthetic codebase
  - Verify scan completes in <5 seconds
  - Verify memory usage <100MB

- [ ] T019: [P] Write user documentation in `docs/traceability.md`
  - Overview and benefits
  - ID format specification
  - Annotation syntax examples (TypeScript, Python, Go)
  - Configuration options
  - Interpreting reports
  - Best practices

- [ ] T020: Add internal documentation to `CONTRIBUTING.md`
  - Annotation convention guide
  - ID format rules
  - Placement guidelines

- [ ] T021: Create test fixtures in `tests/fixtures/traceability/`
  - Sample spec files with various states
  - Multi-language source files with annotations
  - Edge case files (empty, malformed, etc.)

## Dependencies

- T002 (types) blocks T003-T008 (tests need types)
- T003-T008 (tests) before T009-T015 (implementation)
- T009 (ID parser) blocks T010, T011 (parsers use ID parsing)
- T010, T011 (parsers) block T012 (analyzer needs parsed data)
- T012-T015 (core) before T016 (public API)
- T016 (public API) before T018-T020 (polish)
