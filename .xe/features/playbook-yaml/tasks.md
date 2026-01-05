---
id: playbook-yaml
title: Playbook YAML Format Tasks
author: "@flanakin"
description: "Implementation tasks for the Playbook YAML Format feature"
---

# Tasks: Playbook YAML Format

**Input**: Design documents from `.xe/features/playbook-yaml/`
**Prerequisites**: plan.md (required), research.md, spec.md

## Step 1: JSON Schema Generation

- [x] T006: Create schema generation script `scripts/generate-playbook-schema.ts` per plan.md § JSON Schema Generation
  - @req FR:playbook-yaml/schema.generation
  - @req FR:playbook-yaml/schema.file
  - @req FR:playbook-yaml/schema.playbook
  - @req FR:playbook-yaml/schema.step
  - Import ACTION_REGISTRY from playbook-definition
  - Define base schema structure (top-level properties, inputs, outputs, catch, finally)
  - Generate step `oneOf` array by iterating ACTION_REGISTRY entries with configSchema
  - For each action: Create step variant with action key required, incorporate configSchema properties
  - Support primary property pattern (action value can be string/number/boolean/array OR object with config properties)
  - Add `custom-action` variant for extensibility
  - Support type-as-key for inputs (string, number, boolean)
  - Support validation type properties (regex, minLength, maxLength, min, max, script)
  - Write generated schema directly to `dist/playbooks/schema.json`
  - Schema is build artifact (only in dist/, not in src/)
  - Schema generation completes in <1 second (actual: <1s for 10 variants)

- [x] T006a: Integrate schema generation into build process
  - @req FR:playbook-yaml/schema.generation
  - Update `scripts/build.ts` to run `generate-playbook-schema.ts` after tsc and file copying
  - Schema generated directly to dist/ (no src/ copy, no .gitignore needed)
  - Verify schema exists in dist after build

- [x] T006b: Unit tests for schema generation in `tests/unit/scripts/generate-playbook-schema.test.ts`
  - @req FR:playbook-yaml/schema.generation
  - @req NFR:playbook-yaml/reliability.test-coverage
  - Test: schema contains all actions from ACTION_REGISTRY with configSchema
  - Test: each action's configSchema properties appear in generated schema
  - Test: actions with primaryProperty support both value and object patterns in oneOf
  - Test: schema includes custom-action variant for extensibility
  - Test: generated schema is valid JSON Schema draft-07 structure
  - Test: schema generation completes in <5 seconds
  - Test: schema validates steps with single action correctly

## Step 3: Tests First (TDD)

**CRITICAL: Tests MUST be written and MUST FAIL before ANY implementation**

- [x] T007: Unit tests for YAML parser in `tests/unit/playbooks/yaml/parser.test.ts`
  - @req FR:playbook-yaml/parsing.library
  - @req FR:playbook-yaml/parsing.errors
  - @req FR:playbook-yaml/structure.encoding
  - @req NFR:playbook-yaml/reliability.coverage
  - Test: parse valid YAML
  - Test: parse YAML with anchors and aliases
  - Test: fail on syntax errors with line/column numbers
  - Test: fail on invalid UTF-8
  - Test: handle empty files

- [x] T008: Unit tests for schema validator in `tests/unit/playbooks/yaml/validator.test.ts`
  - @req FR:playbook-yaml/parsing.validation
  - @req FR:playbook-yaml/structure.required
  - @req FR:playbook-yaml/structure.optional
  - @req FR:playbook-yaml/structure.input-types
  - @req FR:playbook-yaml/structure.validation
  - @req FR:playbook-yaml/steps.action-key
  - @req NFR:playbook-yaml/reliability.context
  - @req NFR:playbook-yaml/reliability.coverage
  - Test: validate minimal valid playbook
  - Test: validate complete playbook with all optional properties
  - Test: fail on missing required fields (name, description, owner, steps)
  - Test: fail on type mismatches
  - Test: enforce exactly one action per step (oneOf validation)
  - Test: support custom-action variant
  - Test: validate type-as-key for inputs
  - Test: validate validation rule properties

- [x] T009: Unit tests for YAML transformer in `tests/unit/playbooks/yaml/transformer.test.ts`
  - @req FR:playbook-yaml/transformation.steps
  - @req FR:playbook-yaml/transformation.patterns
  - @req FR:playbook-yaml/transformation.registry
  - @req FR:playbook-yaml/transformation.all-steps
  - @req FR:playbook-yaml/steps.patterns
  - @req FR:playbook-yaml/steps.unique-names
  - @req FR:playbook-yaml/steps.error-policy
  - @req NFR:playbook-yaml/reliability.coverage
  - Test: transform step with null/empty value (Pattern 1: No inputs)
  - Test: transform step with primary property value using ACTION_REGISTRY (Pattern 2: Primary property - any type)
  - Test: transform step with object value (Pattern 3: Object-only)
  - Test: transform input parameters with type-as-key
  - Test: transform validation rules to ValidationRule interfaces
  - Test: transform catch and finally arrays
  - Test: preserve step name and errorPolicy
  - Test: handle additional properties merge (last-wins)

- [x] T010: Unit tests for playbook loader in `tests/unit/playbooks/yaml/loader.test.ts`
  - @req FR:playbook-yaml/transformation.loader
  - @req NFR:playbook-yaml/reliability.errors
  - @req NFR:playbook-yaml/reliability.context
  - @req NFR:playbook-yaml/reliability.coverage
  - Test: load valid YAML file successfully
  - Test: load from string successfully
  - Test: throw ValidationError on file not found
  - Test: throw ValidationError on YAML syntax errors
  - Test: throw ValidationError on schema violations
  - Test: throw ValidationError on transformation errors
  - Test: error messages include file path and line numbers

- [x] T011: Unit tests for playbook discovery in `tests/unit/playbooks/yaml/discovery.test.ts`
  - @req FR:playbook-yaml/discovery.locations
  - @req FR:playbook-yaml/discovery.extension
  - @req FR:playbook-yaml/discovery.naming
  - @req FR:playbook-yaml/discovery.performance
  - @req NFR:playbook-yaml/performance.discovery
  - @req NFR:playbook-yaml/reliability.coverage
  - Test: discover playbooks in playbooks/ directory
  - Test: discover playbooks in .xe/playbooks/ directory
  - Test: filter by .yaml extension
  - Test: handle missing directories gracefully
  - Test: return sorted paths

- [x] T012: Integration tests for end-to-end loading in `tests/integration/playbooks/yaml/loader.test.ts`
  - @req FR:playbook-yaml/transformation.interface
  - @req NFR:playbook-yaml/performance.validation
  - @req NFR:playbook-yaml/performance.transformation
  - @req NFR:playbook-yaml/reliability.coverage
  - Test: load valid-minimal.yaml fixture end-to-end
  - Test: load valid-complete.yaml fixture end-to-end
  - Test: verify transformed Playbook structure matches expected

## Step 4: Core Implementation

- [x] T018: Implement YAML parser in `src/playbooks/yaml/parser.ts` per plan.md § YAML Parser
  - @req FR:playbook-yaml/parsing.library
  - @req FR:playbook-yaml/parsing.errors
  - @req FR:playbook-yaml/structure.encoding
  - Use js-yaml library for safe parsing
  - Capture parsing errors with line/column numbers
  - Return parsed object or throw detailed error

- [x] T019: Implement schema validator in `src/playbooks/yaml/validator.ts` per plan.md § Schema Validator
  - @req FR:playbook-yaml/parsing.validation
  - @req NFR:playbook-yaml/performance.validation
  - @req NFR:playbook-yaml/reliability.context
  - Use ajv library for JSON Schema validation
  - Pre-compile schema at module initialization
  - Convert ajv errors to readable format with property paths
  - Return validation result with errors array

- [x] T020: Implement YAML transformer in `src/playbooks/yaml/transformer.ts` per plan.md § YAML Transformer
  - @req FR:playbook-yaml/transformation.interface
  - @req FR:playbook-yaml/transformation.steps
  - @req FR:playbook-yaml/transformation.patterns
  - @req FR:playbook-yaml/transformation.registry
  - @req FR:playbook-yaml/transformation.all-steps
  - @req FR:playbook-yaml/structure.output-naming
  - Extract action type from non-reserved property keys
  - Import ACTION_REGISTRY from playbook-definition
  - Build config using three patterns: (1) No inputs (null), (2) Primary property (registry lookup, any type), (3) Object-only
  - Transform input parameters with type-as-key
  - Transform validation rules to ValidationRule interfaces
  - Transform catch and finally arrays

- [x] T021: Implement playbook loader in `src/playbooks/yaml/loader.ts` per plan.md § Playbook Loader
  - @req FR:playbook-yaml/transformation.loader
  - @req NFR:playbook-yaml/performance.transformation
  - @req NFR:playbook-yaml/reliability.errors
  - Implement load(yamlPath) method
  - Implement loadFromString(yamlContent) method
  - Throw ValidationError with context on failures

- [x] T022: Implement playbook discovery in `src/playbooks/yaml/discovery.ts` per plan.md § Playbook Discovery
  - @req FR:playbook-yaml/discovery.locations
  - @req FR:playbook-yaml/discovery.extension
  - @req FR:playbook-yaml/discovery.performance
  - @req NFR:playbook-yaml/performance.discovery
  - Search playbooks/ and .xe/playbooks/ directories
  - Use glob pattern for .yaml files
  - Handle missing directories gracefully
  - Return sorted absolute paths

## Step 5: Integration

- [x] T023: Create index barrel export in `src/playbooks/yaml/index.ts` to export PlaybookLoader and PlaybookDiscovery
  - @req FR:playbook-yaml/transformation.interface

## Step 6: Documentation

- [x] T026: Create customer-facing documentation in `docs/playbooks/yaml-format.md` per plan.md § Documentation
  - @req FR:playbook-yaml/transformation.interface
  - Overview section
  - Getting Started with minimal example
  - Syntax Reference (top-level properties, steps, inputs, validation, error handling)
  - Action Configuration Patterns section (three patterns: no inputs, primary property, object-only)
  - IDE Setup instructions
  - Common Patterns with real-world examples
  - Troubleshooting guide
  - Schema Reference link

## Step 7: YAML Playbook Provider

**Goal**: Implement PlaybookLoader interface and register YAML provider with PlaybookProvider

**Note**: Path resolution is handled by PlaybookProvider per architecture decision. Provider receives resolved paths.

- [x] T036: [P] Write YamlPlaybookLoader tests (TDD - tests must FAIL first)
  - @req FR:playbook-yaml/provider.interface
  - @req FR:playbook-yaml/provider.existence
  - @req NFR:playbook-yaml/reliability.coverage
  - Test: name property returns 'yaml'
  - Test: supports() returns true for .yaml extension
  - Test: supports() returns true for .yml extension
  - Test: supports() returns false for other extensions
  - Test: load() returns playbook for valid absolute path
  - Test: load() returns playbook for valid relative path
  - Test: load() returns undefined for missing file (not error)
  - Test: load() returns undefined for transformation errors
  - Test: load() resolves paths against playbookDirectory

- [x] T037: Implement YamlPlaybookLoader in `src/playbooks/yaml/yaml-loader.ts`
  - @req FR:playbook-yaml/provider.interface
  - @req FR:playbook-yaml/provider.existence
  - @req FR:playbook-yaml/provider.transformation
  - Constructor accepts playbookDirectory parameter
  - name property returns 'yaml'
  - supports() checks .yaml or .yml extension
  - load() resolves path (absolute as-is, relative against directory)
  - load() returns undefined if file does not exist
  - load() reads file, transforms via YamlTransformer
  - load() catches errors and returns undefined (log error)

- [x] T038: [P] Write initializeYamlProvider tests (TDD - tests must FAIL first)
  - @req FR:playbook-yaml/provider.registration
  - @req NFR:playbook-yaml/reliability.coverage
  - Test: Registers provider with PlaybookProvider
  - Test: Uses default directory '.xe/playbooks' when not specified
  - Test: Uses custom directory when specified
  - Test: Throws on duplicate registration

- [x] T039: Implement initializeYamlProvider in `src/playbooks/yaml/yaml-provider.ts`
  - @req FR:playbook-yaml/provider.registration
  - Accept optional playbookDirectory parameter (default: '.xe/playbooks')
  - Create YamlPlaybookLoader instance
  - Get PlaybookProvider.getInstance()
  - Call registry.register(provider)
  - Let errors propagate

- [x] T040: Export YamlPlaybookLoader and initializeYamlLoader from yaml/index.ts
  - @req FR:playbook-yaml/provider.registration

- [ ] T041: Update CLI entry point with provider initialization
  - @req FR:playbook-yaml/provider.initialization
  - Add initializeYamlProvider() call in src/cli/catalyst-playbook.ts
  - Call before any playbook loading operations
  - Handle initialization errors

- [ ] T042: Update test setup with provider initialization
  - @req FR:playbook-yaml/provider.initialization
  - Add initializeYamlProvider() to Jest global setup
  - Call registry.clearAll() in teardown for test isolation

- [x] T043: [P] Add JSDoc comments to YamlPlaybookLoader and initializeYamlProvider
  - @req NFR:playbook-yaml/maintainability.isolation
  - @req NFR:playbook-yaml/maintainability.versioning
  - @req NFR:playbook-yaml/maintainability.compatibility
  - Comprehensive class documentation
  - Usage examples for initialization
  - Cross-references to plan.md

- [x] T044: Run provider integration tests
  - @req FR:playbook-yaml/provider.interface
  - @req NFR:playbook-yaml/reliability.coverage
  - Load YAML playbook via PlaybookProvider.load()
  - Verify provider selection logic
  - Verify file resolution

- [x] T045: Verify TypeScript compilation with zero errors
  - @req NFR:playbook-yaml/maintainability.isolation
  - YamlPlaybookLoader compiles
  - CLI integration compiles
  - No breaking changes

- [x] T046: Verify test coverage >85% for provider implementation
  - @req NFR:playbook-yaml/reliability.coverage
  - All path resolution scenarios covered
  - Error handling tested
  - Integration with registry tested

## Dependencies

- Setup (T001-T005) before schema and tests (T006-T012)
- JSON Schema (T006) before validator tests (T008)
- Tests (T007-T012) before implementation (T018-T022)
- Test fixtures (T013-T017) before integration tests (T012)
- Core implementation (T018-T022) before integration (T023-T025)
- Integration (T023-T025) before documentation (T026)
- Documentation (T026) before polish (T027-T035)
