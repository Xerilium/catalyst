---
id: playbook-definition
title: Playbook Definition
author: "@flanakin"
description: "Defines TypeScript interfaces for playbooks, actions, and execution state"
dependencies:
  - error-handling
---

# Feature: Playbook Definition

## Problem

Workflow engines need standardized TypeScript interfaces for playbooks, actions, and execution state. Without clear interface contracts, engines and actions cannot interoperate reliably.

## Goals

- Define TypeScript interfaces for playbook structure (Playbook, PlaybookStep)
- Establish the action interface contract (PlaybookAction, PlaybookActionResult)
- Specify the execution state format for persistence and resume (PlaybookState, PlaybookContext)
- Provide state persistence utilities (StatePersistence interface)

## Scenario

- As a **playbook action developer**, I need clear interface contracts to implement actions
  - Outcome: `PlaybookAction` interface provides precise contract for all action implementations

- As a **playbook engine developer**, I need TypeScript interfaces for playbook structure
  - Outcome: `Playbook` and `PlaybookStep` interfaces define playbook structure

- As a **playbook engine developer**, I need state persistence utilities
  - Outcome: `StatePersistence` interface provides save/load/archive operations

## Success Criteria

- State serialization and deserialization complete in <100ms for states <1MB with zero data loss
- State persistence operations achieve 100% reliability with atomic writes (zero corruption on crash/interruption)
- Interface changes maintain backward compatibility for state resume across versions (0 breaking changes without migration path)

## Requirements

### Functional Requirements

**FR-1**: TypeScript Playbook Interfaces

- **FR-1.1**: System MUST define `Playbook` interface with the following properties:
  - `name` (string, required): Unique playbook identifier in kebab-case
  - `description` (string, required): Human-readable purpose statement
  - `owner` (string, required): Responsible role (e.g., Engineer, Architect, Product Manager)
  - `reviewers` (object, optional): Review requirements with `required` (string[]) and `optional` (string[]) role arrays
  - `triggers` (array, optional): Event-based activation rules, each with `event` (string), `action` (string), and optional `args` (Record<string, unknown>)
  - `inputs` (InputParameter[], optional): Input parameters for playbook
  - `outputs` (Record<string, string>, optional): Expected output names and types
  - `steps` (PlaybookStep[], required): Array of execution steps
  - `catch` (array, optional): Error recovery rules, each with `code` (string) and `steps` (PlaybookStep[])
  - `finally` (PlaybookStep[], optional): Cleanup steps always executed

- **FR-1.2**: System MUST define `InputParameter` interface with the following properties:
  - `name` (string, required): Parameter name in kebab-case
  - `type` (string, required): Parameter type - one of 'string', 'number', 'boolean'
  - `description` (string, optional): Human-readable description
  - `required` (boolean, optional): Whether parameter is required (default: false)
  - `default` (unknown, optional): Default value if not provided
  - `allowed` (unknown[], optional): Enumeration of allowed values
  - `validation` (InputValidationRule[], optional): Array of validation rules to apply

- **FR-1.3**: System MUST define `ValidationRule` base interface with the following properties:
  - `type` (string, required): Rule type discriminator (PascalCased)
  - `code` (string, optional): Error code to return on validation failure
  - `message` (string, optional): Custom error message for validation failure
  - Purpose: Base interface all validation rules extend

- **FR-1.4**: System MUST define `RegexValidationRule` interface extending ValidationRule:
  - `type` (string, required): Must be 'Regex'
  - `pattern` (string, required): Regular expression pattern to match

- **FR-1.5**: System MUST define `StringLengthValidationRule` interface extending ValidationRule:
  - `type` (string, required): Must be 'StringLength'
  - `minLength` (number, optional): Minimum string length (inclusive)
  - `maxLength` (number, optional): Maximum string length (inclusive)

- **FR-1.6**: System MUST define `NumberRangeValidationRule` interface extending ValidationRule:
  - `type` (string, required): Must be 'NumberRange'
  - `min` (number, optional): Minimum value (inclusive)
  - `max` (number, optional): Maximum value (inclusive)

- **FR-1.7**: System MUST define `CustomValidationRule` interface extending ValidationRule:
  - `type` (string, required): Must be 'Custom'
  - `script` (string, required): JavaScript expression that returns boolean (true = valid)

- **FR-1.8**: System MUST define `InputValidationRule` as union type of all validation rule interfaces:
  - Type: `RegexValidationRule | StringLengthValidationRule | NumberRangeValidationRule | CustomValidationRule`
  - Enables extensibility - new validation rule types can be added without modifying existing code

- **FR-1.9**: System MUST provide `Validator` interface for extensible validation:
  - Generic interface: `Validator<TRule extends ValidationRule>`
  - Method: `validate(value: unknown, rule: TRule): ValidationResult`
  - Returns: `ValidationResult` with `valid` (boolean) and optional `error` (ValidationError)
  - Purpose: Base interface all validators must implement
  - Enables extensibility: New validators can be added without modifying core code

- **FR-1.10**: System MUST provide `ValidatorFactory` class for validator registration:
  - Method: `register(type: string, validator: Validator): void` - Register validator for rule type
  - Method: `validate(value: unknown, rule: InputValidationRule): ValidationResult` - Execute validation
  - Purpose: Factory pattern for creating and executing validators
  - Built-in validators: Regex, StringLength, NumberRange, Custom (pre-registered)

- **FR-1.11**: System MUST define `ValidationResult` interface with the following properties:
  - `valid` (boolean, required): Whether validation passed
  - `error` (ValidationError, optional): Error details if validation failed

- **FR-1.12**: System MUST define `ValidationError` interface with the following properties:
  - `code` (string, required): Error code from rule or default validation error code
  - `message` (string, required): Error message from rule or generated message
  - `rule` (InputValidationRule, required): The rule that failed
  - `value` (unknown, required): The value that failed validation

**FR-2**: TypeScript Step Interface

- **FR-2.1**: System MUST define `PlaybookStep` interface with the following properties:
  - `action` (string, required): Action type identifier in kebab-case (e.g., 'github-issue-create', 'ai-prompt', 'file-write', 'if', 'var')
  - `config` (unknown, required): Action-specific configuration object passed to action's `execute()` method
  - `name` (string, optional): Step identifier for referencing results in variables
  - `errorPolicy` (ErrorPolicy | ErrorAction, optional): Error handling configuration from error-handling feature

- **FR-2.2**: Step names MUST be unique within a playbook when specified

- **FR-2.3**: Config property contains action-specific configuration object
  - Actions receive this config object directly in their `execute()` method
  - Structure and contents are defined by each action implementation

**FR-3**: Action Interface Contract

- **FR-3.1**: System MUST define `PlaybookAction<TConfig>` interface with the following:
  - Generic type parameter `TConfig` represents action's expected configuration structure
  - Method: `execute(config: TConfig): Promise<PlaybookActionResult>`
  - Purpose: Base interface all playbook actions must implement
  - Registration: Actions are registered at build time by action feature

- **FR-3.2**: System MUST define `PlaybookActionResult` interface with the following properties:
  - `code` (string, optional): Result or error code (e.g., 'FileNotFound', 'ValidationFailed', 'Success')
  - `message` (string, optional): Human-readable message for logging
  - `value` (unknown, optional): Action-specific output value (automatically added to variables for named steps)
  - `error` (CatalystError, optional): Error details if action failed (null indicates success)

- **FR-3.3**: System MUST support optional action dependency metadata via `dependencies` property on `PlaybookAction` interface
  - Property is optional (existing actions work without modification)
  - Declares external CLI tools and environment variables required by action
  - Used for pre-execution validation and documentation generation

**FR-4**: Action Dependency Metadata

- **FR-4.1**: System MUST define `PlaybookActionDependencies` interface with the following properties:
  - `cli` (CliDependency[], optional): CLI tool dependencies (bash, pwsh, gh, etc.)
  - `env` (EnvDependency[], optional): Environment variable dependencies (GITHUB_TOKEN, etc.)

- **FR-4.2**: System MUST define `CliDependency` interface with the following properties:
  - `name` (string, required): Command name as it appears in PATH
  - `versionCommand` (string, optional): Command to check version/existence (e.g., 'bash --version')
  - `minVersion` (string, optional): Minimum required version in semver format
  - `platforms` (NodeJS.Platform[], optional): Platform filter (e.g., ['linux', 'darwin'])
  - `installDocs` (string, optional): Installation documentation URL

- **FR-4.3**: System MUST define `EnvDependency` interface with the following properties:
  - `name` (string, required): Environment variable name
  - `required` (boolean, required): Whether variable must be present
  - `description` (string, optional): What the variable is used for

- **FR-4.4**: System MUST define `CheckResult` interface for dependency validation results:
  - `available` (boolean, required): Whether dependency is present
  - `version` (string, optional): Detected version string (if applicable)
  - `meetsMinVersion` (boolean, optional): Whether version requirement met
  - `error` (string, optional): Error message if unavailable or invalid
  - `installDocs` (string, optional): Installation guidance URL from dependency metadata

- **FR-4.5**: System MUST provide `DependencyChecker` service with the following methods:
  - `checkCli(dep: CliDependency): Promise<CheckResult>` - Validate CLI tool availability
  - `checkEnv(dep: EnvDependency): Promise<CheckResult>` - Validate environment variable presence

**FR-5**: Action Metadata Registry

- **FR-5.1**: System MUST generate `ACTION_REGISTRY` at build time by scanning action implementations
  - Registry maps action types (kebab-case) to `ActionMetadata` objects
  - Generated from static properties on action classes
  - Output file: `src/playbooks/scripts/playbooks/registry/action-registry.ts`

- **FR-5.2**: System MUST define `ActionMetadata` interface with the following properties:
  - `dependencies` (PlaybookActionDependencies, optional): External CLI tools and environment variables required
  - `primaryProperty` (string, optional): Property name for YAML shorthand syntax mapping
  - `configSchema` (JSONSchemaObject, optional): JSON Schema for action configuration

- **FR-5.3**: System MUST extract `dependencies` from action class static property
  - Property name: `static readonly dependencies: PlaybookActionDependencies`
  - Extracted via dynamic import during build

- **FR-5.4**: System MUST extract `primaryProperty` from action class static property
  - Property name: `static readonly primaryProperty: string`
  - Enables YAML transformer to map action values to correct property names
  - Example: `bash: "echo hello"` maps to `{ code: "echo hello" }` when `primaryProperty = 'code'`

- **FR-5.5**: System MUST generate `configSchema` from TypeScript config interfaces using `typescript-json-schema`
  - Input: TypeScript config interfaces (e.g., `BashConfig`, `PowerShellConfig`)
  - Output: JSON Schema draft-07 compatible objects
  - Preserves JSDoc descriptions as schema descriptions
  - Used by other features to generate validation schemas

- **FR-5.6**: Generated ACTION_REGISTRY MUST be importable by other features
  - Export: `export const ACTION_REGISTRY: Record<string, ActionMetadata>`

- **FR-5.7**: Registry generation MUST run as part of build process before TypeScript compilation
  - Build order: generate-action-registry → tsc
  - Failures in registry generation MUST fail the build

**FR-6**: Config Schema Generation

- **FR-6.1**: System MUST use `typescript-json-schema` library to generate JSON schemas from config interfaces
  - Target interfaces: Any interface ending with `Config` suffix used as action TConfig parameter
  - Schema options: Include JSDoc descriptions, mark required properties, use draft-07

- **FR-6.2**: Generated schemas MUST preserve JSDoc comments as schema descriptions
  - Property descriptions from `/** Property description */` comments
  - Interface description from class-level JSDoc

- **FR-6.3**: Generated schemas MUST correctly handle optional vs required properties
  - Optional properties (marked with `?`) excluded from `required` array
  - Required properties included in `required` array

- **FR-6.4**: Generated schemas MUST support complex types:
  - Objects with nested properties
  - Arrays with `items` schema
  - Union types with `oneOf` or `anyOf`
  - Record types with `additionalProperties`

**FR-7**: Playbook State and Context Structure

- **FR-7.1**: System MUST define `PlaybookState` interface with the following properties:
  - `playbookName` (string, required): Name of playbook being executed
  - `runId` (string, required): Unique run identifier (format: YYYYMMDD-HHMMSS-nnn)
  - `startTime` (string, required): Execution start timestamp in ISO 8601 format
  - `status` (string, required): Current run status - one of 'running', 'paused', 'completed', 'failed'
  - `inputs` (Record<string, unknown>, required): Validated input parameters with kebab-case keys
  - `variables` (Record<string, unknown>, required): All variables including inputs, var assignments, and step outputs
  - `completedSteps` (string[], required): Names of successfully completed steps (enables resume)
  - `currentStepName` (string, required): Name of step currently being executed
  - Persistence: Saved to `.xe/runs/run-{runId}.json` in JSON format
  - Must be fully JSON-serializable for resume capability

- **FR-7.2**: System MUST define `PlaybookContext` interface extending PlaybookState:
  - Inherits all properties from PlaybookState
  - `playbook` (Playbook, required): Playbook definition being executed (runtime-only, not persisted)
  - Purpose: Runtime execution container with both persistent state and non-serializable playbook reference
  - Usage: Passed to engine, not to individual action `execute()` methods

- **FR-7.3**: Variables map MUST include inputs, var assignments, and step outputs
  - Step outputs automatically added to variables using step name as key
  - Unified lookup - template engine accesses all variables from single map

**FR-8**: State Persistence Interface

- **FR-8.1**: State snapshots MUST be saved to `.xe/runs/run-{runId}.json`
  - Active runs stay in `.xe/runs/` until completion
  - File format: pretty-printed JSON (human-readable)

- **FR-8.2**: Completed run snapshots MUST be archived to `.xe/runs/history/{YYYY}/{MM}/{DD}/run-{runId}.json`
  - Archive occurs when status becomes 'completed' or 'failed'

- **FR-8.3**: State files MUST use atomic writes to prevent corruption
  - Write to temp file, then rename (atomic operation on most filesystems)

- **FR-8.4**: System MUST create `.xe/runs/history/.gitignore` on first history archive
  - Content: `*` to ignore all archived run files
  - Active runs in `.xe/runs/` MUST be committed (enables resume across machines)
  - Only completed/failed runs in history directory are ignored
  - Does NOT modify project root `.gitignore`

**FR-9**: State Persistence Utilities

- **FR-9.1**: System MUST provide `StatePersistence` class with the following methods:
  - `save(state: PlaybookState): Promise<void>` - Save playbook state to disk
    - Throws StateError if save fails
  - `load(runId: string): Promise<PlaybookState>` - Load playbook state from disk
    - Parameter: runId - Run identifier to load
    - Returns: Playbook state
    - Throws StateError if load fails or state corrupted
  - `listActiveRuns(): Promise<string[]>` - List all active runs in .xe/runs/
    - Returns: Array of run IDs
  - `archive(runId: string): Promise<void>` - Archive completed run to history directory
    - Throws StateError if archive fails
  - `pruneArchive(retentionDays: number): Promise<number>` - Prune old archived runs
    - Parameter: retentionDays - Number of days to retain
    - Returns: Number of runs deleted

- **FR-9.2**: State save operations MUST complete within 100ms for states <1MB
- **FR-9.3**: State files MUST be human-readable JSON (pretty-printed)
- **FR-9.4**: Corrupted state files MUST throw clear error with recovery instructions

### Non-functional Requirements

**NFR-1**: Performance

- **NFR-1.1**: State serialization MUST complete in <100ms for states <1MB
- **NFR-1.2**: Interface definitions MUST have zero runtime overhead (compile away)

**NFR-2**: Reliability

- **NFR-2.1**: State writes MUST be atomic to prevent corruption on crash
- **NFR-2.2**: State files MUST be recoverable if corrupted

**NFR-3**: Testability

- **NFR-3.1**: All interfaces MUST be mockable for unit testing
- **NFR-3.2**: State persistence MUST be abstracted for test doubles
- **NFR-3.3**: 100% coverage for state persistence operations

**NFR-4**: Maintainability

- **NFR-4.1**: Interface changes MUST be versioned
- **NFR-4.2**: Breaking changes to interfaces MUST be clearly documented
- **NFR-4.3**: State format changes MUST support backward compatibility for resume

## Key Entities

**Entities owned by this feature:**

- **Playbook**: TypeScript interface defining playbook structure
  - Properties: name, description, owner, steps, inputs, outputs, reviewers, triggers, catch, finally
  - Used by playbook engines to execute workflows
  - Format-agnostic - can be constructed from YAML, JSON, or TypeScript directly

- **PlaybookStep**: TypeScript interface for step representation
  - Properties: name (optional), errorPolicy (optional), action (string), config (unknown)
  - Used by playbook engine for step execution
  - Action property contains action type identifier (kebab-case)
  - Config property contains action-specific configuration passed to `execute()` method

- **PlaybookAction**: Interface contract all actions must implement
  - Single `execute()` method receiving typed configuration
  - Returns `PlaybookActionResult` with success status and output
  - Generic type parameter enables type-safe action configurations
  - Optional `dependencies` property for declaring external requirements

- **PlaybookActionResult**: Outcome of single step execution
  - Properties: code, message, value, error
  - Success determined by error === null
  - Output value automatically added to variables for named steps

- **PlaybookActionDependencies**: Interface for declaring action prerequisites
  - `cli`: Array of CLI tool dependencies
  - `env`: Array of environment variable dependencies

- **CliDependency**: CLI tool dependency metadata
  - `name`: Command name (e.g., 'bash', 'gh')
  - `versionCommand`: Command to check version/existence
  - `minVersion`: Minimum required version (semver)
  - `platforms`: Supported platforms filter
  - `installDocs`: Installation guide URL

- **EnvDependency**: Environment variable dependency metadata
  - `name`: Environment variable name
  - `required`: Whether variable must be present
  - `description`: What the variable is used for

- **CheckResult**: Result of dependency validation
  - `available`: Whether dependency is present
  - `version`: Detected version string (if applicable)
  - `meetsMinVersion`: Whether version requirement met
  - `error`: Error message if unavailable
  - `installDocs`: Installation guidance URL

- **DependencyChecker**: Service for validating dependencies
  - `checkCli()`: Validate CLI tool availability
  - `checkEnv()`: Validate environment variable presence
  - `commandExists()`: Platform-agnostic command checking
  - `parseVersion()`: Extract version from command output
  - `compareVersions()`: Compare semver strings

- **ACTION_REGISTRY**: Auto-generated registry of action metadata
  - Key: Action type (kebab-case, e.g., 'bash', 'powershell')
  - Value: ActionMetadata object with dependencies, primaryProperty, and configSchema
  - Generated at build time by scanning action files and extracting static properties
  - Used by playbook-yaml for transformation and schema generation
  - Used by playbook-engine for dependency validation

- **ActionMetadata**: Complete metadata for a playbook action
  - `dependencies`: External CLI tools and environment variables required
  - `primaryProperty`: Property name for YAML shorthand syntax (e.g., 'code' for bash)
  - `configSchema`: JSON Schema for action configuration (generated from TypeScript interfaces)
  - Enables DRY principle - metadata derived from code, not duplicated

- **JSONSchemaObject**: JSON Schema definition for action configurations
  - Compatible with JSON Schema draft-07 specification
  - Properties: type, properties, required, additionalProperties, etc.
  - Generated from TypeScript config interfaces using typescript-json-schema
  - Used by playbook-yaml to generate YAML JSON Schema for IDE IntelliSense

- **ValidationRule**: Base interface for input validation rules
  - Properties: type (discriminator), code, message
  - Extended by RegexValidationRule, StringLengthValidationRule, NumberRangeValidationRule, CustomValidationRule

- **RegexValidationRule**: Regular expression validation extending ValidationRule
  - Type: 'Regex', pattern property

- **StringLengthValidationRule**: String length validation extending ValidationRule
  - Type: 'StringLength', minLength/maxLength properties

- **NumberRangeValidationRule**: Numeric range validation extending ValidationRule
  - Type: 'NumberRange', min/max properties

- **CustomValidationRule**: Custom script validation extending ValidationRule
  - Type: 'Custom', script property

- **InputValidationRule**: Union type of all validation rule interfaces
  - Enables extensible validation without modifying existing code

- **Validator**: Interface for extensible validation implementations
  - Generic interface: Validator<TRule extends ValidationRule>
  - Method: validate(value, rule) returns ValidationResult
  - Extensible: New validators can be registered without modifying core code

- **ValidatorFactory**: Factory for validator registration and execution
  - Manages validator registry for all rule types
  - Method: register(type, validator) for extensibility
  - Method: validate(value, rule) executes appropriate validator
  - Pre-registers built-in validators (Regex, StringLength, NumberRange, Custom)

- **ValidationResult**: Outcome of validation execution
  - Properties: valid (boolean), error (optional ValidationError)
  - Success determined by valid === true

- **ValidationError**: Details about validation failure
  - Properties: code, message, rule, value
  - Provides context for debugging validation failures

- **PlaybookState**: Persistent snapshot of execution progress
  - Location: `.xe/runs/run-{runId}.json` (active), `.xe/runs/history/{YYYY}/{MM}/{DD}/` (archived)
  - Properties: playbookName, runId, startTime, inputs, variables, completedSteps, currentStepName, status
  - JSON-serializable for resume capability
  - Variables include inputs, var assignments, and step outputs

- **PlaybookContext**: Runtime execution container (extends PlaybookState)
  - Adds playbook reference for runtime access
  - Non-serializable runtime-only data
  - Passed to engine, not individual actions

- **StatePersistence**: Class providing state save/load/archive operations
  - Abstracts file system operations for testability
  - Provides atomic writes to prevent corruption
  - Manages active runs and archived history

**Entities from other features:**

- **CatalystError** (error-handling): Base error class with code and guidance
- **ErrorPolicy** (error-handling): Error handling configuration (Continue, Stop, Retry)
- **ErrorAction** (error-handling): Shortcut string for common policies

## Dependencies

**Internal:**
- **error-handling** (Tier 1.1): Provides CatalystError and ErrorPolicy

**External:**
- **Node.js >= 18**: File system operations for state persistence
