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

**FR-4**: Nested Step Execution Support

- **FR-4.1**: System MUST define `StepExecutor` interface for actions that need to execute nested steps
  - Purpose: Enables control flow actions (if, for-each) and future actions (parallel, retry, timeout) to execute steps
  - Security: Actions receive executor callback without access to PlaybookContext
  - Method: `executeSteps(steps: PlaybookStep[], variableOverrides?: Record<string, unknown>): Promise<PlaybookActionResult[]>`
  - Parameter `steps`: Array of steps to execute sequentially
  - Parameter `variableOverrides`: Optional variables to inject into execution scope (e.g., loop variables)
  - Returns: Array of step results in execution order
  - Behavior: Executes each step following same rules as top-level steps (error policies, state persistence, etc.)

- **FR-4.2**: System MUST define `PlaybookActionWithSteps<TConfig>` abstract base class
  - Purpose: Base class for actions that need to execute nested steps
  - Extends: Implements `PlaybookAction<TConfig>` interface
  - Constructor: `constructor(protected readonly stepExecutor: StepExecutor)`
  - Abstract method: `execute(config: TConfig): Promise<PlaybookActionResult>`
  - Usage: Actions that need nested execution extend this class instead of implementing PlaybookAction directly
  - Example actions: if (conditional execution), for-each (iteration), parallel (concurrent execution)

- **FR-4.3**: Variable overrides MUST be additive and scoped
  - Overrides add/shadow variables in execution scope without mutating parent context
  - Nested steps can read parent variables and overrides
  - Nested steps cannot modify parent variables (isolation)
  - Example: Loop variables (`item`, `index`) are visible only within loop iterations

- **FR-4.4**: StepExecutor implementation MUST enforce all execution rules
  - Apply error policies from step configuration
  - Update state persistence after each step
  - Track completed steps for resume capability
  - Propagate errors according to error handling configuration

**FR-5**: Action Dependency Metadata

- **FR-5.1**: System MUST define `PlaybookActionDependencies` interface with the following properties:
  - `cli` (CliDependency[], optional): CLI tool dependencies (bash, pwsh, gh, etc.)
  - `env` (EnvDependency[], optional): Environment variable dependencies (GITHUB_TOKEN, etc.)

- **FR-5.2**: System MUST define `CliDependency` interface with the following properties:
  - `name` (string, required): Command name as it appears in PATH
  - `versionCommand` (string, optional): Command to check version/existence (e.g., 'bash --version')
  - `minVersion` (string, optional): Minimum required version in semver format
  - `platforms` (NodeJS.Platform[], optional): Platform filter (e.g., ['linux', 'darwin'])
  - `installDocs` (string, optional): Installation documentation URL

- **FR-5.3**: System MUST define `EnvDependency` interface with the following properties:
  - `name` (string, required): Environment variable name
  - `required` (boolean, required): Whether variable must be present
  - `description` (string, optional): What the variable is used for

- **FR-5.4**: System MUST define `CheckResult` interface for dependency validation results:
  - `available` (boolean, required): Whether dependency is present
  - `version` (string, optional): Detected version string (if applicable)
  - `meetsMinVersion` (boolean, optional): Whether version requirement met
  - `error` (string, optional): Error message if unavailable or invalid
  - `installDocs` (string, optional): Installation guidance URL from dependency metadata

- **FR-5.5**: System MUST provide `DependencyChecker` service with the following methods:
  - `checkCli(dep: CliDependency): Promise<CheckResult>` - Validate CLI tool availability
  - `checkEnv(dep: EnvDependency): Promise<CheckResult>` - Validate environment variable presence

**FR-6**: Action Metadata and Build-time Catalog Generation

- **FR-6.1**: System MUST generate action catalog at build time by scanning action implementations
  - Catalog maps action types (kebab-case) to `ActionMetadata` objects and class constructors
  - Generated from static properties on action classes
  - Output file: `src/playbooks/registry/action-catalog.ts`
  - Catalog is internal to `PlaybookProvider` - external features use `PlaybookProvider.createAction()`

- **FR-6.2**: System MUST define `ActionMetadata` interface with the following properties:
  - `actionType` (string, required): Explicit action type identifier in kebab-case (e.g., 'github-issue-create', 'bash', 'http-get')
  - `className` (string, required): TypeScript class name for runtime instantiation (e.g., 'BashAction', 'GitHubIssueCreateAction')
  - `dependencies` (PlaybookActionDependencies, optional): External CLI tools and environment variables required
  - `primaryProperty` (string, optional): Property name for YAML shorthand syntax mapping
  - `configSchema` (JSONSchemaObject, optional): JSON Schema for action configuration

- **FR-6.3**: System MUST extract `dependencies` from action class static property
  - Property name: `static readonly dependencies: PlaybookActionDependencies`
  - Extracted via dynamic import during build

- **FR-6.3a**: System MUST extract `className` from action class export name
  - Extracted from class declaration name in action file
  - Used by PlaybookProvider to instantiate actions at runtime
  - Example: `export class BashAction` → `className: 'BashAction'`
  - Enables dynamic action instantiation without hard-coded imports

- **FR-6.4**: System MUST extract `actionType` from action class static readonly property
  - Each action class MUST declare `static readonly actionType: string`
  - Action type MUST be kebab-case identifier
  - Action type is explicit contract, not derived from filename or file location
  - Rationale: Explicit declaration prevents breaking changes from file reorganization

- **FR-6.5**: System MUST extract `primaryProperty` from action class static property
  - Property name: `readonly primaryProperty: string`
  - Enables YAML transformer to map action values to correct property names
  - Example: `bash: "echo hello"` maps to `{ code: "echo hello" }` when `primaryProperty = 'code'`

- **FR-6.6**: System MUST generate `configSchema` from TypeScript config interfaces using `typescript-json-schema`
  - Input: TypeScript config interfaces (e.g., `BashConfig`, `PowerShellConfig`)
  - Output: JSON Schema draft-07 compatible objects
  - Preserves JSDoc descriptions as schema descriptions
  - Used by other features to generate validation schemas

- **FR-6.7**: Generated catalog MUST be internal to PlaybookProvider
  - Catalog contains action metadata and class constructors
  - Accessed only via `PlaybookProvider.createAction()` and `PlaybookProvider.getActionInfo()`
  - External features MUST NOT import catalog directly - use PlaybookProvider methods

- **FR-6.8**: Catalog generation MUST run as part of build process before TypeScript compilation
  - Build order: generate-action-registry → tsc
  - Failures in catalog generation MUST fail the build

**FR-7**: Config Schema Generation

- **FR-7.1**: System MUST use `typescript-json-schema` library to generate JSON schemas from config interfaces
  - Target interfaces: Any interface ending with `Config` suffix used as action TConfig parameter
  - Schema options: Include JSDoc descriptions, mark required properties, use draft-07

- **FR-7.2**: Generated schemas MUST preserve JSDoc comments as schema descriptions
  - Property descriptions from `/** Property description */` comments
  - Interface description from class-level JSDoc

- **FR-7.3**: Generated schemas MUST correctly handle optional vs required properties
  - Optional properties (marked with `?`) excluded from `required` array
  - Required properties included in `required` array

- **FR-7.4**: Generated schemas MUST support complex types:
  - Objects with nested properties
  - Arrays with `items` schema
  - Union types with `oneOf` or `anyOf`
  - Record types with `additionalProperties`

**FR-8**: Playbook State and Context Structure

- **FR-8.1**: System MUST define `PlaybookState` interface with the following properties:
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

- **FR-8.2**: System MUST define `PlaybookContext` interface extending PlaybookState:
  - Inherits all properties from PlaybookState
  - `playbook` (Playbook, required): Playbook definition being executed (runtime-only, not persisted)
  - Purpose: Runtime execution container with both persistent state and non-serializable playbook reference
  - Usage: Passed to engine, not to individual action `execute()` methods

- **FR-8.3**: Variables map MUST include inputs, var assignments, and step outputs
  - Step outputs automatically added to variables using step name as key
  - Unified lookup - template engine accesses all variables from single map

**FR-9**: State Persistence Interface

- **FR-9.1**: State snapshots MUST be saved to `.xe/runs/run-{runId}.json`
  - Active runs stay in `.xe/runs/` until completion
  - File format: pretty-printed JSON (human-readable)

- **FR-9.2**: Completed run snapshots MUST be archived to `.xe/runs/history/{YYYY}/{MM}/{DD}/run-{runId}.json`
  - Archive occurs when status becomes 'completed' or 'failed'

- **FR-9.3**: State files MUST use atomic writes to prevent corruption
  - Write to temp file, then rename (atomic operation on most filesystems)

- **FR-9.4**: System MUST create `.xe/runs/history/.gitignore` on first history archive
  - Content: `*` to ignore all archived run files
  - Active runs in `.xe/runs/` MUST be committed (enables resume across machines)
  - Only completed/failed runs in history directory are ignored
  - Does NOT modify project root `.gitignore`

**FR-10**: State Persistence Utilities

- **FR-10.1**: System MUST provide `StatePersistence` class with the following methods:
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

- **FR-10.2**: State save operations MUST complete within 100ms for states <1MB
- **FR-10.3**: State files MUST be human-readable JSON (pretty-printed)
- **FR-10.4**: Corrupted state files MUST throw clear error with recovery instructions

**FR-11**: Unified Playbook Provider

- **FR-11.1**: System MUST define `PlaybookLoader` interface with the following methods:
  - `name` (string, readonly): Loader identifier (e.g., 'yaml', 'typescript', 'remote')
  - `supports(identifier: string): boolean` - Check if loader can load specified playbook
  - `load(identifier: string): Promise<Playbook | undefined>` - Load playbook by identifier, return undefined if not found

- **FR-11.2**: System MUST provide `PlaybookProvider` class as unified provider for playbooks AND actions:
  - Singleton pattern: `getInstance()` returns singleton instance, `resetInstance()` for testing
  - Playbook loading: `loadPlaybook(identifier): Promise<Playbook>` - Load and cache playbook
  - Loader registration: `registerLoader(loader: PlaybookLoader): void` - Register loader, throw if duplicate name
  - Action management: `createAction<TConfig>(actionType, stepExecutor?): PlaybookAction<TConfig>` - Create action instance
  - Action metadata: `getActionInfo(actionType): ActionMetadata | undefined` - Get action metadata
  - Action types: `getActionTypes(): string[]` - List registered action types
  - Testing: `registerAction(actionType, ActionClass, metadata?): void` - Register test action
  - Cleanup: `clearAll(): void` - Clear loaders, actions, and cache (testing only)
  - Cleanup: `clearPlaybookCache(): void` - Clear playbook cache only

- **FR-11.3**: Provider MUST resolve playbook identifiers using search path strategy
  - Absolute paths or paths starting with ./ or ../ used as-is
  - Relative names resolved against search paths: ['.xe/playbooks', 'node_modules/@xerilium/catalyst/playbooks']
  - Generate candidate paths with extensions: .yaml, .yml, original identifier
  - First-wins: return first loader that successfully loads any candidate

- **FR-11.4**: Provider MUST check loaders in registration order during loadPlaybook()
  - Loop through candidate paths, then loaders for each path
  - Call supports(path) on each loader
  - First loader returning true and successfully loading wins
  - Throw CatalystError with code 'PlaybookNotFound' if no loader loads any candidate

- **FR-11.5**: Provider MUST prevent duplicate loader names
  - Throw CatalystError with code 'DuplicateLoaderName' when registering duplicate
  - Error message MUST include conflicting loader name

- **FR-11.6**: Provider MUST initialize actions from generated catalog on first access
  - Actions auto-initialized from `action-catalog.ts` when first accessed
  - `registerAction()` allows adding test actions without triggering initialization

- **FR-11.7**: Provider MUST instantiate actions with appropriate dependencies
  - Check if action class extends `PlaybookActionWithSteps`
  - If yes: instantiate with StepExecutor parameter
  - If no: instantiate with no parameters
  - Throw CatalystError with code 'ActionNotFound' if action type not registered

- **FR-11.8**: Provider MUST cache loaded playbooks to avoid redundant loader lookups
  - Cache key: Original playbook identifier
  - Cache value: Loaded Playbook object
  - Cache hit: Return cached playbook without calling loaders
  - Cache miss: Load via loaders, cache result before returning
  - Cache undefined results: Do NOT cache undefined - allows retry if loader is registered later

- **FR-11.9**: Provider MUST support dependency injection for testing
  - `registerAction()` enables mock action registration without catalog
  - `clearAll()` resets all state for test isolation
  - `resetInstance()` creates fresh singleton for test isolation

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

- **StepExecutor**: Interface for executing nested steps within actions
  - Method: `executeSteps(steps, variableOverrides)` executes array of steps sequentially
  - Provided by playbook engine to actions that extend PlaybookActionWithSteps
  - Enforces execution rules (error policies, state persistence, resume tracking)
  - Variable overrides inject scoped variables (e.g., loop vars) without mutating parent context

- **PlaybookActionWithSteps**: Abstract base class for actions with nested step execution
  - Extends PlaybookAction interface
  - Constructor receives StepExecutor for nested step execution
  - Actions extend this instead of implementing PlaybookAction directly
  - Used by control flow actions: if, for-each, and future actions like parallel, retry

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

- **ACTION_CATALOG**: Internal catalog of action metadata (not exported, accessed via PlaybookProvider)
  - Key: Action type from `actionType` static property (kebab-case, e.g., 'github-issue-create', 'bash', 'http-get')
  - Value: ActionMetadata object with actionType, dependencies, primaryProperty, and configSchema
  - Generated at build time by scanning action files and extracting static properties
  - Internal to PlaybookProvider - accessed via `getActionInfo()` and `getActionTypes()`
  - Used by playbook-yaml for transformation and schema generation (via PlaybookProvider)

- **ActionMetadata**: Complete metadata for a playbook action
  - `actionType`: Explicit action type identifier from class static property
  - `className`: TypeScript class name for runtime instantiation
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

- **PlaybookLoader**: Interface for loading playbooks from various sources
  - Methods: name, supports(), load()
  - Implementations register at runtime via PlaybookProvider
  - Enables extensibility for multiple playbook sources (YAML, TypeScript, remote, custom)

- **PlaybookProvider**: Unified singleton class managing both playbooks AND actions
  - Singleton pattern: `getInstance()` for shared instance, `resetInstance()` for test isolation
  - Playbook methods: `loadPlaybook()`, `registerLoader()`, `clearPlaybookCache()`
  - Action methods: `createAction()`, `getActionInfo()`, `getActionTypes()`, `registerAction()`
  - Testing methods: `clearAll()`, `resetInstance()`
  - Initializes actions from generated `action-catalog.ts` on first access
  - Caches loaded playbooks internally to avoid redundant loader lookups
  - Supports dependency injection for testing via `registerAction()`

**Entities from other features:**

- **CatalystError** (error-handling): Base error class with code and guidance
- **ErrorPolicy** (error-handling): Error handling configuration (Continue, Stop, Retry)
- **ErrorAction** (error-handling): Shortcut string for common policies

## Dependencies

**Internal:**
- **error-handling** (Tier 1.1): Provides CatalystError and ErrorPolicy

**External:**
- **Node.js >= 18**: File system operations for state persistence
