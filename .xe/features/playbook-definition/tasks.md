---
id: playbook-definition
title: Playbook Definition
author: "@flanakin"
description: "This document defines the tasks required to fully implement the Playbook Definition feature from scratch."
---

# Tasks: Playbook Definition

**Input**: Design documents from `.xe/features/playbook-definition/`
**Prerequisites**: plan.md (required), research.md, spec.md

## Step 1: Tests First (TDD)

**CRITICAL: Tests MUST be written and MUST FAIL before ANY implementation**

- [x] T004: [P] Unit tests for StatePersistence.save() in `tests/unit/playbooks/persistence/state-persistence.test.ts`
  - @req FR:playbook-definition/persistence.class.methods
  - @req FR:playbook-definition/persistence.class.format
  - @req FR:playbook-definition/persistence.class.performance
  - @req FR:playbook-definition/persistence.active-runs
  - @req NFR:playbook-definition/performance.serialization
  - @req NFR:playbook-definition/reliability.atomic-writes
  - @req NFR:playbook-definition/testability.abstraction
  - @req NFR:playbook-definition/testability.coverage
  - Test: save creates file at correct path with pretty-printed JSON
  - Test: save creates parent directory if missing
  - Test: save uses atomic write (verify temp file pattern)
  - Test: save throws StateError on file system errors
  - Test: save throws StateError on permission errors

- [x] T005: [P] Unit tests for StatePersistence.load() in `tests/unit/playbooks/persistence/state-persistence.test.ts`
  - @req FR:playbook-definition/persistence.class.methods
  - @req FR:playbook-definition/persistence.class.error-handling
  - @req NFR:playbook-definition/reliability.corruption-recovery
  - @req NFR:playbook-definition/testability.abstraction
  - @req NFR:playbook-definition/testability.coverage
  - Test: load returns correct deserialized state
  - Test: load throws StateError for missing file
  - Test: load throws StateError for corrupted JSON
  - Test: load throws StateError for invalid state structure (missing runId or playbookName)

- [x] T006: [P] Unit tests for StatePersistence.archive() in `tests/unit/playbooks/persistence/state-persistence.test.ts`
  - @req FR:playbook-definition/persistence.archive
  - @req FR:playbook-definition/persistence.gitignore
  - @req FR:playbook-definition/persistence.class.methods
  - @req NFR:playbook-definition/testability.abstraction
  - Test: archive moves file to correct history directory (`.xe/runs/history/{YYYY}/{MM}/{DD}/`)
  - Test: archive creates nested date directories
  - Test: archive creates `.gitignore` in history root on first archive
  - Test: archive throws StateError on date parsing errors
  - Test: archive throws StateError preserving original file on move failure

- [x] T007: [P] Unit tests for StatePersistence.listActiveRuns() in `tests/unit/playbooks/persistence/state-persistence.test.ts`
  - @req FR:playbook-definition/persistence.class.methods
  - @req NFR:playbook-definition/testability.abstraction
  - Test: listActiveRuns returns correct run IDs sorted
  - Test: listActiveRuns handles empty directory
  - Test: listActiveRuns filters non-JSON files

- [x] T008: [P] Unit tests for StatePersistence.pruneArchive() in `tests/unit/playbooks/persistence/state-persistence.test.ts`
  - @req FR:playbook-definition/persistence.class.methods
  - @req NFR:playbook-definition/testability.abstraction
  - Test: pruneArchive deletes files older than retention days
  - Test: pruneArchive preserves recent files
  - Test: pruneArchive returns correct deletion count
  - Test: pruneArchive continues on errors (directory might not exist)

- [x] T009: [P] Unit tests for atomicWrite() in `tests/unit/playbooks/persistence/atomic-write.test.ts`
  - @req FR:playbook-definition/persistence.atomic-writes
  - @req NFR:playbook-definition/reliability.atomic-writes
  - Test: creates parent directories if missing
  - Test: writes to temp file with random suffix
  - Test: renames temp to target atomically
  - Test: cleans up temp file on error
  - Test: handles permission errors gracefully
  - Test: handles disk full errors

- [x] T010: [P] Integration test for end-to-end state lifecycle in `tests/integration/playbooks/state-lifecycle.test.ts`
  - @req FR:playbook-definition/persistence
  - @req NFR:playbook-definition/performance.serialization
  - @req NFR:playbook-definition/testability.abstraction
  - @req NFR:playbook-definition/testability.coverage
  - Test: Create state → Save → Load → Verify equality
  - Test: Create state → Save → Archive → Verify file in history
  - Test: Multiple saves update same file without corruption
  - Test: Concurrent saves don't corrupt state (atomic writes)
  - Test: Prune archive with mixed old/new files

## Step 3: Core Implementation

- [x] T011: [P] Create Playbook and PlaybookStep interfaces in `src/playbooks/types/playbook.ts` per plan.md § TypeScript Interface Definitions
  - @req FR:playbook-definition/types.playbook
  - @req FR:playbook-definition/types.playbook.interface
  - @req FR:playbook-definition/types.step.interface
  - @req FR:playbook-definition/types.step.unique-names
  - @req FR:playbook-definition/types.step.config
  - @req NFR:playbook-definition/performance.zero-overhead
  - @req NFR:playbook-definition/maintainability.versioning
  - @req NFR:playbook-definition/maintainability.backward-compatibility

- [x] T012: [P] Create InputParameter interface in `src/playbooks/types/playbook.ts` per plan.md § TypeScript Interface Definitions
  - @req FR:playbook-definition/types.input
  - @req FR:playbook-definition/types.playbook.input-parameter

- [x] T013: [P] Create ValidationRule hierarchy in `src/playbooks/types/validation.ts` per plan.md § TypeScript Interface Definitions
  - @req FR:playbook-definition/types.validation
  - @req FR:playbook-definition/validation.base
  - @req FR:playbook-definition/validation.regex
  - @req FR:playbook-definition/validation.string-length
  - @req FR:playbook-definition/validation.number-range
  - @req FR:playbook-definition/validation.custom
  - @req FR:playbook-definition/validation.union
  - @req NFR:playbook-definition/performance.zero-overhead
  - @req NFR:playbook-definition/maintainability.versioning
  - ValidationRule base interface
  - RegexValidationRule, StringLengthValidationRule, NumberRangeValidationRule, CustomValidationRule
  - InputValidationRule union type

- [x] T014: [P] Create PlaybookAction and PlaybookActionResult interfaces in `src/playbooks/types/action.ts` per plan.md § TypeScript Interface Definitions
  - @req FR:playbook-definition/types.action
  - @req FR:playbook-definition/types.action.interface
  - @req FR:playbook-definition/types.action.result
  - @req FR:playbook-definition/types.action.dependencies
  - @req NFR:playbook-definition/performance.zero-overhead
  - @req NFR:playbook-definition/testability.mockable
  - @req NFR:playbook-definition/maintainability.versioning
  - @req NFR:playbook-definition/maintainability.breaking-changes

- [x] T015: [P] Create PlaybookState, PlaybookContext, and StateError in `src/playbooks/types/state.ts` per plan.md § TypeScript Interface Definitions
  - @req FR:playbook-definition/types.state
  - @req FR:playbook-definition/types.state.interface
  - @req FR:playbook-definition/types.state.context
  - @req FR:playbook-definition/types.state.variables
  - @req NFR:playbook-definition/performance.zero-overhead
  - @req NFR:playbook-definition/maintainability.versioning
  - @req NFR:playbook-definition/maintainability.backward-compatibility

- [x] T015a: [P] Add ValidationResult and ValidationError interfaces to `src/playbooks/types/validation.ts`
  - @req FR:playbook-definition/types.validation
  - @req FR:playbook-definition/validation.result
  - @req FR:playbook-definition/validation.error
  - ValidationResult with valid (boolean) and optional error (ValidationError)
  - ValidationError with code, message, rule, and value properties

- [x] T015b: [P] Write unit tests for ValidationExecutor in `tests/unit/playbooks/validation/validation-executor.test.ts` (TDD)
  - @req FR:playbook-definition/types.validation
  - @req NFR:playbook-definition/testability.mockable
  - @req NFR:playbook-definition/testability.coverage
  - Test: Regex validation passes for matching string
  - Test: Regex validation fails for non-matching string
  - Test: Regex validation fails for non-string value
  - Test: StringLength validation passes for valid length
  - Test: StringLength validation fails when too short
  - Test: StringLength validation fails when too long
  - Test: NumberRange validation passes for valid number
  - Test: NumberRange validation fails when too small
  - Test: NumberRange validation fails when too large
  - Test: NumberRange validation fails for non-number value
  - Test: Custom validation passes for valid script
  - Test: Custom validation fails when script returns false
  - Test: Custom validation fails when script throws error
  - Test: Multiple rules - all pass
  - Test: Multiple rules - first fails, returns immediately
  - Test: Custom error codes and messages are preserved

- [x] T015c: Implement ValidationExecutor class in `src/playbooks/types/validation.ts`
  - @req FR:playbook-definition/types.validation
  - @req FR:playbook-definition/validation.validator
  - @req FR:playbook-definition/validation.factory
  - validate() method that iterates through rules
  - validateSingleRule() private method for type dispatch
  - validateRegex() for Regex rules
  - validateStringLength() for StringLength rules
  - validateNumberRange() for NumberRange rules
  - validateCustom() for Custom rules (using Function constructor)
  - All validators return ValidationResult

- [x] T016: Implement atomicWrite() utility in `src/playbooks/persistence/atomic-write.ts` per plan.md § Atomic Write Utility
  - @req FR:playbook-definition/persistence.atomic
  - @req NFR:playbook-definition/reliability.atomic-writes
  - Generate unique temp file path
  - Ensure parent directory exists
  - Write to temp file
  - Atomically rename to target
  - Clean up on error

- [x] T017: Implement StatePersistence.save() in `src/playbooks/persistence/state-persistence.ts` per plan.md § State Persistence Implementation
  - @req FR:playbook-definition/persistence.state
  - @req NFR:playbook-definition/performance.serialization
  - @req NFR:playbook-definition/reliability.atomic-writes
  - @req NFR:playbook-definition/testability.abstraction
  - Build file path
  - Serialize to pretty-printed JSON
  - Create directory if needed
  - Use atomic write utility
  - Throw StateError on failures

- [x] T018: Implement StatePersistence.load() in `src/playbooks/persistence/state-persistence.ts` per plan.md § State Persistence Implementation
  - @req FR:playbook-definition/persistence.state
  - @req NFR:playbook-definition/reliability.corruption-recovery
  - @req NFR:playbook-definition/testability.abstraction
  - Build file path
  - Read and parse JSON
  - Validate required fields
  - Throw StateError on missing file or corrupted JSON

- [x] T019: Implement StatePersistence.archive() in `src/playbooks/persistence/state-persistence.ts` per plan.md § State Persistence Implementation
  - @req FR:playbook-definition/persistence.archive
  - @req NFR:playbook-definition/reliability.corruption-recovery
  - @req NFR:playbook-definition/testability.abstraction
  - Parse date from runId
  - Create history directory structure
  - Create .gitignore if missing
  - Read source and write to history atomically
  - Delete source file
  - Throw StateError on failures

- [x] T020: Implement StatePersistence.listActiveRuns() in `src/playbooks/persistence/state-persistence.ts` per plan.md § State Persistence Implementation
  - @req FR:playbook-definition/persistence.runs
  - Read directory
  - Filter for run files
  - Extract runIds
  - Sort and return

- [x] T021: Implement StatePersistence.pruneArchive() in `src/playbooks/persistence/state-persistence.ts` per plan.md § State Persistence Implementation
  - @req FR:playbook-definition/persistence.archive
  - Calculate cutoff date
  - Recursively scan history directory
  - Check modification times
  - Delete old files
  - Return deletion count

## Step 4: Integration

- [x] T022: Create index barrel export in `src/playbooks/types/index.ts` to export all interfaces
  - @req FR:playbook-definition/types.playbook
  - @req NFR:playbook-definition/maintainability.versioning
  - @req NFR:playbook-definition/maintainability.breaking-changes
  - Note: Will need to add ValidationExecutor, ValidationResult, ValidationError exports
- [x] T023: Create index barrel export in `src/playbooks/persistence/index.ts` to export StatePersistence and atomicWrite
  - @req FR:playbook-definition/persistence
  - @req NFR:playbook-definition/testability.abstraction

## Step 5: Action Dependency Management

**Goal**: Enable actions to declare external dependencies (CLI tools, environment variables) for pre-validation and documentation

- [x] T033: Create `src/playbooks/types/dependencies.ts` with PlaybookActionDependencies, CliDependency, EnvDependency, CheckResult interfaces
  - @req FR:playbook-definition/types.dependencies.interface
  - @req FR:playbook-definition/types.dependencies.cli
  - @req FR:playbook-definition/types.dependencies.env
  - @req FR:playbook-definition/types.dependencies.check-result
- [x] T034: Update PlaybookAction interface with optional `dependencies` property
  - @req FR:playbook-definition/types.action.interface
  - @req FR:playbook-definition/types.action.dependencies
- [x] T035: Export dependency types from types/index.ts barrel
  - @req FR:playbook-definition/types.dependencies.interface

- [x] T036: [P] Write DependencyChecker tests (TDD approach - tests must FAIL first)
  - @req FR:playbook-definition/types.dependencies.checker
  - @req NFR:playbook-definition/testability.mockable
  - @req NFR:playbook-definition/testability.coverage
  - Test: checkCli detects available command via version command
  - Test: checkCli falls back to which/where if no version command
  - Test: checkCli returns unavailable if command not found
  - Test: checkCli respects platform filtering
  - Test: checkCli parses version from output
  - Test: checkCli compares version against minVersion
  - Test: checkCli includes installDocs in error result
  - Test: checkCli times out after 5 seconds
  - Test: checkEnv detects present environment variable
  - Test: checkEnv returns unavailable for missing required variable
  - Test: checkEnv returns available for missing optional variable
  - Test: checkEnv includes description in error message

- [x] T037: Implement `src/playbooks/services/dependency-checker.ts`
  - @req FR:playbook-definition/types.dependencies.checker
  - Implement checkCli() with two-tier strategy (version command → which/where)
  - Implement checkEnv() with process.env check
  - Implement helper methods (execWithTimeout, parseVersion, compareVersions)
  - All tests from T036 should now PASS

- [x] T038: Create build script `scripts/generate-action-registry.ts`
  - @req FR:playbook-definition/catalog.generation
  - @req FR:playbook-definition/catalog.extract-dependencies
  - @req FR:playbook-definition/catalog.extract-actiontype
  - @req FR:playbook-definition/catalog.internal
  - Scan all *-action.ts files for dependencies, primaryProperty, and config schemas
  - Generate registry/action-registry.ts with type-safe ActionMetadata registry
  - Handle both production and test modes (--test flag)

- [x] T039: Integrate registry generation into build process
  - @req FR:playbook-definition/catalog.build-integration
  - Update scripts/build.ts to run generate-action-registry before tsc
  - Create src/playbooks/registry/ directory
  - Verify generated registry compiles

- [x] T040: Update BashAction with dependency metadata
  - @req FR:playbook-definition/catalog.extract-dependencies
  - Add static dependencies property with bash CLI dependency
  - Include versionCommand, platforms, installDocs

- [x] T041: Update PowerShellAction with dependency metadata
  - @req FR:playbook-definition/catalog.extract-dependencies
  - Add static dependencies property with pwsh CLI dependency
  - Include versionCommand, minVersion, installDocs

## Step 6: ACTION_REGISTRY and Config Schema Generation

**Goal**: Extend registry generation to include primaryProperty and configSchema metadata, generated from TypeScript interfaces using typescript-json-schema

- [x] T046: Add typescript-json-schema as dev dependency
  - @req FR:playbook-definition/schema.typescript-json-schema

- [x] T047: Create ActionMetadata interface in `src/playbooks/types/action-metadata.ts`
  - @req FR:playbook-definition/catalog.metadata
  - @req NFR:playbook-definition/performance.zero-overhead
  - @req NFR:playbook-definition/maintainability.versioning
  - @req NFR:playbook-definition/maintainability.breaking-changes
  - Define ActionMetadata with actionType, className, dependencies, primaryProperty, configSchema properties
  - Define JSONSchemaObject interface
  - Export from types/index.ts barrel

- [x] T048: Create generate-action-registry.ts script (TDD approach)
  - @req FR:playbook-definition/catalog.generation
  - @req FR:playbook-definition/schema.required-properties
  - @req FR:playbook-definition/schema.complex-types
  - Implemented config schema generation from TypeScript interfaces
  - Generates schema for BashConfig, PowerShellConfig, and all action config interfaces
  - Preserves JSDoc comments as descriptions
  - Correctly marks required vs optional properties
  - Handles complex types (objects, arrays, Record types)
  - Handles actions without config schemas gracefully

- [x] T049: Implement primaryProperty extraction in generate-action-registry.ts
  - @req FR:playbook-definition/catalog.extract-primaryproperty
  - Extract `readonly primaryProperty: string` from action instances
  - Include in ActionMetadata object
  - Log extracted primaryProperty for debugging

- [x] T050: Implement config schema generation in generate-action-registry.ts
  - @req FR:playbook-definition/catalog.generate-schema
  - @req FR:playbook-definition/schema.typescript-json-schema
  - @req FR:playbook-definition/schema.jsdoc-preservation
  - Use typescript-json-schema library to generate schemas from *Config interfaces
  - Match config interface to action: `{ActionClass}Config` → action type
  - Include JSDoc descriptions in generated schemas
  - Handle optional properties (exclude from required array)
  - Handle complex types (objects, arrays, unions, Record types)
  - Include generated schema in ActionMetadata object

- [x] T051: Implement registry output with ActionMetadata type
  - @req FR:playbook-definition/catalog.generation
  - Registry type: `Record<string, ActionMetadata>`
  - Output file: action-registry.ts in src/playbooks/registry/
  - Export constant: ACTION_REGISTRY
  - JSDoc includes comprehensive documentation for all three metadata properties

- [x] T052: Add primaryProperty to BashAction and PowerShellAction
  - @req FR:playbook-definition/types.action.interface
  - BashAction: `readonly primaryProperty = 'code'`
  - PowerShellAction: `readonly primaryProperty = 'code'`

- [x] T053: Add JSDoc comments to BashConfig and PowerShellConfig interfaces
  - @req FR:playbook-definition/schema.jsdoc-preservation
  - Property descriptions already present for all properties
  - Descriptions are clear and helpful for schema generation
  - Optional properties correctly marked with `?`

- [x] T054: Run registry generation and verify output
  - @req FR:playbook-definition/catalog.build-integration
  - ACTION_REGISTRY contains 10 action entries (bash, powershell, script, get, post, put, patch, read, write, base-http)
  - Each entry has appropriate metadata (dependencies, primaryProperty, configSchema)
  - configSchema includes all properties with descriptions
  - configSchema correctly marks required properties
  - TypeScript compilation succeeds

## Step 10: Nested Step Execution Support

**Goal**: Enable actions to execute nested steps (control flow, iteration) while maintaining all execution rules

**Context**: See research.md § Nested Step Execution Support for design rationale. This feature is required by playbook-engine for control flow actions (if, for-each).

- [x] T057: Add StepExecutor interface to `src/playbooks/types/action.ts`
  - @req FR:playbook-definition/types.step-executor.interface
  - @req FR:playbook-definition/types.step-executor.variable-scoping
  - @req FR:playbook-definition/types.step-executor.execution-rules
  - @req NFR:playbook-definition/performance.zero-overhead
  - @req NFR:playbook-definition/testability.mockable
  - Interface with `executeSteps(steps, variableOverrides?)` method
  - Returns `Promise<PlaybookActionResult[]>`
  - See plan.md § StepExecutor Interface for signature

- [x] T058: Add PlaybookActionWithSteps abstract base class to `src/playbooks/types/action.ts`
  - @req FR:playbook-definition/types.step-executor.base-class
  - @req NFR:playbook-definition/testability.mockable
  - @req NFR:playbook-definition/maintainability.versioning
  - Constructor accepts `StepExecutor` callback
  - Implements `PlaybookAction<TConfig>` interface
  - Abstract `execute()` method for subclasses to implement
  - See plan.md § PlaybookActionWithSteps Base Class for signature

## Step 11: Playbook Provider Registry

**Goal**: Enable extensible playbook loading via provider registry pattern without coupling features

- [x] T065: Create PlaybookLoader interface in `src/playbooks/types/playbook-provider.ts`
  - @req FR:playbook-definition/provider.loader-interface
  - @req NFR:playbook-definition/performance.zero-overhead
  - @req NFR:playbook-definition/testability.mockable
  - Defined name (readonly string), supports(identifier), load(identifier) methods ✓
  - Load returns `Promise<Playbook | undefined>` (undefined if not found) ✓
  - Exported from types/index.ts barrel ✓

- [x] T066: [P] Write PlaybookProvider tests (TDD - tests must FAIL first)
  - @req FR:playbook-definition/provider.class
  - @req FR:playbook-definition/provider.duplicate-prevention
  - @req NFR:playbook-definition/testability.mockable
  - @req NFR:playbook-definition/testability.abstraction
  - @req NFR:playbook-definition/testability.coverage
  - Test: getInstance() returns same singleton instance on multiple calls ✓
  - Test: register() adds provider to registry ✓
  - Test: register() throws CatalystError 'DuplicateProviderName' for duplicate ✓
  - Test: load() returns playbook from first matching provider ✓
  - Test: load() checks providers in registration order ✓
  - Test: load() returns undefined when no provider supports identifier ✓
  - Test: unregister() removes provider by name ✓
  - Test: clearAll() removes all providers ✓
  - Test: getProviderNames() returns array of registered names ✓
  - 18 tests passing in tests/unit/playbooks/registry/playbook-provider.test.ts ✓

- [x] T067: Implement PlaybookProvider in `src/playbooks/registry/playbook-provider.ts`
  - @req FR:playbook-definition/provider.class
  - @req FR:playbook-definition/provider.search-path
  - @req FR:playbook-definition/provider.loader-order
  - @req FR:playbook-definition/provider.duplicate-prevention
  - @req NFR:playbook-definition/testability.abstraction
  - @req NFR:playbook-definition/maintainability.versioning
  - Singleton pattern: private constructor, static getInstance() ✓
  - Internal Map<string, PlaybookProvider> for storage ✓
  - Array to track registration order ✓
  - register() checks duplicate, adds to Map and order array ✓
  - load() iterates in order, calls supports(), first true loads ✓
  - Path resolution: absolute paths, relative with search paths ['.xe/playbooks', 'node_modules/@xerilium/catalyst/playbooks'] ✓
  - Extension variants: .yaml, .yml, original identifier ✓
  - unregister() removes from Map and array ✓
  - clearAll() clears both structures ✓
  - getProviderNames() returns Array.from(Map.keys()) ✓

- [x] T068: Export PlaybookProvider and PlaybookProvider from types/index.ts ✓
  - @req FR:playbook-definition/provider.class

## Step 12: Action Class Name Mapping

**Goal**: Add className to ACTION_REGISTRY to enable runtime action instantiation without hard-coded imports

- [x] T073: Update ActionMetadata interface in `src/playbooks/types/action-metadata.ts`
  - @req FR:playbook-definition/catalog.metadata
  - @req NFR:playbook-definition/maintainability.versioning
  - @req NFR:playbook-definition/maintainability.breaking-changes
  - Add `className: string` as required property
  - Update JSDoc with className description and usage example
  - Verify exports in types/index.ts barrel

- [x] T074: Update generate-action-registry.ts to extract className
  - @req FR:playbook-definition/catalog.extract-classname
  - Extract class name from exported class in action module
  - Method: Iterate Object.keys(module) to find class exports
  - Filter out non-class exports (e.g., config interfaces, constants)
  - Validate exactly one action class per file
  - Include className in generated ActionMetadata object

- [x] T075: Regenerate ACTION_REGISTRY with className mappings
  - @req FR:playbook-definition/catalog.build-integration
  - Run: npm run build (includes generate-action-registry)
  - Verify all action entries include className property
  - Verify className values match actual class names (BashAction, PowerShellAction, etc.)
  - Verify generated file size remains reasonable (<500KB)

## Step 13: Unified PlaybookProvider with Action Management

**Goal**: Consolidate playbook loading and action management into unified PlaybookProvider singleton with caching and dependency injection support

- [x] T078: [P] Write PlaybookProvider caching and action tests
  - @req FR:playbook-definition/provider.caching
  - @req FR:playbook-definition/provider.action-instantiation
  - @req NFR:playbook-definition/testability.mockable
  - @req NFR:playbook-definition/testability.abstraction
  - @req NFR:playbook-definition/testability.coverage
  - Test: loadPlaybook() returns cached playbook on subsequent calls
  - Test: loadPlaybook() throws CatalystError 'PlaybookNotFound' when not found
  - Test: createAction() returns action instance for registered type
  - Test: createAction() throws CatalystError 'ActionNotFound' for unknown type
  - Test: createAction() passes StepExecutor to PlaybookActionWithSteps subclasses
  - Test: registerAction() enables mock action registration
  - Test: clearAll() clears loaders, actions, and cache
  - Test: resetInstance() creates fresh singleton

- [x] T079: Implement unified PlaybookProvider
  - @req FR:playbook-definition/provider.class
  - @req FR:playbook-definition/provider.caching
  - @req FR:playbook-definition/provider.dependency-injection
  - @req NFR:playbook-definition/testability.abstraction
  - @req NFR:playbook-definition/maintainability.versioning
  - Singleton pattern with getInstance() and resetInstance()
  - Private constructor for singleton enforcement
  - loadPlaybook() with caching (throws on not found)
  - registerLoader() for playbook loaders
  - createAction() with StepExecutor injection for control flow actions
  - getActionInfo() and getActionTypes() for action metadata
  - registerAction() for test mocking
  - clearAll() and clearPlaybookCache() for testing

- [x] T080: Implement action initialization from generated catalog
  - @req FR:playbook-definition/provider.action-initialization
  - @req FR:playbook-definition/catalog.internal
  - @req NFR:playbook-definition/testability.abstraction
  - Load action catalog on first getActionTypes() or createAction() call
  - Check prototype chain to detect PlaybookActionWithSteps subclasses
  - Instantiate with StepExecutor parameter for control flow actions

- [x] T081: Update Engine to use PlaybookProvider.createAction()
  - @req FR:playbook-definition/provider.action-instantiation
  - Remove separate ActionRegistry
  - Use PlaybookProvider.getInstance().createAction() for action instantiation
  - Cache action instances in Engine for reuse
  - Grant privileged context access for built-in actions

- [x] T082: Update tests to use new PlaybookProvider API
  - @req FR:playbook-definition/provider.dependency-injection
  - @req NFR:playbook-definition/testability.mockable
  - @req NFR:playbook-definition/testability.abstraction
  - Use PlaybookProvider.resetInstance() in beforeEach
  - Use provider.registerAction() for mock actions
  - Use provider.clearAll() in afterEach
  - Config-based mock actions instead of constructor-based

- [x] T083: Generate loader catalog at build time
  - @req FR:playbook-definition/catalog.build-integration
  - Create scripts/generate-loader-catalog.ts
  - Scan for PlaybookLoader implementations
  - Generate loader-catalog.ts with LOADER_CLASSES map
  - Integrate with build process

## Dependencies

- Setup (T001-T003) before tests (T004-T010)
- Tests (T004-T010) before implementation (T011-T021)
- Interface definitions (T011-T015) before state persistence implementation (T017-T021)
- Atomic write utility (T016) before StatePersistence.save() and archive() (T017, T019)
- Core implementation (T011-T021) before integration (T022-T025)
- Integration (T022-T025) before polish (T026-T032)
